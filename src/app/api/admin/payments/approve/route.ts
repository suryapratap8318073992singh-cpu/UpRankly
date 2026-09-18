import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { admins, payments, projects, subscriptions } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { computeExpiry, PLAN_LABEL } from "@/lib/subscription";
import { logActivity, notify } from "@/lib/settings";

const schema = z.object({ paymentId: z.string().uuid() });

/** Approve manual payment → activate subscription with calendar-based expiry. */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { paymentId } = parsed.data;

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return fail(404, "NOT_FOUND", "Payment not found.");
  if (payment.status !== "pending") return fail(409, "ALREADY_REVIEWED", "This payment has already been reviewed.");

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, payment.subscriptionId ?? ""))
    .limit(1);
  if (!subscription) return fail(404, "NOT_FOUND", "Linked subscription not found.");

  const now = new Date();
  const expiry = computeExpiry(subscription.plan, now);

  // Supersede any other active subscription on this project.
  await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelledAt: now, cancelledBy: "superseded_by_new_plan", updatedAt: now })
    .where(
      and(
        eq(subscriptions.projectId, subscription.projectId),
        eq(subscriptions.status, "active"),
        ne(subscriptions.id, subscription.id),
      ),
    );

  const [updatedSub] = await db
    .update(subscriptions)
    .set({
      status: "active",
      startDate: now,
      expiryDate: expiry, // null for lifetime
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning();

  const [updatedPayment] = await db
    .update(payments)
    .set({ status: "approved", reviewedAt: now, reviewedBy: admin.id })
    .where(eq(payments.id, paymentId))
    .returning();

  const [project] = await db.select().from(projects).where(eq(projects.id, payment.projectId)).limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    userId: payment.userId,
    projectId: payment.projectId,
    action: "payment_approved",
    details: { paymentId, amountInr: payment.amountInr, plan: payment.plan, expiryDate: expiry },
    ip,
    userAgent,
  });
  await logActivity({
    actorType: "system",
    actorId: admin.id,
    userId: payment.userId,
    projectId: payment.projectId,
    action: "subscription_activated",
    details: { subscriptionId: subscription.id, plan: subscription.plan, expiryDate: expiry },
  });
  await notify({
    audience: "user",
    userId: payment.userId,
    projectId: payment.projectId,
    type: "payment_approved",
    title: "Payment approved — subscription active",
    body: `${PLAN_LABEL[payment.plan]} plan is now active${expiry ? ` until ${expiry.toDateString()}` : " (lifetime)"} for ${project?.businessName ?? "your project"}.`,
  });

  return ok({ payment: updatedPayment, subscription: updatedSub, reviewer: (admin as typeof admins.$inferSelect).email });
}
