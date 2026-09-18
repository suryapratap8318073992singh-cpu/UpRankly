import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { logActivity, notify } from "@/lib/settings";

const schema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { paymentId, reason } = parsed.data;

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return fail(404, "NOT_FOUND", "Payment not found.");
  if (payment.status !== "pending") return fail(409, "ALREADY_REVIEWED", "This payment has already been reviewed.");

  const now = new Date();
  const [updatedPayment] = await db
    .update(payments)
    .set({ status: "rejected", reviewedAt: now, reviewedBy: admin.id, rejectionReason: reason ?? null })
    .where(eq(payments.id, paymentId))
    .returning();

  if (payment.subscriptionId) {
    await db
      .update(subscriptions)
      .set({ status: "rejected", updatedAt: now })
      .where(eq(subscriptions.id, payment.subscriptionId));
  }

  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    userId: payment.userId,
    projectId: payment.projectId,
    action: "payment_rejected",
    details: { paymentId, amountInr: payment.amountInr, reason },
    ip,
    userAgent,
  });
  await notify({
    audience: "user",
    userId: payment.userId,
    projectId: payment.projectId,
    type: "payment_rejected",
    title: "Payment could not be verified",
    body: reason ? `Reason: ${reason}` : "Your payment reference could not be verified. Please resubmit or contact support.",
  });

  return ok({ payment: updatedPayment });
}
