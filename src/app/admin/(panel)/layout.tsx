import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users & Projects", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/admin/pricing", label: "Pricing", icon: <IndianRupee className="h-4 w-4" /> },
  { href: "/admin/logs", label: "Audit Logs", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side authorization — normal users can never reach this tree.
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-[#05070c]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/5 bg-[#07090f] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-400/10">
            <ShieldCheck className="h-4 w-4 text-violet-300" />
          </span>
          <div>
            <span className="font-display text-lg font-semibold text-white">UpRankly</span>
            <span className="ml-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
              Admin
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              {n.icon}
              {n.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-white/5 pt-4">
            <Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Activity className="h-4 w-4" /> View public site
            </Link>
          </div>
        </nav>
        <div className="border-t border-white/5 p-4">
          <p className="mb-3 truncate text-xs text-zinc-400">{admin.email}</p>
          <LogoutButton admin />
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-[#07090f] px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-300" />
          <span className="font-display text-base font-semibold text-white">Admin</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin/users" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-zinc-300">Users</Link>
          <Link href="/admin/payments" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-zinc-300">Payments</Link>
          <Link href="/admin/settings" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-zinc-300">Settings</Link>
          <LogoutButton admin />
        </div>
      </div>

      <main className="flex-1 px-4 pb-16 pt-20 sm:px-8 lg:ml-60 lg:pt-10">{children}</main>
    </div>
  );
}
