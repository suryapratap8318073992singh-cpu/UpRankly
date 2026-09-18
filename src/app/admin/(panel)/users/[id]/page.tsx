import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Briefcase, CircleUserRound, Globe, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { activityLogs, audits, payments, projects, seoTasks, subscriptions, users } from "@/db/schema";
import { PLAN_LABEL } from "@/lib/subscription";
import { Badge, Card, ScoreRing, formatDate, formatDateTime, formatInr, statusTone } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { CancelSubscriptionButton, PaymentReviewButtons } from "@/components/admin-actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Params) {
  const { id } = await params;
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const projectRows = await db.select().from(projects).where(eq(projects.userId, id)).orderBy(desc(projects.createdAt));
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, id)).orderBy(desc(subscriptions.createdAt));
  const paymentRows = await db.select().from(payments).where(eq(payments.userId, id)).orderBy(desc(payments.submittedAt));
  const auditRows = await db.select().from(audits).where(eq(audits.userId, id)).orderBy(desc(audits.createdAt)).limit(10);
  const logs = await db.select().from(activityLogs).where(eq(activityLogs.userId, id)).orderBy(desc(activityLogs.createdAt)).limit(40);
  const adminRows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.isAdmin, true));
  const adminEmail = new Map(adminRows.map((a) => [a.id, a.email]));

  const tasksByProject: Record<string, (typeof seoTasks.$inferSelect)[]> = {};
  for (const p of projectRows) {
    tasksByProject[p.id] = await db.select().from(seoTasks).where(eq(seoTasks.projectId, p.id)).orderBy(desc(seoTasks.createdAt)).limit(30);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/users" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      {/* Account */}
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <CircleUserRound className="h-6 w-6 text-zinc-400" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-white">{user.fullName ?? "Unnamed user"}</h1>
              <p className="text-sm text-zinc-500">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>Registered: {formatDateTime(user.createdAt)}</p>
            <p className="mt-1">Last login: {formatDateTime(user.lastLoginAt)}</p>
            <p className="mt-1 font-mono">{user.id}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects */}
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            <Briefcase className="h-4 w-4" /> Business & Projects ({projectRows.length})
          </h2>
          {projectRows.length === 0 ? (
            <Card className="p-6 text-sm text-zinc-500">No projects yet.</Card>
          ) : (
            projectRows.map((p) => (
              <Card key={p.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{p.businessName}</p>
                    <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-300">
                      <Globe className="h-3 w-3" /> {p.websiteUrl}
                    </a>
                  </div>
                  <Badge tone="neutral">{p.category ?? "uncategorized"}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {p.description ? <div className="col-span-2"><dt className="text-zinc-600">Description</dt><dd className="mt-0.5 text-zinc-400">{p.description}</dd></div> : null}
                  {p.location ? <div><dt className="text-zinc-600">Location</dt><dd className="mt-0.5 text-zinc-400">{p.location}</dd></div> : null}
                  {(p.targetLocations as string[] | null)?.length ? <div><dt className="text-zinc-600">Targets</dt><dd className="mt-0.5 text-zinc-400">{(p.targetLocations as string[]).join(", ")}</dd></div> : null}
                  {p.targetAudience ? <div className="col-span-2"><dt className="text-zinc-600">Audience</dt><dd className="mt-0.5 text-zinc-400">{p.targetAudience}</dd></div> : null}
                  {(p.targetKeywords as string[] | null)?.length ? <div className="col-span-2"><dt className="text-zinc-600">Keywords</dt><dd className="mt-0.5 text-zinc-400">{(p.targetKeywords as string[]).join(", ")}</dd></div> : null}
                  {(p.competitorUrls as string[] | null)?.length ? <div className="col-span-2"><dt className="text-zinc-600">Competitors</dt><dd className="mt-0.5 break-all text-zinc-400">{(p.competitorUrls as string[]).join(", ")}</dd></div> : null}
                </dl>
                <p className="mt-3 border-t border-white/5 pt-3 text-[11px] text-zinc-600">
                  Script requests: {p.scriptHitCount} · Last: {formatDateTime(p.scriptLastHitAt)}
                </p>

                {/* Tasks summary */}
                {(tasksByProject[p.id] ?? []).length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                      SEO tasks ({tasksByProject[p.id].length})
                    </p>
                    {tasksByProject[p.id].slice(0, 6).map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                        <p className="truncate text-xs text-zinc-300">{t.title}</p>
                        <Badge tone={statusTone(t.status)}>{t.status.replace("_", " ")}</Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ))
          )}

          {/* Audits */}
          <h2 className="!mt-8 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent Audits</h2>
          <Card className="divide-y divide-white/5">
            {auditRows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No audits yet.</p>
            ) : (
              auditRows.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{a.domain}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(a.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    {a.score != null ? <ScoreRing score={a.score} size={40} /> : null}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Subscriptions */}
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            <ShieldCheck className="h-4 w-4" /> Subscriptions ({subs.length})
          </h2>
          {subs.length === 0 ? (
            <Card className="p-6 text-sm text-zinc-500">No subscriptions.</Card>
          ) : (
            subs.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{PLAN_LABEL[s.plan]}</p>
                      <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatInr(s.amountInr)} · start {formatDate(s.startDate)} · expiry{" "}
                      {s.expiryDate ? formatDateTime(s.expiryDate) : "never (lifetime)"}
                    </p>
                    {s.cancelledAt ? (
                      <p className="mt-1 text-xs text-rose-300/80">
                        Cancelled {formatDateTime(s.cancelledAt)} {s.cancelledBy ? `by ${s.cancelledBy}` : ""}
                      </p>
                    ) : null}
                    <div className="mt-2 text-xs text-zinc-400">
                      <Countdown expiry={s.expiryDate} status={s.status} compact />
                    </div>
                  </div>
                  {s.status === "active" || s.status === "pending" ? (
                    <CancelSubscriptionButton subscriptionId={s.id} />
                  ) : null}
                </div>
              </Card>
            ))
          )}

          {/* Payments */}
          <h2 className="!mt-8 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Payment History ({paymentRows.length})
          </h2>
          <Card className="divide-y divide-white/5">
            {paymentRows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No payments.</p>
            ) : (
              paymentRows.map((p) => (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {PLAN_LABEL[p.plan]} — {formatInr(p.amountInr)}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {p.method.toUpperCase()} · ref <span className="font-mono">{p.reference}</span> · {formatDateTime(p.submittedAt)}
                      </p>
                      {p.reviewedAt ? (
                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          Reviewed {formatDateTime(p.reviewedAt)}
                          {p.reviewedBy && adminEmail.get(p.reviewedBy) ? ` by ${adminEmail.get(p.reviewedBy)}` : ""}
                          {p.rejectionReason ? ` — ${p.rejectionReason}` : ""}
                        </p>
                      ) : null}
                    </div>
                    {p.status === "pending" ? (
                      <PaymentReviewButtons paymentId={p.id} />
                    ) : (
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Activity */}
      <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-zinc-500">Activity Timeline</h2>
      <Card className="divide-y divide-white/5">
        {logs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">No activity recorded.</p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div>
                <p className="text-sm text-zinc-200">{l.action.replace(/_/g, " ")}</p>
                {l.details ? (
                  <p className="mt-0.5 max-w-xl truncate font-mono text-[10px] text-zinc-600">
                    {JSON.stringify(l.details)}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-xs text-zinc-500">{formatDateTime(l.createdAt)}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
