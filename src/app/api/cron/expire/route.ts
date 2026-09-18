import { and, eq, lt, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { logActivity, notify } from "@/lib/settings";

/**
 * GET /api/cron/expire — scheduled cleanup (Vercel Cron / GitHub Actions).
 * Protected by CRON_SECRET. Note: expiry enforcement never depends on this
 * job — every protected operation validates expiry independently.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return fail(401, "UNAUTHORIZED", "Invalid cron secret.");
  }

  const now = new Date();
  const expired = await db
    .update(subscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.expiryDate),
        lt(subscriptions.expiryDate, now),
      ),
    )
    .returning();

  for (const sub of expired) {
    await logActivity({
      actorType: "system",
      userId: sub.userId,
      projectId: sub.projectId,
      action: "subscription_expired",
      details: { subscriptionId: sub.id, plan: sub.plan },
    });
    await notify({
      audience: "user",
      userId: sub.userId,
      projectId: sub.projectId,
      type: "subscription_expired",
      title: "Subscription expired",
      body: "Your UpRankly subscription has expired. Renew to keep your SEO integration active.",
    });
    await notify({
      audience: "admin",
      userId: sub.userId,
      projectId: sub.projectId,
      type: "subscription_expired",
      title: "A subscription expired",
      body: `Subscription ${sub.id} (${sub.plan}) has been marked expired.`,
    });
  }

  return ok({ expired: expired.length });
}
