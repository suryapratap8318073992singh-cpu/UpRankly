import { desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, subscriptions, users } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const rows = await db
    .select()
    .from(users)
    .where(q ? or(ilike(users.email, `%${q}%`), ilike(users.fullName, `%${q}%`)) : sql`true`)
    .orderBy(desc(users.createdAt))
    .limit(200);

  const enriched = await Promise.all(
    rows.map(async (u) => {
      const projectRows = await db.select().from(projects).where(sql`${projects.userId} = ${u.id}`);
      const subs = await db
        .select()
        .from(subscriptions)
        .where(sql`${subscriptions.userId} = ${u.id}`)
        .orderBy(desc(subscriptions.createdAt))
        .limit(10);
      return { user: u, projects: projectRows, subscriptions: subs };
    }),
  );

  return ok({ users: enriched });
}
