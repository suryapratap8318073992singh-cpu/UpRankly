"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Lock, X, Ban } from "lucide-react";

/* --------------------------- Admin login form -------------------------- */

export function AdminLoginForm() {
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
      const res = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Login failed.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Admin email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@uprankly.in"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/50"
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-xs text-rose-200">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {busy ? "Signing in…" : "Sign in to Admin"}
      </button>
    </form>
  );
}

/* ------------------------- Payment approve/reject ----------------------- */

export function PaymentReviewButtons({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (optional):") ?? "";
    }
    if (action === "approve" && !window.confirm("Approve this payment and activate the subscription?")) return;
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/payments/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        window.alert(json?.error?.message ?? "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act("approve")}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50"
      >
        {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Approve
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act("reject")}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20 disabled:opacity-50"
      >
        {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Reject
      </button>
    </div>
  );
}

/* --------------------------- Cancel subscription ------------------------ */

export function CancelSubscriptionButton({ subscriptionId, label }: { subscriptionId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    const reason = window.prompt(
      "This immediately cancels the subscription and stops all protected SEO automation. Reason (optional):",
    );
    if (reason === null) return;
    if (!window.confirm("Are you sure? This cannot be undone automatically.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, reason: reason || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        window.alert(json?.error?.message ?? "Could not cancel.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={cancel}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
      {label ?? "Cancel Subscription"}
    </button>
  );
}
