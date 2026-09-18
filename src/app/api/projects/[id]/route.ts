import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audits, payments, projects, seoMeta, seoTasks } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";
import { getProjectSubscription, isSubscriptionActive } from "@/lib/subscription";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.userId !== user.id) return fail(404, "NOT_FOUND", "Project not found.");

  const [latestAudit] = await db
    .select()
    .from(audits)
    .where(eq(audits.projectId, id))
    .orderBy(desc(audits.createdAt))
    .limit(1);

  const tasks = await db
    .select()
    .from(seoTasks)
    .where(eq(seoTasks.projectId, id))
    .orderBy(seoTasks.createdAt);

  const [meta] = await db.select().from(seoMeta).where(eq(seoMeta.projectId, id)).limit(1);
  const subscription = await getProjectSubscription(id);

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.projectId, id))
    .orderBy(desc(payments.submittedAt));

  return ok({
    project,
    latestAudit: latestAudit ?? null,
    tasks,
    seoMeta: meta ?? null,
    subscription,
    subscriptionActive: subscription ? isSubscriptionActive(subscription) : false,
    payments: paymentRows,
  });
}
