import "server-only";
import * as cheerio from "cheerio";
import { safeFetchHtml, safeFetchText } from "@/lib/url";

/**
 * UpRankly Audit Engine.
 * Only measures what can actually be measured from a real HTTP fetch of the
 * page's HTML. No fake traffic, rankings, backlinks or "authority" metrics.
 * The score is the "UpRankly SEO Health Score" — it is NOT an official Google score.
 */

export type CheckStatus = "pass" | "warn" | "fail";
export type AuditCheck = {
  id: string;
  label: string;
  category: "technical" | "onpage" | "content" | "structured" | "mobile";
  status: CheckStatus;
  weight: number;
  detail: string;
};

export type AuditSignals = {
  finalUrl: string;
  https: boolean;
  status: number;
  responseMs: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  robotsMeta: string | null;
  viewport: string | null;
  lang: string | null;
  h1: string[];
  h2: string[];
  h3Count: number;
  jsonLdTypes: string[];
  og: { title: string | null; description: string | null; image: string | null };
  twitterCard: string | null;
  images: { total: number; missingAlt: number };
  links: { internal: number; external: number };
  wordCount: number;
  topTerms: { term: string; count: number }[];
  hasRobotsTxt: boolean | null;
  hasSitemap: boolean | null;
  favicon: boolean;
  charset: string | null;
};

export type AuditResult = {
  checks: AuditCheck[];
  score: number;
  categoryScores: Record<string, number>;
  signals: AuditSignals;
};

const STOPWORDS = new Set(
  ("the,a,an,and,or,but,if,then,else,when,at,from,by,for,with,about,into,through,during,before,after,above,below,to,of,in,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,them,his,her,its,our,your,their,this,that,these,those,am,us,my,me,as,up,out,also,get,got,like,make,made,one,two,new,use,used,using,may,might,must,shall,let,say,said,see,way,who,whom,how,what,which,why,because,until,while,where".split(",")),
);

