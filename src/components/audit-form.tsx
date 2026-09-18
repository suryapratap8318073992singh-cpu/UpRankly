"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Loader2,
  MinusCircle,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ScoreRing, Badge } from "@/components/ui";

/* ------------------------------- Types -------------------------------- */

export type AuditCheckView = {
  id: string;
  label: string;
  category: string;
  status: "pass" | "warn" | "fail";
  weight: number;
  detail: string;
};

export type AuditPayloadView = {
  auditId?: string;
  score: number;
  categoryScores: Record<string, number>;
  checks: AuditCheckView[];
  signals: {
    finalUrl: string;
    title: string | null;
    metaDescription: string | null;
    wordCount: number;
    responseMs: number;
    jsonLdTypes: string[];
    links: { internal: number; external: number };
    topTerms: { term: string; count: number }[];
  };
  ai: {
    summary?: string;
    technicalFindings?: { issue: string; severity: string; evidence?: string; fix?: string }[];
    keywordStrategy?: { keyword: string; intent: string; relevance: string; priority: string; contentOpportunity?: string }[];
    strategy?: { area: string; task: string; why: string; priority: string; expectedImpact?: string; difficulty?: string }[];
    contentIdeas?: { title: string; intent?: string; outline?: string[] }[];
    competitorInsights?: { competitor: string; strength?: string; weakness?: string; opportunity?: string; recommendedAction?: string }[];
  } | null;
  aiStatus: string;
  disclaimer?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  onpage: "On-Page",
  content: "Content",
  structured: "Structured Data",
  mobile: "Mobile",
};

function CheckIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (status === "warn") return <MinusCircle className="h-4 w-4 shrink-0 text-amber-400" />;
  return <XCircle className="h-4 w-4 shrink-0 text-rose-400" />;
}

/* --------------------------- Results render ---------------------------- */

