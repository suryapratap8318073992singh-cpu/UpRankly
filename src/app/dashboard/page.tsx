import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, FolderKanban, Gauge, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { audits, projects } from "@/db/schema";
import { getUserOrNull } from "@/lib/auth";
import { getProjectSubscription, isSubscriptionActive } from "@/lib/subscription";
import { getRecentNotifications } from "@/lib/settings";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Countdown } from "@/components/countdown";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUserOrNull();
  if (!user) redirect("/auth");

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  const enriched = await Promise.all(
    rows.map(async (p) => {
      const [lastAudit] = await db
        .select({ score: audits.score, createdAt: audits.createdAt })
        .from(audits)
        .where(eq(audits.projectId, p.id))
        .orderBy(desc(audits.createdAt))
        .limit(1);
      const sub = await getProjectSubscription(p.id);
      return { project: p, lastAudit: lastAudit ?? null, sub, active: sub ? isSubscriptionActive(sub) : false };
    }),
  );

  const activeCount = enriched.filter((e) => e.active).length;
  const scoredProjects = enriched.filter((e) => e.lastAudit?.score !== null && e.lastAudit !== null);
  const avgScore =
    scoredProjects.length > 0
      ? Math.round(scoredProjects.reduce((s, e) => s + (e.lastAudit?.score ?? 0), 0) / scoredProjects.length)
      : null;
  const expiringSoon = enriched.filter(
    (e) => e.active && e.sub?.expiryDate && e.sub.expiryDate.getTime() - Date.now() < 7 * 86400_000,
  );
  const notifications = await getRecentNotifications("user", user.id, 8);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Welcome${user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        subtitle="Your SEO growth command center"
        actions={
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
          >
            <Plus className="h-4 w-4" /> Add Website
          </Link>
        }
      />

      {expiringSoon.length > 0
        ? expiringSoon.map((e) => (
            <div key={e.project.id} className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4">
              <p className="text-sm text-amber-100">
                Your subscription for <span className="font-semibold">{e.project.businessName}</span> expires soon —{" "}
                <Countdown expiry={e.sub!.expiryDate} status={e.sub!.status} compact /> remaining.
              </p>
            </div>
          ))
        : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Websites" value={rows.length} icon={<FolderKanban className="h-4 w-4" />} />
        <StatCard label="Active subscriptions" value={activeCount} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard
          label="Avg. SEO Health"
          value={avgScore !== null ? `${avgScore}/100` : "—"}
          hint={avgScore !== null ? "UpRankly SEO Health Score" : "Run your first audit"}
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Your websites</h2>
          {enriched.length === 0 ? (
            <EmptyState
              icon={<GlobeIcon />}
              title="No websites yet"
              body="Add your first business website to start audits, AI strategy and growth tracking."
              action={
                <Link href="/dashboard/new" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950">
                  Add your website
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {enriched.map((e) => (
                <Link key={e.project.id} href={`/dashboard/project/${e.project.id}`}>
                  <Card className="group flex items-center justify-between gap-4 p-5 transition hover:border-emerald-400/30">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{e.project.businessName}</p>
                        {e.sub ? (
                          <Badge tone={e.active ? "green" : e.sub.status === "pending" ? "amber" : "red"}>
                            {e.active ? "active" : e.sub.status}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">no plan</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{e.project.allowedDomain}</p>
                      {e.sub && e.active ? (
                        <p className="mt-1 text-xs text-zinc-400">
                          <Countdown expiry={e.sub.expiryDate} status={e.sub.status} compact />
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4">
                      {e.lastAudit ? (
                        <div className="text-right">
                          <p className="text-lg font-semibold tabular-nums text-emerald-300">{e.lastAudit.score}</p>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">SEO score</p>
                        </div>
                      ) : (
                        <Badge tone="blue">not audited</Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            <Bell className="h-4 w-4" /> Notifications
          </h2>
          <Card className="divide-y divide-white/5">
            {notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">Nothing yet — activity will show up here.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-5 py-3.5">
                  <p className="text-sm text-zinc-200">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-zinc-500">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                    {n.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))
            )}
          </Card>
          <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/10 to-violet-500/10 p-5">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            <p className="mt-2 text-sm font-medium text-white">Grow visibility, honestly</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              UpRankly improves your chances in search with real, compounding work — never fake metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
