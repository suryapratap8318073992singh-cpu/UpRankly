"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, Loader2, AlertTriangle } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30";
const labelCls = "mb-1.5 block text-xs font-medium text-zinc-400";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message ?? "Invalid admin credentials.");
        return;
      }

      // Check if user is admin
      if (!json.data.user.isAdmin) {
        setError("You don't have admin privileges.");
        return;
      }

      // Success - redirect to admin panel
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="uprankly-bg flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Shield className="h-4.5 w-4.5 text-white" />
          </span>
          <span className="font-display text-xl font-semibold text-white">Admin Panel</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur">
          <h1 className="text-center font-display text-2xl font-semibold text-white">Admin Login</h1>
          <p className="mt-1.5 text-center text-sm text-zinc-500">
            Restricted access only
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className={labelCls}>Admin Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@uprankly.in"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Admin Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-xs text-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Authenticating…" : "Login as Admin"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          This page is only accessible to administrators
        </p>
      </div>
    </div>
  );
}