export function extractTopTerms(text: string, limit = 12) {
  const counts = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

export async function runAudit(url: URL): Promise<AuditResult> {
  const page = await safeFetchHtml(url);
  const $ = cheerio.load(page.html);

  /* ------------------------------ Signals ---------------------------- */
  const title = $("head title").first().text().trim() || null;
  const metaDescription =
    $('head meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('head link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta = $('head meta[name="robots"]').attr("content")?.trim() || null;
  const viewport = $('head meta[name="viewport"]').attr("content")?.trim() || null;
  const lang = $("html").attr("lang")?.trim() || null;
  const charset =
    $("head meta[charset]").attr("charset")?.trim() ||
    $('head meta[http-equiv="Content-Type"]').attr("content")?.trim() ||
    null;

  const h1 = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2 = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h3Count = $("h3").length;

  const jsonLdTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const t = item?.["@type"];
        if (Array.isArray(t)) jsonLdTypes.push(...t.map(String));
        else if (t) jsonLdTypes.push(String(t));
        if (item?.["@graph"] && Array.isArray(item["@graph"])) {
          for (const g of item["@graph"]) if (g?.["@type"]) jsonLdTypes.push(String(g["@type"]));
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });

  const og = {
    title: $('head meta[property="og:title"]').attr("content")?.trim() || null,
    description: $('head meta[property="og:description"]').attr("content")?.trim() || null,
    image: $('head meta[property="og:image"]').attr("content")?.trim() || null,
  };
  const twitterCard = $('head meta[name="twitter:card"]').attr("content")?.trim() || null;

  const imgs = $("img").toArray();
  const missingAlt = imgs.filter(
    (el) => !($(el).attr("alt") ?? "").trim() && $(el).attr("role") !== "presentation",
  ).length;

  const origin = new URL(page.finalUrl).hostname.replace(/^www\./, "");
  let internal = 0;
  let external = 0;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    try {
      const u = new URL(href, page.finalUrl);
      if (u.hostname.replace(/^www\./, "") === origin) internal++;
      else external++;
    } catch {
      /* ignore */
    }
  });

  const bodyText = $("body").clone().find("script,style,noscript").remove().end().text();
  const words = bodyText.split(/\s+/).filter((w) => w.length > 1);
  const wordCount = words.length;
  const topTerms = extractTopTerms(bodyText);

  const favicon =
    $('head link[rel~="icon"]').length > 0 || $('head link[rel="shortcut icon"]').length > 0;

  // Same-origin extras (best-effort, safe).
  const base = new URL(page.finalUrl).origin;
  const [robotsTxt, sitemap] = await Promise.all([
    safeFetchText(`${base}/robots.txt`),
    safeFetchText(`${base}/sitemap.xml`),
  ]);
  const hasRobotsTxt = robotsTxt !== null ? robotsTxt.length > 0 : null;
  const hasSitemap = sitemap !== null ? sitemap.toLowerCase().includes("<urlset") || sitemap.toLowerCase().includes("<sitemapindex") : null;

  const https = new URL(page.finalUrl).protocol === "https:";

  const signals: AuditSignals = {
    finalUrl: page.finalUrl,
    https,
    status: page.status,
    responseMs: page.responseMs,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonical,
    robotsMeta,
    viewport,
    lang,
    h1,
    h2: h2.slice(0, 12),
    h3Count,
    jsonLdTypes: [...new Set(jsonLdTypes)],
    og,
    twitterCard,
    images: { total: imgs.length, missingAlt },
    links: { internal, external },
    wordCount,
    topTerms,
    hasRobotsTxt,
    hasSitemap,
    favicon,
    charset,
  };

  /* ------------------------------ Checks ------------------------------ */
  const checks: AuditCheck[] = [];
  const add = (
    id: string,
    label: string,
    category: AuditCheck["category"],
    status: CheckStatus,
    weight: number,
    detail: string,
  ) => checks.push({ id, label, category, status, weight, detail });

  add(
    "https",
    "HTTPS enabled",
    "technical",
    https ? "pass" : "fail",
    8,
    https ? "The page is served over HTTPS." : "The page is served over plain HTTP — browsers and search engines prefer secure pages.",
  );

  add(
    "robots-txt",
    "robots.txt available",
    "technical",
    hasRobotsTxt === null ? "warn" : hasRobotsTxt ? "pass" : "fail",
    4,
    hasRobotsTxt === null
      ? "Could not check robots.txt (request failed)."
      : hasRobotsTxt
        ? "robots.txt is present."
        : "robots.txt was not found.",
  );

  add(
    "sitemap",
    "XML sitemap detected",
    "technical",
    hasSitemap === null ? "warn" : hasSitemap ? "pass" : "fail",
    6,
    hasSitemap === null
      ? "Could not check /sitemap.xml."
      : hasSitemap
        ? "A sitemap index or URL set was detected at /sitemap.xml."
        : "No XML sitemap detected at /sitemap.xml.",
  );

  add(
    "canonical",
    "Canonical link",
    "technical",
    canonical ? "pass" : "warn",
    4,
    canonical ? `Canonical: ${canonical.slice(0, 80)}` : "No canonical link tag found on this page.",
  );

  const noindex = robotsMeta ? /noindex/i.test(robotsMeta) : false;
  add(
    "indexability",
    "Indexable page",
    "technical",
    noindex ? "fail" : "pass",
    6,
    noindex
      ? `meta robots contains "noindex" — this page asks search engines not to index it.`
      : "No noindex directive detected.",
  );

  add(
    "response-time",
    "Initial response time",
    "technical",
    page.responseMs < 1200 ? "pass" : page.responseMs < 3000 ? "warn" : "fail",
    2,
    `Server responded in ${page.responseMs}ms (measured from UpRankly's audit server).`,
  );

  if (!title) {
    add("title", "Page title", "onpage", "fail", 10, "No <title> tag found.");
  } else {
    const len = title.length;
    const status: CheckStatus = len >= 30 && len <= 65 ? "pass" : len < 15 || len > 75 ? "fail" : "warn";
    add("title", "Page title", "onpage", status, 10, `"${title.slice(0, 90)}" (${len} characters — aim for ~30–65).`);
  }

  if (!metaDescription) {
    add("meta-description", "Meta description", "onpage", "fail", 10, "No meta description found.");
  } else {
    const len = metaDescription.length;
    const status: CheckStatus = len >= 70 && len <= 170 ? "pass" : len < 40 || len > 200 ? "warn" : "warn";
    add("meta-description", "Meta description", "onpage", status, 10, `${len} characters — aim for roughly 70–170.`);
  }

  add(
    "h1",
    "H1 heading",
    "onpage",
    h1.length === 1 ? "pass" : h1.length === 0 ? "fail" : "warn",
    6,
    h1.length === 1
      ? `H1: "${h1[0].slice(0, 80)}"`
      : h1.length === 0
        ? "No H1 heading found on the page."
        : `${h1.length} H1 headings found — best practice is one clear H1.`,
  );

  add(
    "heading-structure",
    "Heading structure",
    "onpage",
    h2.length > 0 ? "pass" : "warn",
    2,
    h2.length > 0 ? `${h2.length} H2 headings found.` : "No H2 subheadings found.",
  );

  add("lang", "Language attribute", "onpage", lang ? "pass" : "warn", 2, lang ? `html lang="${lang}"` : "No lang attribute on <html>.");

  add(
    "content-length",
    "Content depth",
    "content",
    wordCount >= 600 ? "pass" : wordCount >= 300 ? "warn" : "fail",
    10,
    `Approximately ${wordCount} words of visible text detected on this page.`,
  );

  const altRatio = imgs.length === 0 ? 1 : (imgs.length - missingAlt) / imgs.length;
  add(
    "image-alt",
    "Image alt text",
    "content",
    altRatio >= 0.9 ? "pass" : altRatio >= 0.6 ? "warn" : "fail",
    6,
    imgs.length === 0
      ? "No images found on this page."
      : `${imgs.length - missingAlt}/${imgs.length} images have alt text.`,
  );

  add(
    "internal-links",
    "Internal linking",
    "content",
    internal >= 5 ? "pass" : internal >= 1 ? "warn" : "fail",
    4,
    `${internal} internal links and ${external} external links found.`,
  );

  add(
    "structured-data",
    "Structured data (JSON-LD)",
    "structured",
    jsonLdTypes.length > 0 ? "pass" : "fail",
    6,
    jsonLdTypes.length > 0
      ? `Detected schema types: ${[...new Set(jsonLdTypes)].slice(0, 6).join(", ")}.`
      : "No JSON-LD structured data found.",
  );

  const ogOk = !!(og.title && og.description);
  add(
    "open-graph",
    "Open Graph tags",
    "structured",
    ogOk ? (og.image ? "pass" : "warn") : "fail",
    4,
    ogOk ? "og:title and og:description present." : "Open Graph tags are missing or incomplete.",
  );

  add(
    "twitter-card",
    "Twitter/X card",
    "structured",
    twitterCard ? "pass" : "warn",
    2,
    twitterCard ? `twitter:card = ${twitterCard}` : "No Twitter card meta tag found.",
  );

  add(
    "viewport",
    "Mobile viewport",
    "mobile",
    viewport ? "pass" : "fail",
    8,
    viewport ? "A responsive viewport meta tag is set." : "No viewport meta tag — the page may not render well on mobile devices.",
  );

  /* ------------------------------- Score ------------------------------ */
  let score = 0;
  const catTotals: Record<string, number> = {};
  const catEarned: Record<string, number> = {};
  for (const c of checks) {
    const earned = c.status === "pass" ? c.weight : c.status === "warn" ? c.weight / 2 : 0;
    score += earned;
    catTotals[c.category] = (catTotals[c.category] ?? 0) + c.weight;
    catEarned[c.category] = (catEarned[c.category] ?? 0) + earned;
  }
  const categoryScores: Record<string, number> = {};
  for (const [cat, total] of Object.entries(catTotals)) {
    categoryScores[cat] = total > 0 ? Math.round(((catEarned[cat] ?? 0) / total) * 100) : 0;
  }

  return { checks, score: Math.round(score), categoryScores, signals };
}

