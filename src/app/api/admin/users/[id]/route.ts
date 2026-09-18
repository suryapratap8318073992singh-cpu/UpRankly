import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, audits, payments, projects, seoTasks, subscriptions, users } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { id } = await params;

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return fail(404, "NOT_FOUND", "User not found.");

  const projectRows = await db.select().from(projects).where(eq(projects.userId, id));
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, id))
    .orderBy(desc(subscriptions.createdAt));
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, id))
    .orderBy(desc(payments.submittedAt));
  const auditRows = await db
    .select()
    .from(audits)
    .where(eq(audits.userId, id))
    .orderBy(desc(audits.createdAt))
    .limit(20);
  const logs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(100);

  const tasksByProject: Record<string, (typeof seoTasks.$inferSelect)[]> = {};
  for (const p of projectRows) {
    tasksByProject[p.id] = await db
      .select()
      .from(seoTasks)
      .where(eq(seoTasks.projectId, p.id))
      .orderBy(desc(seoTasks.createdAt))
      .limit(50);
  }

  return ok({
    user,
    projects: projectRows,
    subscriptions: subs,
    payments: paymentRows,
    audits: auditRows,
    tasksByProject,
    activity: logs,
  });
}
