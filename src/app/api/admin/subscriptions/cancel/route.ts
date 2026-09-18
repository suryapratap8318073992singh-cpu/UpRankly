import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { logActivity, notify } from "@/lib/settings";

const schema = z.object({
  subscriptionId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().nullable(),
});

/** Cancel immediately — protected SEO automation stops at once. */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { subscriptionId, reason } = parsed.data;

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) return fail(404, "NOT_FOUND", "Subscription not found.");
  if (sub.status === "cancelled") return fail(409, "ALREADY_CANCELLED", "This subscription is already cancelled.");

  const now = new Date();
  const [updated] = await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelledAt: now, cancelledBy: admin.email, updatedAt: now })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    userId: sub.userId,
    projectId: sub.projectId,
    action: "subscription_cancelled",
    details: { subscriptionId, plan: sub.plan, cancelledAt: now, reason },
    ip,
    userAgent,
  });
  await notify({
    audience: "user",
    userId: sub.userId,
    projectId: sub.projectId,
    type: "subscription_cancelled",
    title: "Subscription cancelled",
    body: `Your ${sub.plan} subscription was cancelled. SEO integration has been deactivated.`,
  });

  return ok({ subscription: updated });
}
