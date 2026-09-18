import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  AlarmClock,
  ArrowRight,
  Bell,
  CreditCard,
  FolderKanban,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { db } from "@/db";
import { activityLogs, payments, projects, subscriptions, users } from "@/db/schema";
import { EXPIRING_SOON_MS, PLAN_LABEL } from "@/lib/subscription";
import { getRecentNotifications } from "@/lib/settings";
import { Badge, Card, PageHeader, StatCard, formatDateTime, formatInr } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { PaymentReviewButtons } from "@/components/admin-actions";
import { redirect } from "next/navigation";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) redirect("/admin/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    [userCount],
    [projectCount],
    [pendingCount],
    [activeCount],
    [expiredCount],
    [cancelledCount],
    [totalRevenue],
    [monthRevenue],
    pendingPayments,
    notifications,
    recentLogs,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(projects),
    db.select({ n: sql<number>`count(*)::int` }).from(payments).where(eq(payments.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select({ n: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "expired")),
    db.select({ n: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "cancelled")),
    db.select({ n: sql<number>`coalesce(sum(amount_inr),0)::int` }).from(payments).where(eq(payments.status, "approved")),
    db
      .select({ n: sql<number>`coalesce(sum(amount_inr),0)::int` })
      .from(payments)
      .where(sql`${payments.status} = 'approved' AND ${payments.reviewedAt} >= ${monthStart}`),
    db
      .select({ payment: payments, userEmail: users.email, businessName: projects.businessName })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .leftJoin(projects, eq(payments.projectId, projects.id))
      .where(eq(payments.status, "pending"))
      .orderBy(desc(payments.submittedAt))
      .limit(8),
    getRecentNotifications("admin", undefined, 8),
    db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(8),
  ]);

  const expiringSoon = await db
    .select({ sub: subscriptions, businessName: projects.businessName })
    .from(subscriptions)
    .leftJoin(projects, eq(subscriptions.projectId, projects.id))
    .where(
      sql`${subscriptions.status} = 'active' AND ${subscriptions.expiryDate} IS NOT NULL AND ${subscriptions.expiryDate} > ${now} AND ${subscriptions.expiryDate} < ${new Date(now.getTime() + EXPIRING_SOON_MS)}`,
    )
    .orderBy(subscriptions.expiryDate)
    .limit(8);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Admin Overview" subtitle="Everything happening across UpRankly — real numbers only" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={userCount?.n ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total Projects" value={projectCount?.n ?? 0} icon={<FolderKanban className="h-4 w-4" />} />
        <StatCard label="Pending Payments" value={pendingCount?.n ?? 0} icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Active Subscriptions" value={activeCount?.n ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Expiring Soon (7d)" value={expiringSoon.length} icon={<AlarmClock className="h-4 w-4" />} />
        <StatCard label="Expired" value={expiredCount?.n ?? 0} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Total Revenue" value={formatInr(totalRevenue?.n ?? 0)} hint="approved payments only" icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="This Month Revenue" value={formatInr(monthRevenue?.n ?? 0)} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {/* Pending payments */}
      <h2 className="mb-4 mt-10 flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-zinc-500">
        <span>Pending Payment Verification</span>
        <Link href="/admin/payments" className="inline-flex items-center gap-1 text-xs normal-case text-emerald-300">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </h2>
      {pendingPayments.length === 0 ? (
        <Card className="p-6 text-sm text-zinc-500">No pending payments. You&rsquo;re all caught up.</Card>
      ) : (
        <Card className="divide-y divide-white/5">
          {pendingPayments.map((p) => (
            <div key={p.payment.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">
                  {p.businessName ?? "Unknown project"} — {PLAN_LABEL[p.payment.plan]} — {formatInr(p.payment.amountInr)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {p.userEmail} · ref <span className="font-mono">{p.payment.reference}</span> · {formatDateTime(p.payment.submittedAt)}
                </p>
              </div>
              <PaymentReviewButtons paymentId={p.payment.id} />
            </div>
          ))}
        </Card>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Expiring soon */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Expiring Soon</h2>
          <Card className="divide-y divide-white/5">
            {expiringSoon.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">Nothing expiring in the next 7 days.</p>
            ) : (
              expiringSoon.map((e) => (
                <div key={e.sub.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-sm text-zinc-200">{e.businessName ?? "Project"}</p>
                    <p className="text-xs text-zinc-500">{PLAN_LABEL[e.sub.plan]}</p>
                  </div>
                  <Link href={`/admin/users/${e.sub.userId}`} className="text-xs">
                    <Countdown expiry={e.sub.expiryDate} status={e.sub.status} compact />
                  </Link>
                </div>
              ))
            )}
          </Card>

          <h2 className="mb-4 mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            <Bell className="h-4 w-4" /> Notifications
          </h2>
          <Card className="divide-y divide-white/5">
            {notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-5 py-3.5">
                  <p className="text-sm text-zinc-200">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-zinc-500">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{formatDateTime(n.createdAt)}</p>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent Activity</h2>
          <Card className="divide-y divide-white/5">
            {recentLogs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No activity yet.</p>
            ) : (
              recentLogs.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-sm text-zinc-200">{l.action.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">by {l.actorType}</p>
                  </div>
                  <Badge tone="neutral">{formatDateTime(l.createdAt)}</Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
