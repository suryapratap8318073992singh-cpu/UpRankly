import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, projects, subscriptions } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { getPricing } from "@/lib/settings";
import { logActivity, notify } from "@/lib/settings";
import { PLANS, PLAN_LABEL } from "@/lib/subscription";

const schema = z.object({
  projectId: z.string().uuid(),
  plan: z.enum(PLANS),
  reference: z.string().trim().min(4, "Enter your UPI transaction reference / UTR.").max(80),
  method: z.enum(["upi", "manual"]).default("upi"),
});

/**
 * Manual / UPI payment workflow (honest by design — not an automated gateway).
 * User pays externally → submits reference → status stays "pending" until an
 * admin approves. The amount charged (price at purchase time) is stored.
 */
export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");
  const { ip, userAgent } = getClientInfo(req);

  const rl = await rateLimit(`payment:${user.id}`, 20, 3600);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Too many payment submissions. Try again later.");

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { projectId, plan, reference, method } = parsed.data;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.userId !== user.id) return fail(404, "NOT_FOUND", "Project not found.");

  const pricing = await getPricing();
  const amount = pricing[plan];
  if (amount === null || amount === undefined) {
    return fail(409, "PRICE_NOT_CONFIGURED", "This plan is not priced yet. Please contact us for pricing.");
  }

  // One pending payment per project at a time.
  const [pending] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.projectId, projectId), eq(payments.status, "pending")))
    .orderBy(desc(payments.submittedAt))
    .limit(1);
  if (pending) {
    return fail(409, "PAYMENT_PENDING", "A payment for this project is already awaiting verification.");
  }

  const [subscription] = await db
    .insert(subscriptions)
    .values({ projectId, userId: user.id, plan, status: "pending", amountInr: amount })
    .returning();

  const [payment] = await db
    .insert(payments)
    .values({
      userId: user.id,
      projectId,
      subscriptionId: subscription.id,
      plan,
      amountInr: amount,
      method,
      reference,
      status: "pending",
    })
    .returning();

  await logActivity({
    actorType: "user",
    actorId: user.id,
    userId: user.id,
    projectId,
    action: "payment_submitted",
    details: { plan, amountInr: amount, method, reference },
    ip,
    userAgent,
  });
  await notify({
    audience: "admin",
    userId: user.id,
    projectId,
    type: "payment_pending",
    title: "New payment pending verification",
    body: `${project.businessName} — ${PLAN_LABEL[plan]} — ₹${amount} (ref ${reference})`,
  });
  await notify({
    audience: "user",
    userId: user.id,
    projectId,
    type: "payment_submitted",
    title: "Payment submitted for verification",
    body: `Your ${PLAN_LABEL[plan]} payment (₹${amount}) is pending admin verification.`,
  });

  return ok({ payment, subscription }, { status: 201 });
}
