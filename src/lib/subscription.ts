import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";

export const PLANS = ["monthly", "six_month", "yearly", "lifetime"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_LABEL: Record<Plan, string> = {
  monthly: "Monthly",
  six_month: "6 Months",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

export const PLAN_DURATION_MONTHS: Partial<Record<Plan, number>> = {
  monthly: 1,
  six_month: 6,
  yearly: 12,
};

/** Calendar-aware month addition (clamps to last day of the target month). */
export function addCalendarMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // overflowed → clamp to end of previous month
  return d;
}

/** Compute expiry from a start date. Lifetime subscriptions never expire. */
export function computeExpiry(plan: Plan, start: Date): Date | null {
  if (plan === "lifetime") return null;
  const months = PLAN_DURATION_MONTHS[plan] ?? 1;
  return addCalendarMonths(start, months);
}

export type Subscription = typeof subscriptions.$inferSelect;

/** Server-side source of truth — the client countdown is purely visual. */
export function isSubscriptionActive(
  sub: Pick<Subscription, "status" | "expiryDate">,
  now: Date = new Date(),
): boolean {
  if (sub.status !== "active") return false;
  if (sub.expiryDate === null) return true; // lifetime
  return sub.expiryDate.getTime() > now.getTime();
}

/**
 * Returns the latest subscription for a project, lazily marking expired
 * subscriptions in the database when their expiry has passed.
 */
export async function getProjectSubscription(
  projectId: string,
): Promise<Subscription | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.projectId, projectId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (!sub) return null;
  if (
    sub.status === "active" &&
    sub.expiryDate !== null &&
    sub.expiryDate.getTime() <= Date.now()
  ) {
    const [updated] = await db
      .update(subscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id))
      .returning();
    return updated ?? { ...sub, status: "expired" };
  }
  return sub;
}

export function msUntilExpiry(sub: Subscription): number | null {
  if (sub.expiryDate === null) return null;
  return sub.expiryDate.getTime() - Date.now();
}

export const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
