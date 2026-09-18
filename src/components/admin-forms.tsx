"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/50";
const labelCls = "mb-1.5 block text-xs font-medium text-zinc-400";

function useFormState() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function post(url: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Save failed.");
        return false;
      }
      setSaved(true);
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const Status = () => (
    <div className="min-h-6">
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {saved ? (
        <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> Saved
        </p>
      ) : null}
    </div>
  );

  const SaveButton = ({ label = "Save changes" }: { label?: string }) => (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </button>
  );

  return { busy, post, Status, SaveButton };
}

/* ------------------------------- Pricing -------------------------------- */

export function PricingForm({ pricing }: { pricing: Record<string, number | null> }) {
  const { post, Status, SaveButton } = useFormState();
  const [values, setValues] = useState<Record<string, string>>({
    monthly: pricing.monthly?.toString() ?? "",
    six_month: pricing.six_month?.toString() ?? "",
    yearly: pricing.yearly?.toString() ?? "",
    lifetime: pricing.lifetime?.toString() ?? "",
  });

  const fields = [
    { key: "monthly", label: "Monthly price (₹)" },
    { key: "six_month", label: "6 Months price (₹)" },
    { key: "yearly", label: "Yearly price (₹)" },
    { key: "lifetime", label: "Lifetime price (₹)" },
  ];

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const toNum = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));
        const nums = Object.values(values).filter((v) => v.trim() !== "").map(Number);
        if (nums.some((n) => Number.isNaN(n) || n < 0)) return;
        await post("/api/admin/pricing", {
          monthly: toNum(values.monthly),
          six_month: toNum(values.six_month),
          yearly: toNum(values.yearly),
          lifetime: toNum(values.lifetime),
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className={labelCls}>{f.label}</label>
            <input
              type="number"
              min={0}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder="Leave empty = Contact us"
              className={inputCls}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Old payments keep their original charged amount — price changes only affect new purchases. Every change is
        audit-logged (old → new).
      </p>
      <Status />
      <SaveButton label="Save pricing" />
    </form>
  );
}

/* --------------------------- Payment instructions ----------------------- */

export function PaymentSettingsForm({
  payment,
}: {
  payment: { upiId: string; payeeName: string; instructions: string };
}) {
  const { post, Status, SaveButton } = useFormState();
  const [form, setForm] = useState(payment);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await post("/api/admin/settings", { section: "payment", data: form });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>UPI ID</label>
          <input value={form.upiId} onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))} placeholder="yourbusiness@upi" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Payee name</label>
          <input value={form.payeeName} onChange={(e) => setForm((f) => ({ ...f, payeeName: e.target.value }))} placeholder="UpRankly Technologies" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Payment instructions (shown on checkout)</label>
        <textarea rows={3} value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Include your business name in the payment note." className={inputCls} />
      </div>
      <Status />
      <SaveButton label="Save payment details" />
    </form>
  );
}

/* -------------------------------- Contact ------------------------------- */

