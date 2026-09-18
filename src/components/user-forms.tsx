"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatInr } from "@/components/ui";

/*
 * NOTE: OTP form has been removed.
 * New auth forms (LoginForm, RegisterForm, AdminLoginForm) are in auth-forms.tsx
 */

/* ---------------------------- Onboarding form -------------------------- */

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/50";
const labelCls = "mb-1.5 block text-xs font-medium text-zinc-400";

export function OnboardingForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    websiteUrl: "",
    description: "",
    category: "",
    location: "",
    targetLocations: "",
    targetAudience: "",
    competitorUrls: "",
    targetKeywords: "",
    gbpUrl: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          websiteUrl: form.websiteUrl,
          description: form.description || null,
          category: form.category || null,
          location: form.location || null,
          targetLocations: form.targetLocations.split(",").map((s) => s.trim()).filter(Boolean),
          targetAudience: form.targetAudience || null,
          competitorUrls: form.competitorUrls.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
          targetKeywords: form.targetKeywords.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30),
          gbpUrl: form.gbpUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Could not create project.");
        return;
      }
      router.push(`/dashboard/project/${json.data.project.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Business / Company Name *</label>
          <input required value={form.businessName} onChange={set("businessName")} placeholder="Acme Dental Care" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Website URL *</label>
          <input required value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://yourbusiness.com" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Business Description / Bio</label>
        <textarea
          value={form.description}
          onChange={set("description")}
          rows={3}
          placeholder="What does your business do? What makes it different?"
          className={inputCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Business Category</label>
          <input value={form.category} onChange={set("category")} placeholder="e.g. Healthcare, SaaS, Restaurant" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Business Location</label>
          <input value={form.location} onChange={set("location")} placeholder="e.g. Pune, India" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Target Cities / Countries</label>
          <input value={form.targetLocations} onChange={set("targetLocations")} placeholder="Mumbai, Delhi (comma separated)" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Target Audience</label>
          <input value={form.targetAudience} onChange={set("targetAudience")} placeholder="Who are your ideal customers?" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Competitor Websites (optional)</label>
          <input value={form.competitorUrls} onChange={set("competitorUrls")} placeholder="competitor1.com, competitor2.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Target Keywords (optional)</label>
          <input value={form.targetKeywords} onChange={set("targetKeywords")} placeholder="dentist in pune, teeth whitening" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Google Business Profile URL (optional)</label>
        <input value={form.gbpUrl} onChange={set("gbpUrl")} placeholder="https://maps.google.com/…" className={inputCls} />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-200">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        {busy ? "Creating…" : "Create project & continue"}
      </button>
    </form>
  );
}

/* ------------------------------ Payment form --------------------------- */

export function PaymentForm({
  projectId,
  pricing,
  paymentInfo,
  hasPending,
}: {
  projectId: string;
  pricing: Record<string, number | null>;
  paymentInfo: { upiId: string | null; payeeName: string | null; instructions: string | null };
  hasPending: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<string>("monthly");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const plans = [
    { id: "monthly", label: "Monthly" },
    { id: "six_month", label: "6 Months" },
    { id: "yearly", label: "Yearly" },
    { id: "lifetime", label: "Lifetime" },
  ];
  const selectedPrice = pricing[plan];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, plan, reference: reference.trim(), method: "upi" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Could not submit payment.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done || hasPending) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-300" />
        <div>
          <p className="font-medium text-amber-100">Payment pending verification</p>
          <p className="mt-1 text-sm text-amber-200/70">
            Our team is verifying your payment reference. Your subscription activates immediately after approval —
            you&rsquo;ll see the live countdown here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((p) => {
          const price = pricing[p.id];
          const active = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <p className="text-sm font-semibold text-white">{p.label}</p>
              <p className="mt-1 text-lg font-bold text-emerald-300">
                {price !== null && price !== undefined ? formatInr(price) : "Contact us"}
              </p>
              {price === null || price === undefined ? (
                <p className="mt-0.5 text-[11px] text-zinc-500">Pricing not configured yet</p>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedPrice !== null && selectedPrice !== undefined ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-semibold text-white">How payment works (manual UPI — honest & simple)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-zinc-400">
            <li>Pay {formatInr(selectedPrice)} via UPI{paymentInfo.upiId ? <> to <span className="font-mono text-emerald-300">{paymentInfo.upiId}</span>{paymentInfo.payeeName ? ` (${paymentInfo.payeeName})` : ""}</> : " using the details shared by our team"}.</li>
            {paymentInfo.instructions ? <li>{paymentInfo.instructions}</li> : null}
            <li>Enter your transaction reference / UTR below.</li>
            <li>Admin verifies and activates your subscription. Nothing is auto-charged.</li>
          </ol>
          <div className="mt-4">
            <label className={labelCls}>UPI Transaction Reference / UTR *</label>
            <input
              required
              minLength={4}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 4231 5678 9012"
              className={inputCls}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
          Pricing for this plan isn&rsquo;t configured yet — please contact us for pricing.
        </p>
      )}

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-200">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy || selectedPrice === null || selectedPrice === undefined}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {busy ? "Submitting…" : "Submit payment for verification"}
      </button>
    </form>
  );
}

/* --------------------------- Task status buttons ------------------------ */

export function TaskActions({
  projectId,
  taskId,
  status,
}: {
  projectId: string;
  taskId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(next: string) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "suggested" ? (
        <>
          <button disabled={busy} onClick={() => update("approved")} className={`${btn} border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20`}>
            Approve
          </button>
          <button disabled={busy} onClick={() => update("rejected")} className={`${btn} border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10`}>
            Reject
          </button>
        </>
      ) : status === "approved" ? (
        <button disabled={busy} onClick={() => update("in_progress")} className={`${btn} border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20`}>
          Start work
        </button>
      ) : status === "in_progress" ? (
        <button disabled={busy} onClick={() => update("completed")} className={`${btn} border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20`}>
          Mark completed
        </button>
      ) : status === "rejected" ? (
        <button disabled={busy} onClick={() => update("suggested")} className={`${btn} border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10`}>
          Reconsider
        </button>
      ) : null}
    </div>
  );
}
