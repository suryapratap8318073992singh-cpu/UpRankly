import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";

export const dynamic = "force-dynamic";

type SearchParams = { searchParams: Promise<{ action?: string }> };

export default async function AdminLogsPage({ searchParams }: SearchParams) {
  const { action } = await searchParams;
  const filter = action?.trim() ?? "";

  const logs = await db
    .select()
    .from(activityLogs)
    .where(filter ? eq(activityLogs.action, filter) : sql`true`)
    .orderBy(desc(activityLogs.createdAt))
    .limit(150);

  const actions = await db
    .selectDistinct({ action: activityLogs.action })
    .from(activityLogs)
    .orderBy(activityLogs.action)
    .limit(60);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audit Logs" subtitle="Every important event, recorded with actor, time and context" />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/logs"
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${!filter ? "border-violet-400/50 bg-violet-400/10 text-violet-200" : "border-white/10 text-zinc-400 hover:bg-white/5"}`}
        >
          all
        </Link>
        {actions.map((a) => (
          <Link
            key={a.action}
            href={`/admin/logs?action=${a.action}`}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
              filter === a.action ? "border-violet-400/50 bg-violet-400/10 text-violet-200" : "border-white/10 text-zinc-400 hover:bg-white/5"
            }`}
          >
            {a.action}
          </Link>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="border-b border-white/10 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{l.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {l.actorType}
                    {l.actorId ? <p className="font-mono text-[10px] text-zinc-600">{l.actorId.slice(0, 8)}…</p> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{l.userId ? `${l.userId.slice(0, 8)}…` : "—"}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{l.projectId ? `${l.projectId.slice(0, 8)}…` : "—"}</td>
                  <td className="max-w-56 px-4 py-3">
                    <p className="truncate font-mono text-[10px] text-zinc-500">{l.details ? JSON.stringify(l.details) : "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-zinc-500">{l.ip ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDateTime(l.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
