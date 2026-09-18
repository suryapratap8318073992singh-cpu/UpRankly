import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  Activity as ActivityIcon,
  Braces,
  CircleCheck,
  ClipboardList,
  Code2,
  CreditCard,
  Globe,
  Link2 as LinkIcon,
  Radar,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "@/db";
import { activityLogs, audits, payments, projects, seoMeta, seoTasks } from "@/db/schema";
import { getUserOrNull } from "@/lib/auth";
import { getPricing, getPayment } from "@/lib/settings";
import { getProjectSubscription, isSubscriptionActive, PLAN_LABEL } from "@/lib/subscription";
import { Badge, Card, formatDate, formatDateTime, formatInr, ScoreRing, statusTone } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { CopyButton } from "@/components/copy-button";
import { AuditForm, AuditResults, type AuditPayloadView } from "@/components/audit-form";
import { PaymentForm, TaskActions } from "@/components/user-forms";
import { InternalLinkScanButton } from "@/components/internal-link-scan-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const SUBNAV = [
  { href: "#overview", label: "Overview", icon: <Radar className="h-3.5 w-3.5" /> },
  { href: "#seo", label: "SEO Audit", icon: <CircleCheck className="h-3.5 w-3.5" /> },
  { href: "#strategy", label: "Tasks & Strategy", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { href: "#integration", label: "Integration", icon: <Code2 className="h-3.5 w-3.5" /> },
  { href: "#subscription", label: "Subscription", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { href: "#payments", label: "Payments", icon: <Receipt className="h-3.5 w-3.5" /> },
  { href: "#activity", label: "Activity", icon: <ActivityIcon className="h-3.5 w-3.5" /> },
];

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default async function ProjectDashboardPage({ params }: Params) {
  const user = await getUserOrNull();
  if (!user) redirect("/auth");
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.userId !== user.id) notFound();

  const [subscription, latestAuditRows, tasks, paymentRows, metaRows, logs, pricing, paymentInfo] =
    await Promise.all([
      getProjectSubscription(id),
      db.select().from(audits).where(eq(audits.projectId, id)).orderBy(desc(audits.createdAt)).limit(1),
      db.select().from(seoTasks).where(eq(seoTasks.projectId, id)).orderBy(seoTasks.createdAt),
      db.select().from(payments).where(eq(payments.projectId, id)).orderBy(desc(payments.submittedAt)),
      db.select().from(seoMeta).where(eq(seoMeta.projectId, id)).limit(1),
      db.select().from(activityLogs).where(eq(activityLogs.projectId, id)).orderBy(desc(activityLogs.createdAt)).limit(25),
      getPricing(),
      getPayment(),
    ]);

  const latestAudit = latestAuditRows[0] ?? null;
  const meta = metaRows[0] ?? null;
  const active = subscription ? isSubscriptionActive(subscription) : false;
  const hasPending = paymentRows.some((p) => p.status === "pending");
  const sortedTasks = [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  );
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(project.websiteUrl).origin;
  const scriptTag = `<script src="${appUrl.replace(/\/$/, "")}/api/seo.js?project=${project.id}" async></script>`;

  let auditView: AuditPayloadView | null = null;
  if (latestAudit?.status === "completed" && latestAudit.payload) {
    const p = latestAudit.payload as { checks?: unknown; signals?: unknown };
    auditView = {
      score: latestAudit.score ?? 0,
      categoryScores: (latestAudit.categoryScores as Record<string, number>) ?? {},
      checks: (p.checks as AuditPayloadView["checks"]) ?? [],
      signals: p.signals as AuditPayloadView["signals"],
      ai: (latestAudit.ai as AuditPayloadView["ai"]) ?? null,
      aiStatus: latestAudit.aiStatus,
      disclaimer:
        "UpRankly SEO Health Score is computed from on-page and technical signals we can measure directly. It is not an official Google metric.",
    };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{project.businessName}</h1>
            {subscription ? (
              <Badge tone={active ? "green" : subscription.status === "pending" ? "amber" : "red"}>
                {PLAN_LABEL[subscription.plan]} · {active ? "active" : subscription.status}
              </Badge>
            ) : (
              <Badge tone="neutral">no plan yet</Badge>
            )}
          </div>
          <a href={project.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-emerald-300">
            <Globe className="h-3.5 w-3.5" /> {project.websiteUrl}
          </a>
        </div>
        <a href="#seo" className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"><RefreshCw className="h-4 w-4" /> Run Audit</a>
      </div>

      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1">
        {SUBNAV.map((s) => (
          <a key={s.href} href={s.href} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white">
            {s.icon}
            {s.label}
          </a>
        ))}
      </div>

      <div className="space-y-12">
        <section id="overview" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-4 p-5">
              {latestAudit?.score != null ? (
                <>
                  <ScoreRing score={latestAudit.score} size={72} />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">UpRankly SEO Health</p>
                    <p className="mt-1 text-xs text-zinc-400">Last audit {formatDate(latestAudit.createdAt)}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No audit yet — run your first below.</p>
              )}
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Tasks progress</p>
              <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
                {completedTasks}<span className="text-sm text-zinc-500">/{tasks.length} done</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
                />
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Subscription</p>
              {subscription ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-white">{PLAN_LABEL[subscription.plan]}</p>
                  <div className="mt-1 text-xs text-zinc-400">
                    <Countdown expiry={subscription.expiryDate} status={subscription.status} compact />
                  </div>
                </div>
              ) : (
                <Link href="#subscription" className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-300">
                  Choose a plan <CreditCard className="h-3.5 w-3.5" />
                </Link>
              )}
            </Card>
          </div>
          {subscription && active ? (
            <div className="mt-4">
              <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Plan expires in</p>
                  <div className="mt-2">
                    <Countdown expiry={subscription.expiryDate} status={subscription.status} />
                  </div>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <p>Started: {formatDate(subscription.startDate)}</p>
                  <p className="mt-1">Expiry: {subscription.expiryDate ? formatDateTime(subscription.expiryDate) : "Never (lifetime)"}</p>
                </div>
              </Card>
            </div>
          ) : null}
        </section>

        <section id="seo" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">SEO Audit</h2>
          <Card className="p-6">
            <AuditForm projectId={project.id} />
          </Card>
          {auditView ? (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Latest audit results — {formatDateTime(latestAudit!.createdAt)}
              </h3>
              <AuditResults data={auditView} cta={false} />
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-300">Google Search Console</p>
                <Badge tone="neutral">not connected</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Connect GSC to see real clicks, impressions, CTR and average position. Until then this shows nothing —
                no estimates, no filler.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-300">Rank tracking</p>
                <Badge tone="neutral">not connected</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Rank tracking activates when a legitimate data provider is connected. UpRankly will never scrape Google
                aggressively or show invented positions.
              </p>
            </div>
          </div>
        </section>

        <section id="strategy" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            SEO Strategy & Tasks <span className="text-zinc-600">({tasks.length})</span>
          </h2>
          <InternalLinkScanButton projectId={project.id} />
          {sortedTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">Run an audit to generate your prioritized task backlog.</p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {sortedTasks.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(t.status)}>{t.status.replace("_", " ")}</Badge>
                        <Badge tone={t.priority === "critical" || t.priority === "high" ? "red" : t.priority === "medium" ? "amber" : "neutral"}>
                          {t.priority}
                        </Badge>
                        <Badge tone="neutral">{t.type.replace(/_/g, " ")}</Badge>
                        {t.source === "ai" ? <Badge tone="violet">AI</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm font-medium text-white">{t.title}</p>
                      {t.why ? <p className="mt-1 text-xs text-zinc-500">{t.why}</p> : null}
                      {t.expectedImpact ? (
                        <p className="mt-1 text-xs text-emerald-300/70">Expected impact: {t.expectedImpact}</p>
                      ) : null}
                      {t.type === "internal_link" && t.payload ? (
                        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
                          <p className="flex items-center gap-1.5 text-zinc-400">
                            <span className="font-medium text-zinc-300">From:</span>
                            <span className="truncate font-mono text-[11px] text-zinc-500">
                              {(t.payload as { sourceUrl?: string }).sourceUrl}
                            </span>
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-zinc-400">
                            <span className="font-medium text-zinc-300">To:</span>
                            <span className="truncate font-mono text-[11px] text-emerald-400/80">
                              {(t.payload as { targetUrl?: string }).targetUrl}
                            </span>
                          </p>
                          <p className="mt-2 text-zinc-500">
                            <span className="font-medium text-zinc-300">Context:</span>{" "}
                            {(t.payload as { snippet?: string }).snippet}
                          </p>
                        </div>
                      ) : null}
                      {t.type === "metadata" && t.payload?.suggestedMeta ? (
                        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
                          <p className="text-zinc-400">
                            <span className="font-medium text-zinc-300">Suggested title:</span>{" "}
                            {(t.payload.suggestedMeta as { title?: string }).title ?? "—"}
                          </p>
                          <p className="mt-1 text-zinc-400">
                            <span className="font-medium text-zinc-300">Suggested description:</span>{" "}
                            {(t.payload.suggestedMeta as { description?: string }).description ?? "—"}
                          </p>
                          <p className="mt-1.5 text-[10px] text-zinc-600">
                            Approving stages this metadata for your integration script (version history kept). It is
                            applied only while your subscription is active.
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <TaskActions projectId={project.id} taskId={t.id} status={t.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="integration" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">One-Line Integration</h2>
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <Braces className="mt-1 h-5 w-5 shrink-0 text-violet-300" />
              <div>
                <p className="text-sm font-medium text-white">Add this single line before {"</head>"} on your website</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  It applies only the metadata you&rsquo;ve approved — and only while your subscription is active.
                  Server-rendered SEO (content, sitemap, schema) remains the foundation; this script is the convenience
                  layer, not a ranking guarantee.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-xs text-emerald-300">
                {scriptTag}
              </code>
              <CopyButton text={scriptTag} label="Copy script" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Verified domain</p>
                <p className="mt-1 truncate text-sm text-zinc-200">{project.allowedDomain}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Script status</p>
                <p className="mt-1 text-sm">
                  {!active ? (
                    <span className="text-amber-300">Waiting for active subscription</span>
                  ) : meta?.enabled ? (
                    <span className="text-emerald-300">Live — approved metadata active</span>
                  ) : (
                    <span className="text-zinc-400">Active plan, no approved metadata yet</span>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Last script request</p>
                <p className="mt-1 text-sm text-zinc-200">
                  {project.scriptLastHitAt ? formatDateTime(project.scriptLastHitAt) : "No requests yet"}
                </p>
                {project.scriptHitCount > 0 ? (
                  <p className="text-[11px] text-zinc-600">{project.scriptHitCount} requests total</p>
                ) : null}
              </div>
            </div>
            <ol className="mt-5 list-decimal space-y-1 pl-5 text-xs text-zinc-500">
              <li>Copy the script tag above.</li>
              <li>Paste it into your site&rsquo;s HTML before the closing {"</head>"} tag (works on WordPress, Shopify, Webflow and custom sites).</li>
              <li>Run an audit, approve the AI-suggested metadata in Tasks.</li>
              <li>Reload your page — the &ldquo;Last script request&rdquo; field confirms the connection.</li>
            </ol>
          </Card>
        </section>

        <section id="subscription" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Subscription</h2>
          {subscription && (active || subscription.status === "pending") ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xl font-semibold text-white">{PLAN_LABEL[subscription.plan]} Plan</p>
                    <Badge tone={active ? "green" : "amber"}>{active ? "active" : subscription.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">Paid {formatInr(subscription.amountInr)} (amount at purchase time)</p>
                  <div className="mt-3 space-y-1 text-xs text-zinc-500">
                    <p>Purchased: {formatDateTime(subscription.createdAt)}</p>
                    <p>Started: {formatDateTime(subscription.startDate)}</p>
                    <p>Expiry: {subscription.expiryDate ? formatDateTime(subscription.expiryDate) : "Never — lifetime"}</p>
                  </div>
                </div>
                <div>
                  {active ? (
                    <Countdown expiry={subscription.expiryDate} status={subscription.status} />
                  ) : (
                    <p className="text-sm text-amber-300">Awaiting payment verification…</p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <PaymentForm projectId={project.id} pricing={pricing} paymentInfo={paymentInfo} hasPending={hasPending} />
            </Card>
          )}
        </section>

        <section id="payments" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Payment History</h2>
          {paymentRows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-zinc-500">No payments yet.</Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Payment ID</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentRows.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-zinc-400">{p.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-zinc-200">{PLAN_LABEL[p.plan]}</td>
                      <td className="px-4 py-3 text-zinc-200">{formatInr(p.amountInr)}</td>
                      <td className="px-4 py-3 uppercase text-zinc-400">{p.method}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{p.reference ?? "—"}</td>
                      <td className="px-4 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                      <td className="px-4 py-3 text-zinc-400">{formatDate(p.submittedAt)}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {p.reviewedAt ? formatDate(p.reviewedAt) : "—"}
                        {p.rejectionReason ? <p className="mt-0.5 max-w-48 text-rose-300/80">{p.rejectionReason}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        <section id="activity" className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Activity Timeline</h2>
          <Card className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">No activity recorded yet.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-sm text-zinc-200">{l.action.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">by {l.actorType}</p>
                  </div>
                  <p className="shrink-0 text-xs text-zinc-500">{formatDateTime(l.createdAt)}</p>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}