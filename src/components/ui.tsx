import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

/* ------------------------------ Primitives ----------------------------- */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet";
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/15 bg-white/5 text-zinc-300",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    red: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    blue: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-emerald-300">{icon}</div>
        ) : null}
      </div>
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="text-zinc-600">{icon}</div> : null}
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {body ? <p className="max-w-md text-sm text-zinc-500">{body}</p> : null}
      {action}
    </Card>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "Loading…"}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 40;
  const c = 2 * Math.PI * r;
  const color = clamped >= 75 ? "#34d399" : clamped >= 45 ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white tabular-nums">{clamped}</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">/ 100</span>
      </div>
    </div>
  );
}

export function statusTone(status: string): "neutral" | "green" | "amber" | "red" | "blue" | "violet" {
  switch (status) {
    case "active":
    case "approved":
    case "completed":
    case "pass":
      return "green";
    case "pending":
    case "suggested":
    case "in_progress":
    case "warn":
    case "running":
      return "amber";
    case "expired":
    case "cancelled":
    case "rejected":
    case "fail":
    case "failed":
      return "red";
    case "approved_task":
      return "blue";
    default:
      return "neutral";
  }
}

export function formatInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