export function ContactForm({ contact }: { contact: Record<string, string> }) {
  const { post, Status, SaveButton } = useFormState();
  const [form, setForm] = useState<Record<string, string>>(contact);
  const fields: { key: string; label: string; placeholder: string }[] = [
    { key: "email", label: "Contact Email", placeholder: "support@uprankly.in" },
    { key: "phone", label: "Phone Number", placeholder: "+91 XXXXX XXXXX" },
    { key: "whatsapp", label: "WhatsApp Number", placeholder: "+91 XXXXX XXXXX" },
    { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/uprankly" },
    { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/uprankly" },
    { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/uprankly" },
    { key: "twitter", label: "Twitter / X URL", placeholder: "https://x.com/uprankly" },
    { key: "telegram", label: "Telegram URL (optional)", placeholder: "https://t.me/uprankly" },
    { key: "youtube", label: "YouTube URL (optional)", placeholder: "https://youtube.com/@uprankly" },
    { key: "address", label: "Office Address", placeholder: "Pune, Maharashtra, India" },
    { key: "supportHours", label: "Support Hours", placeholder: "Mon–Sat, 10 AM – 7 PM IST" },
    { key: "supportMessage", label: "Support Message", placeholder: "We usually reply within 24 hours." },
  ];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await post("/api/admin/contact", form);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.key === "address" || f.key === "supportMessage" ? "sm:col-span-2" : ""}>
            <label className={labelCls}>{f.label}</label>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        The public website displays exactly these values. Empty fields are hidden — no placeholder contact info is ever
        shown. Changes are audit-logged.
      </p>
      <Status />
      <SaveButton label="Save contact settings" />
    </form>
  );
}

/* --------------------------------- Site --------------------------------- */

export function SiteForm({ site }: { site: Record<string, string> }) {
  const { post, Status, SaveButton } = useFormState();
  const [form, setForm] = useState(site);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.siteName?.trim()) return;
        await post("/api/admin/settings", {
          section: "site",
          data: {
            siteName: form.siteName,
            tagline: form.tagline ?? "",
            description: form.description ?? "",
            seoTitle: form.seoTitle ?? "",
            seoDescription: form.seoDescription ?? "",
          },
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Site name</label>
          <input value={form.siteName ?? ""} onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tagline</label>
          <input value={form.tagline ?? ""} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Site description</label>
          <textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Default SEO title</label>
          <input value={form.seoTitle ?? ""} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Default SEO description</label>
          <input value={form.seoDescription ?? ""} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} className={inputCls} />
        </div>
      </div>
      <Status />
      <SaveButton label="Save site settings" />
    </form>
  );
}

/* ---------------------------------- AI ---------------------------------- */

export function AiForm({
  ai,
}: {
  ai: { auditEnabled: boolean; strategyEnabled: boolean; contentEnabled: boolean; freeAuditsPerDay: number };
}) {
  const { post, Status, SaveButton } = useFormState();
  const [form, setForm] = useState(ai);
  const toggles = [
    { key: "auditEnabled" as const, label: "Enable website audits" },
    { key: "strategyEnabled" as const, label: "Enable AI strategy generation (Gemini)" },
    { key: "contentEnabled" as const, label: "Enable AI content engine" },
  ];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await post("/api/admin/settings", { section: "ai", data: form });
      }}
      className="space-y-4"
    >
      {toggles.map((t) => (
        <label key={t.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="text-sm text-zinc-200">{t.label}</span>
          <input
            type="checkbox"
            checked={form[t.key]}
            onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.checked }))}
            className="h-4 w-4 accent-violet-500"
          />
        </label>
      ))}
      <div>
        <label className={labelCls}>Free audits per day (anonymous visitors)</label>
        <input
          type="number"
          min={1}
          max={50}
          value={form.freeAuditsPerDay}
          onChange={(e) => setForm((f) => ({ ...f, freeAuditsPerDay: Number(e.target.value) || 1 }))}
          className={inputCls}
        />
      </div>
      <Status />
      <SaveButton label="Save AI settings" />
    </form>
  );
}

/* -------------------------------- Account ------------------------------- */

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const { post, busy, Status, SaveButton } = useFormState();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const okSave = await post("/api/admin/change-email", { newEmail, currentPassword });
        if (okSave) {
          setNewEmail("");
          setCurrentPassword("");
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className={labelCls}>Current email</label>
        <input value={currentEmail} disabled className={`${inputCls} opacity-50`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>New email</label>
          <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Confirm with current password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
        </div>
      </div>
      <Status />
      <SaveButton label={busy ? "Changing…" : "Change email"} />
    </form>
  );
}

export function ChangePasswordForm() {
  const { post, Status, SaveButton } = useFormState();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const okSave = await post("/api/admin/change-password", form);
        if (okSave) setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Current password</label>
          <input type="password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>New password (min 10 chars)</label>
          <input type="password" required minLength={10} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Confirm new password</label>
          <input type="password" required minLength={10} value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Passwords are stored only as salted scrypt hashes — never in plain text, never in logs.
      </p>
      <Status />
      <SaveButton label="Change password" />
    </form>
  );
}
