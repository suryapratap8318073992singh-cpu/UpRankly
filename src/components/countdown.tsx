"use client";

import { useEffect, useState } from "react";

/**
 * Live subscription countdown. PURELY VISUAL — the backend independently
 * enforces expiry on every protected operation.
 */
export function Countdown({
  expiry,
  status,
  compact = false,
}: {
  expiry: string | Date | null;
  status: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (status === "cancelled") {
    return <span className="font-medium text-rose-300">Cancelled</span>;
  }
  if (status === "expired") {
    return <span className="font-medium text-rose-300">Subscription Expired</span>;
  }
  if (status === "rejected") {
    return <span className="font-medium text-rose-300">Rejected</span>;
  }
  if (status === "pending") {
    return <span className="font-medium text-amber-300">Pending Verification</span>;
  }
  if (expiry === null || expiry === undefined) {
    return <span className="font-medium text-emerald-300">Lifetime Active</span>;
  }

  const target = new Date(expiry).getTime();
  const diff = now === null ? null : target - now;
  if (diff === null) {
    return <span className="text-zinc-500">…</span>;
  }
  if (diff <= 0) {
    return <span className="font-medium text-rose-300">Subscription Expired</span>;
  }

  const days = Math.floor(diff / 86400_000);
  const hours = Math.floor((diff % 86400_000) / 3600_000);
  const minutes = Math.floor((diff % 3600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (compact) {
    return (
      <span className="tabular-nums text-emerald-300">
        {days}d {hours}h {minutes}m
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { v: days, l: "Days" },
        { v: hours, l: "Hours" },
        { v: minutes, l: "Minutes" },
        { v: seconds, l: "Seconds" },
      ].map((u) => (
        <div
          key={u.l}
          className="flex min-w-16 flex-col items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
        >
          <span className="text-lg font-semibold tabular-nums text-white">{u.v}</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">{u.l}</span>
        </div>
      ))}
    </div>
  );
}
