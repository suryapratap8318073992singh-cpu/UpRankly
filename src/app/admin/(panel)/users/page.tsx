import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { ArrowRight, Search } from "lucide-react";
import { db } from "@/db";
import { projects, subscriptions, users } from "@/db/schema";
import { PLAN_LABEL } from "@/lib/subscription";
import { Badge, Card, PageHeader, formatDate, formatInr, statusTone } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { UserQuickActions } from "@/components/admin-user-actions";

export const dynamic = "force-dynamic";

type SearchParams = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function AdminUsersPage({ searchParams }: SearchParams) {
  const { q, status } = await searchParams;
  const query = q?.trim() ?? "";
  const statusFilter = ["active", "blocked"].includes(status ?? "") ? (status as "active" | "blocked") : null;

  const rows = await db
    .select()
    .from(users)
    .where(query ? or(ilike(users.email, `%${query}%`), ilike(users.fullName, `%${query}%`)) : sql`true`)
    .orderBy(desc(users.createdAt))
    .limit(100);

  const visibleRows = rows.filter((u) => {
    if (u.deletedAt) return false; // soft-deleted users hide from main list
    if (statusFilter) return u.status === statusFilter;
    return true;
  });

  const enriched = await Promise.all(
    visibleRows.map(async (u) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, u.id))
        .orderBy(desc(projects.createdAt))
        .limit(1);
      const [sub] = project
        ? await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.projectId, project.id))
            .orderBy(desc(subscriptions.createdAt))
            .limit(1)
        : [null];
      return { user: u, project: project ?? null, sub: sub ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Users & Projects" subtitle="Search, review and manage every business on UpRankly" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form className="flex max-w-md flex-1 items-center gap-2" method="GET">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by email or name…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/50"
            />
          </div>
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          <button className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">
            Search
          </button>
        </form>

        <div className="flex gap-2">
          {[null, "active", "blocked"].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/admin/users?status=${s}${query ? `&q=${query}` : ""}` : `/admin/users${query ? `?q=${query}` : ""}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === s ? "border-violet-400/50 bg-violet-400/10 text-violet-200" : "border-white/10 text-zinc-400 hover:bg-white/5"
              }`}
            >
              {s ?? "all"}
            </Link>
          ))}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="border-b border-white/10 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Business / Website</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Sub Status</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Countdown</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {enriched.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No users found.
                </td>
              </tr>
            ) : (
              enriched.map((e, i) => (
                <tr key={e.user.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{e.user.fullName ?? "—"}</p>
                    <p className="text-zinc-400">{e.user.email}</p>
                    {e.user.phone ? <p className="text-zinc-500">{e.user.phone}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    {e.project ? (
                      <>
                        <p className="text-zinc-200">{e.project.businessName}</p>
                        <p className="text-zinc-500">{e.project.allowedDomain}</p>
                      </>
                    ) : (
                      <span className="text-zinc-600">No project</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{e.sub ? PLAN_LABEL[e.sub.plan] : "—"}</td>
                  <td className="px-4 py-3 text-zinc-300">{e.sub ? formatInr(e.sub.amountInr) : "—"}</td>
                  <td className="px-4 py-3">
                    {e.sub ? <Badge tone={statusTone(e.sub.status)}>{e.sub.status}</Badge> : <Badge tone="neutral">none</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={e.user.status === "blocked" ? "rose" : "emerald"}>{e.user.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {e.sub ? (
                      <Countdown expiry={e.sub.expiryDate} status={e.sub.status} compact />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(e.user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${e.user.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/10"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                      <UserQuickActions userId={e.user.id} status={e.user.status} />
                    </div>
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