export function AuditResults({ data, cta = true }: { data: AuditPayloadView; cta?: boolean }) {
  const [tab, setTab] = useState<"checks" | "ai">("checks");
  const fails = data.checks.filter((c) => c.status === "fail");
  const warns = data.checks.filter((c) => c.status === "warn");

  return (
    <div className="space-y-6">
      {/* Score overview */}
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={data.score} />
          <p className="text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            UpRankly SEO
            <br />
            Health Score
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-200">{data.signals.finalUrl}</span> — {fails.length} issues failing,{" "}
            {warns.length} warnings. Measured live from your page&rsquo;s real HTML ({data.signals.responseMs}ms response).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(data.categoryScores).map(([cat, val]) => (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="tabular-nums text-zinc-300">{val}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${val >= 75 ? "bg-emerald-400" : val >= 45 ? "bg-amber-400" : "bg-rose-400"}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.disclaimer ? (
        <p className="text-xs leading-relaxed text-zinc-500">{data.disclaimer}</p>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {(["checks", "ai"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "border-emerald-400 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "checks" ? "Technical Checks" : "AI Strategy"}
            {t === "ai" && data.ai ? (
              <Sparkles className="ml-1.5 inline h-3.5 w-3.5 text-violet-300" />
            ) : null}
          </button>
        ))}
      </div>

      {tab === "checks" ? (
        <div className="space-y-2">
          {data.checks.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <CheckIcon status={c.status} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100">{c.label}</span>
                  <Badge tone="neutral">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
                </div>
                <p className="mt-0.5 break-words text-xs text-zinc-500">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ) : data.ai ? (
        <div className="space-y-8">
          {data.ai.summary ? (
            <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
              <p className="text-sm leading-relaxed text-zinc-200">{data.ai.summary}</p>
            </div>
          ) : null}

          {data.ai.technicalFindings && data.ai.technicalFindings.length > 0 ? (
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Prioritized Technical Findings
              </h4>
              <div className="space-y-2">
                {data.ai.technicalFindings.map((f, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={f.severity === "critical" || f.severity === "high" ? "red" : f.severity === "medium" ? "amber" : "neutral"}
                      >
                        {f.severity}
                      </Badge>
                      <span className="text-sm font-medium text-zinc-100">{f.issue}</span>
                    </div>
                    {f.fix ? <p className="mt-1.5 text-xs text-zinc-400">Fix: {f.fix}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {data.ai.keywordStrategy && data.ai.keywordStrategy.length > 0 ? (
            <section>
              <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Suggested Keyword Strategy
              </h4>
              <p className="mb-3 text-xs text-zinc-500">
                Based on your content and business context. No volume claims — connect Search Console for real query data.
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Keyword</th>
                      <th className="px-3 py-2 font-medium">Intent</th>
                      <th className="px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Content Opportunity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.ai.keywordStrategy.map((k, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-zinc-200">{k.keyword}</td>
                        <td className="px-3 py-2 text-zinc-400">{k.intent}</td>
                        <td className="px-3 py-2">
                          <Badge tone={k.priority === "high" ? "green" : k.priority === "medium" ? "amber" : "neutral"}>
                            {k.priority}
                          </Badge>
                        </td>
                        <td className="max-w-56 px-3 py-2 text-zinc-400">{k.contentOpportunity || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {data.ai.strategy && data.ai.strategy.length > 0 ? (
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                AI SEO Growth Plan
              </h4>
              <div className="space-y-2">
                {data.ai.strategy.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="blue">{s.area}</Badge>
                        <Badge tone={s.priority === "critical" || s.priority === "high" ? "red" : s.priority === "medium" ? "amber" : "neutral"}>{s.priority}</Badge>
                        {s.difficulty ? <Badge tone="neutral">{s.difficulty}</Badge> : null}
                      </div>
                      <p className="mt-1.5 text-sm text-zinc-100">{s.task}</p>
                      <p className="mt-1 text-xs text-zinc-500">{s.why}</p>
                      {s.expectedImpact ? (
                        <p className="mt-1 text-xs text-emerald-300/80">Expected impact: {s.expectedImpact}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {data.ai.contentIdeas && data.ai.contentIdeas.length > 0 ? (
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Content Opportunities</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.ai.contentIdeas.map((c, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-sm font-medium text-zinc-100">{c.title}</p>
                    {c.intent ? <p className="mt-1 text-xs text-zinc-500">Intent: {c.intent}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {cta ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
              <div>
                <p className="text-sm font-semibold text-white">Want UpRankly to track and grow this continuously?</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Create a free account to turn this report into an ongoing SEO growth plan with tasks and integrations.
                </p>
              </div>
              <Link
                href="/auth"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
              >
                Get Started Free
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-zinc-200">
              AI strategy is{" "}
              {data.aiStatus === "not_configured" ? "not configured yet" : "temporarily unavailable"}.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              The deterministic technical audit above is fully real. The AI strategy layer activates once a Gemini API
              key is configured on the server — no synthetic filler is shown in the meantime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Audit form ----------------------------- */

const LOAD_STEPS = [
  "Validating URL & security checks…",
  "Fetching your page safely…",
  "Parsing HTML, metadata & structured data…",
  "Computing UpRankly SEO Health Score…",
  "Asking the AI engine for strategy…",
];

export function AuditForm({ projectId }: { projectId?: string }) {
  const [url, setUrl] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditPayloadView | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOAD_STEPS.length - 1)), 3500);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          projectId: projectId ?? null,
          business:
            businessName || description || category || location
              ? { businessName, description, category, location }
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Audit failed. Please try again.");
        return;
      }
      setResult(json.data as AuditPayloadView);
      if (projectId) setTimeout(() => window.location.reload(), 500);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your website URL (e.g. yourbusiness.com)"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/50 focus:bg-white/[0.07]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Auditing…" : "Get Free SEO Audit"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowContext((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition ${showContext ? "rotate-180" : ""}`} />
          Add business context (optional — makes AI recommendations sharper)
        </button>

        {showContext ? (
          <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-400/50"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (e.g. Dental clinic, SaaS)"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-400/50"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Pune, India)"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-400/50"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what you do"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-400/50"
            />
          </div>
        ) : null}
      </form>

      {busy ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          {LOAD_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              {i < step ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : i === step ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-white/15" />
              )}
              <span className={i <= step ? "text-zinc-200" : "text-zinc-600"}>{s}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {result ? <AuditResults data={result} cta={!projectId} /> : null}
    </div>
  );
}
