import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, projects, subscriptions, users } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";

/** Admin dashboard metrics — revenue computed ONLY from approved payments. */
export async function GET() {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 86400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [userCount] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  const [projectCount] = await db.select({ n: sql<number>`count(*)::int` }).from(projects);
  const [pendingPayments] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.status, "pending"));
  const [activeSubs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  const [expiredSubs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "expired"));
  const [cancelledSubs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "cancelled"));
  const [expiringSoon] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.expiryDate),
        lt(subscriptions.expiryDate, in7days),
        gte(subscriptions.expiryDate, now),
      ),
    );
  const [totalRevenue] = await db
    .select({ n: sql<number>`coalesce(sum(amount_inr),0)::int` })
    .from(payments)
    .where(eq(payments.status, "approved"));
  const [monthRevenue] = await db
    .select({ n: sql<number>`coalesce(sum(amount_inr),0)::int` })
    .from(payments)
    .where(and(eq(payments.status, "approved"), gte(payments.reviewedAt, monthStart)));

  return ok({
    totalUsers: userCount?.n ?? 0,
    totalProjects: projectCount?.n ?? 0,
    pendingPayments: pendingPayments?.n ?? 0,
    activeSubscriptions: activeSubs?.n ?? 0,
    expiringSoon: expiringSoon?.n ?? 0,
    expired: expiredSubs?.n ?? 0,
    cancelled: cancelledSubs?.n ?? 0,
    totalRevenueInr: totalRevenue?.n ?? 0,
    thisMonthRevenueInr: monthRevenue?.n ?? 0,
  });
}
