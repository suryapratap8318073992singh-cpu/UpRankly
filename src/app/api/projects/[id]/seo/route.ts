import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audits, projects, rankTracking, seoDataVersions, seoMeta, seoTasks } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Full SEO workspace data for an owned project. */
export async function GET(_req: Request, { params }: Params) {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.userId !== user.id) return fail(404, "NOT_FOUND", "Project not found.");

  const auditRows = await db
    .select()
    .from(audits)
    .where(eq(audits.projectId, id))
    .orderBy(desc(audits.createdAt))
    .limit(10);

  const tasks = await db.select().from(seoTasks).where(eq(seoTasks.projectId, id)).orderBy(seoTasks.createdAt);
  const [meta] = await db.select().from(seoMeta).where(eq(seoMeta.projectId, id)).limit(1);
  const versions = await db
    .select()
    .from(seoDataVersions)
    .where(eq(seoDataVersions.projectId, id))
    .orderBy(desc(seoDataVersions.createdAt))
    .limit(30);
  const ranks = await db
    .select()
    .from(rankTracking)
    .where(eq(rankTracking.projectId, id))
    .orderBy(desc(rankTracking.measuredAt))
    .limit(100);

  return ok({
    audits: auditRows,
    tasks,
    seoMeta: meta ?? null,
    versions,
    rankTracking: {
      connected: false,
      note: "Rank tracking is not connected yet. Connect a legitimate data source (e.g. Google Search Console) to record real positions — no estimates or fake data will ever be shown.",
      rows: ranks,
    },
  });
}
