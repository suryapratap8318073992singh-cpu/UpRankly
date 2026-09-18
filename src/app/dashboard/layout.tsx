import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { FolderKanban, Globe, LayoutDashboard, Plus, Rocket, Settings } from "lucide-react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getUserOrNull } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUserOrNull();
  if (!user) redirect("/auth");

  const userProjects = await db
    .select({ id: projects.id, businessName: projects.businessName, allowedDomain: projects.allowedDomain })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))
    .limit(20);

  return (
    <div className="flex min-h-screen bg-[#05070c]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/5 bg-[#07090f] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-violet-500">
            <Rocket className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-lg font-semibold text-white">UpRankly</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <Link href="/dashboard" className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </Link>
          <Link href="/dashboard/new" className="mb-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <Plus className="h-4 w-4" /> New Project
          </Link>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">My Websites</p>
          {userProjects.length === 0 ? (
            <p className="px-3 text-xs text-zinc-600">No projects yet</p>
          ) : (
            userProjects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/project/${p.id}`}
                className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <Globe className="h-4 w-4 shrink-0 text-zinc-600" />
                <span className="truncate">{p.businessName}</span>
              </Link>
            ))
          )}
          <div className="mt-4 border-t border-white/5 pt-4">
            <Link href="/dashboard/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Settings className="h-4 w-4" /> Settings & Support
            </Link>
          </div>
        </nav>
        <div className="border-t border-white/5 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <FolderKanban className="h-4 w-4 text-zinc-400" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200">{user.fullName ?? "Business Owner"}</p>
              <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-[#07090f] px-4 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-violet-500">
            <Rocket className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-display text-base font-semibold text-white">UpRankly</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/new" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300">+ Project</Link>
          <LogoutButton />
        </div>
      </div>

      <main className="flex-1 px-4 pb-16 pt-20 sm:px-8 lg:ml-60 lg:pt-10">{children}</main>
    </div>
  );
}
