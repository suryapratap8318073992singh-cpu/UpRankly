import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, projects, users } from "@/db/schema";
import { PLAN_LABEL } from "@/lib/subscription";
import { Badge, Card, PageHeader, formatDateTime, formatInr, statusTone } from "@/components/ui";
import { PaymentReviewButtons } from "@/components/admin-actions";

export const dynamic = "force-dynamic";

type SearchParams = { searchParams: Promise<{ status?: string }> };

export default async function AdminPaymentsPage({ searchParams }: SearchParams) {
  const { status } = await searchParams;
  const filter = ["pending", "approved", "rejected"].includes(status ?? "") ? status! : null;

  const rows = await db
    .select({
      payment: payments,
      userEmail: users.email,
      businessName: projects.businessName,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .leftJoin(projects, eq(payments.projectId, projects.id))
    .orderBy(desc(payments.submittedAt))
    .limit(200);

  const adminRows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.isAdmin, true));
  const adminEmail = new Map(adminRows.map((a) => [a.id, a.email]));

  const filtered = filter ? rows.filter((r) => r.payment.status === filter) : rows;
  const pending = filtered.filter((r) => r.payment.status === "pending");
  const rest = filtered.filter((r) => r.payment.status !== "pending");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Payments" subtitle="Verify UPI payments and review complete history" />

      <div className="mb-6 flex gap-2">
        {[null, "pending", "approved", "rejected"].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/payments?status=${s}` : "/admin/payments"}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              filter === s ? "border-violet-400/50 bg-violet-400/10 text-violet-200" : "border-white/10 text-zinc-400 hover:bg-white/5"
            }`}
          >
            {s ?? "all"}
          </Link>
        ))}
      </div>

      {pending.length > 0 ? (
        <>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-300">
            Pending Verification ({pending.length})
          </h2>
          <div className="mb-10 space-y-3">
            {pending.map((r) => (
              <Card key={r.payment.id} className="border-amber-400/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {r.businessName ?? "Project"} — {PLAN_LABEL[r.payment.plan]} — {formatInr(r.payment.amountInr)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {r.userEmail} · {r.payment.method.toUpperCase()} · UTR <span className="font-mono text-zinc-300">{r.payment.reference}</span> ·
                      submitted {formatDateTime(r.payment.submittedAt)}
                    </p>
                  </div>
                  <PaymentReviewButtons paymentId={r.payment.id} />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Payment History</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-white/10 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Reviewed by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rest.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No payments in this view.
                </td>
              </tr>
            ) : (
              rest.map((r) => (
                <tr key={r.payment.id}>
                  <td className="px-4 py-3 font-mono text-zinc-400">{r.payment.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${r.payment.userId}`} className="text-zinc-200 hover:text-emerald-300">
                      {r.userEmail ?? "—"}
                    </Link>
                    <p className="text-zinc-500">{r.businessName}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{PLAN_LABEL[r.payment.plan]}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatInr(r.payment.amountInr)}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{r.payment.reference ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(r.payment.status)}>{r.payment.status}</Badge>
                    {r.payment.rejectionReason ? (
                      <p className="mt-1 max-w-40 text-[10px] text-rose-300/70">{r.payment.rejectionReason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDateTime(r.payment.submittedAt)}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.payment.reviewedAt ? formatDateTime(r.payment.reviewedAt) : "—"}
                    {r.payment.reviewedBy && adminEmail.get(r.payment.reviewedBy) ? (
                      <p className="text-[10px] text-zinc-600">{adminEmail.get(r.payment.reviewedBy)}</p>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
