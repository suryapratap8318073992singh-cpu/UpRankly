import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, seoTasks, rateLimits, activityLogs } from "@/db/schema";
import { getUserOrNull, getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { discoverProjectPages, analyzeProjectPages, findLinkOpportunities } from "@/lib/internalLinks";

const DAILY_LIMIT = 2;

function todayKey(projectId: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `internal-links:${projectId}:${today}`;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  // ---- Auth: owner or admin ----
  const user = await getUserOrNull();
  const admin = await getAdminOrNull();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const isOwner = user && project.userId === user.id;
  const isAdmin = isSuperAdmin(admin);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // ---- Rate limit: max 2 scans/day per project ----
  const key = todayKey(projectId);
  const [existing] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  if (existing) {
    if (existing.count >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Daily limit reached (${DAILY_LIMIT} scans/day). Try again tomorrow.` },
        { status: 429 },
      );
    }
    await db.update(rateLimits).set({ count: existing.count + 1 }).where(eq(rateLimits.key, key));
  } else {
    await db.insert(rateLimits).values({ key, count: 1, windowStart: new Date() });
  }

  // ---- Run the scan ----
  try {
    const pageUrls = await discoverProjectPages(project.websiteUrl);
    if (pageUrls.length < 2) {
      return NextResponse.json(
        { error: "Could not discover enough pages on this site to compare (need at least 2)." },
        { status: 422 },
      );
    }

    const analyzed = await analyzeProjectPages(pageUrls);
    const opportunities = findLinkOpportunities(analyzed);

    // Replace previous *suggested* (not-yet-actioned) internal-link tasks,
    // but keep ones the user already approved/completed.
    await db
      .delete(seoTasks)
      .where(
        and(
          eq(seoTasks.projectId, projectId),
          eq(seoTasks.type, "internal_link"),
          eq(seoTasks.status, "suggested"),
        ),
      );

    if (opportunities.length > 0) {
      await db.insert(seoTasks).values(
        opportunities.map((o) => ({
          projectId,
          type: "internal_link",
          title: `Link "${o.anchorText}" to another page`,
          description: `On ${o.sourceUrl}, the phrase "${o.anchorText}" could link to ${o.targetUrl}.`,
          why: `This page mentions a topic that another page on your site covers in depth. Linking them helps Google understand your site's structure and passes authority between related pages.`,
          priority: "low" as const,
          difficulty: "easy" as const,
          status: "suggested" as const,
          source: "system" as const,
          payload: {
            sourceUrl: o.sourceUrl,
            targetUrl: o.targetUrl,
            anchorText: o.anchorText,
            snippet: o.snippet,
          },
        })),
      );
    }

    await db.insert(activityLogs).values({
      actorType: isAdmin ? "admin" : "user",
      actorId: isAdmin ? admin!.id : user!.id,
      userId: project.userId,
      projectId,
      action: "internal_links_scanned",
      details: { pagesScanned: analyzed.length, opportunitiesFound: opportunities.length },
    });

    return NextResponse.json({
      ok: true,
      pagesScanned: analyzed.length,
      opportunitiesFound: opportunities.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  }
}