/* ------------------------- Competitor signals -------------------------- */

export type CompetitorSignals = {
  url: string;
  ok: boolean;
  error?: string;
  title?: string | null;
  h1?: string[];
  h2?: string[];
  jsonLdTypes?: string[];
  wordCount?: number;
  topTerms?: { term: string; count: number }[];
};

/** Extracts only publicly visible facts (titles, headings, topics, schema). */
export async function fetchCompetitorSignals(url: URL): Promise<CompetitorSignals> {
  try {
    const page = await safeFetchHtml(url, 8000);
    const $ = cheerio.load(page.html);
    const bodyText = $("body").clone().find("script,style,noscript").remove().end().text();
    const jsonLdTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).contents().text());
        for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
          if (item?.["@type"]) jsonLdTypes.push(String(item["@type"]));
        }
      } catch { /* ignore */ }
    });
    return {
      url: url.toString(),
      ok: true,
      title: $("head title").first().text().trim() || null,
      h1: $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 5),
      h2: $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 8),
      jsonLdTypes: [...new Set(jsonLdTypes)],
      wordCount: bodyText.split(/\s+/).filter((w) => w.length > 1).length,
      topTerms: extractTopTerms(bodyText, 10),
    };
  } catch (err) {
    return {
      url: url.toString(),
      ok: false,
      error: err instanceof Error ? err.message : "Could not analyze this competitor.",
    };
  }
}