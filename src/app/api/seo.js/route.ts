import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, seoMeta } from "@/db/schema";
import { getProjectSubscription, isSubscriptionActive } from "@/lib/subscription";
import { normalizeDomain } from "@/lib/url";
import { logActivity } from "@/lib/settings";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsResponse(code: string, status = 200) {
  return new Response(code, {
    status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

const disabledScript = (reason: string) =>
  `/* UpRankly integration — inactive: ${reason.replace(/\*\//g, "")} */\n(function(){try{if(window.console&&console.info){console.info(${JSON.stringify(
    `UpRankly: SEO integration is inactive (${reason})`,
  )});}}catch(e){}})();`;

/**
 * GET /api/seo.js?project=<uuid>
 * Serves the one-line integration script. It only applies SEO metadata that
 * was explicitly approved, and only while the subscription is active
 * (lifetime = no expiry). Pending / cancelled / expired / rejected = no-op.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project") ?? "";
  if (!UUID_RE.test(projectId)) {
    return jsResponse(disabledScript("invalid project id"));
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return jsResponse(disabledScript("project not found"));

  // Origin check (defense in depth — never the only control).
  const referer = req.headers.get("referer") ?? req.headers.get("origin");
  const refererDomain = referer ? normalizeDomain(referer) : null;
  const domainMismatch = refererDomain !== null && refererDomain !== project.allowedDomain;

  // Track usage (best-effort)
  try {
    await db
      .update(projects)
      .set({
        scriptHitCount: sql`${projects.scriptHitCount} + 1`,
        scriptLastHitAt: new Date(),
        scriptLastOrigin: refererDomain,
      })
      .where(eq(projects.id, projectId));
  } catch { /* non-fatal */ }

  await logActivity({
    actorType: "system",
    projectId,
    action: "seo_script_requested",
    details: { refererDomain },
  });

  const sub = await getProjectSubscription(projectId);
  const active = sub ? isSubscriptionActive(sub) : false;

  if (domainMismatch) return jsResponse(disabledScript("domain not verified"));
  if (!active) {
    const reason = !sub
      ? "no subscription"
      : sub.status === "active"
        ? "subscription expired"
        : `subscription ${sub.status}`;
    return jsResponse(disabledScript(reason));
  }

  const [meta] = await db.select().from(seoMeta).where(eq(seoMeta.projectId, projectId)).limit(1);
  if (!meta || !meta.enabled) {
    return jsResponse(disabledScript("no approved SEO data"));
  }

  const config = {
    title: meta.title ?? null,
    description: meta.description ?? null,
    jsonLd: meta.jsonLd ?? null,
  };

  const code = `/* UpRankly integration — project ${project.id}. Applies owner-approved SEO metadata at runtime.
   Note: runtime tags assist presentation; primary SEO should live in server-rendered HTML. */
(function(){
  "use strict";
  var c = ${JSON.stringify(config)};
  function ready(fn){ if(document.readyState!=="loading"){fn();} else {document.addEventListener("DOMContentLoaded",fn);} }
  function setMeta(attr,key,content){
    if(!content) return;
    var el=document.head.querySelector("meta["+attr+"=\\""+key+"\\"]");
    if(!el){ el=document.createElement("meta"); el.setAttribute(attr,key); document.head.appendChild(el); }
    el.setAttribute("content",content);
  }
  ready(function(){
    try{
      if(c.title){ document.title=c.title; setMeta("property","og:title",c.title); setMeta("name","twitter:title",c.title); }
      if(c.description){ setMeta("name","description",c.description); setMeta("property","og:description",c.description); setMeta("name","twitter:description",c.description); }
      if(c.jsonLd){
        var s=document.createElement("script"); s.type="application/ld+json"; s.setAttribute("data-uprankly","jsonld");
        s.textContent=JSON.stringify(c.jsonLd); document.head.appendChild(s);
      }
      if(window.console&&console.info){ console.info("UpRankly: approved SEO metadata applied."); }
    }catch(e){ /* never break the host page */ }
  });
})();`;

  return jsResponse(code);
}
