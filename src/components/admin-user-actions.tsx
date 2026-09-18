"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UserQuickActions({
  userId,
  status,
}: {
  userId: string;
  status: "active" | "blocked";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggleBlock() {
    setError(null);
    const nextAction = status === "blocked" ? "unblock" : "block";
    if (nextAction === "block" && !confirm("Is user ko block karna hai?")) return;

    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: nextAction }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Action failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function deleteUser() {
    setError(null);
    if (!confirm("Is user ko delete karna hai?")) return;

    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Delete failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleBlock}
        disabled={isPending}
        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
          status === "blocked"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
            : "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
        }`}
      >
        {status === "blocked" ? "Unblock" : "Block"}
      </button>
      <button
        onClick={deleteUser}
        disabled={isPending}
        className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 transition hover:bg-rose-400/20 disabled:opacity-50"
      >
        Delete
      </button>
      {error ? <span className="text-[10px] text-rose-400">{error}</span> : null}
    </div>
  );
}