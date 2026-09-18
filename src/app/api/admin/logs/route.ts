import { desc, eq, sql, and } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");

  const url = new URL(req.url);
  const action = url.searchParams.get("action")?.trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));

  const rows = await db
    .select()
    .from(activityLogs)
    .where(action ? eq(activityLogs.action, action) : sql`true`)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  const distinctActions = await db
    .selectDistinct({ action: activityLogs.action })
    .from(activityLogs)
    .orderBy(activityLogs.action)
    .limit(100);

  return ok({ logs: rows, actions: distinctActions.map((a) => a.action) });
}
