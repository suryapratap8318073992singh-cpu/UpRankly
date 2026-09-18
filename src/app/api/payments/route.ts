import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, projects } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";

/** Users can only see their own payment history. */
export async function GET() {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");

  const rows = await db
    .select({
      payment: payments,
      businessName: projects.businessName,
    })
    .from(payments)
    .leftJoin(projects, eq(payments.projectId, projects.id))
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.submittedAt));

  return ok({
    payments: rows.map((r) => ({ ...r.payment, businessName: r.businessName })),
  });
}
