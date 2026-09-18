"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  FileText,
  Link2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30";
const labelCls = "mb-1.5 block text-xs font-medium text-zinc-400";
const errorCls = "mt-1 text-xs text-rose-400";

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "UAE",
  "Other",
];

/* ------------------------------- Login Form ------------------------------ */

export function LoginForm() {
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
        setError(json?.error?.message ?? "Invalid email or password.");
        return;
      }

      router.push("/dashboard");
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
        <label className={labelCls}>Email address</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Password</label>
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/* ----------------------------- Register Form ----------------------------- */

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    country: "India",
    state: "",
    businessName: "",
    businessDescription: "",
    websiteUrl: "",
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (fieldErrors[k]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  function validateClientSide() {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "Please provide a valid email";
    }
    if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (!form.businessName.trim()) errors.businessName = "Business name is required";
    if (!form.websiteUrl.trim()) {
      errors.websiteUrl = "Website URL is required";
    } else {
      try {
        new URL(form.websiteUrl);
      } catch {
        errors.websiteUrl = "Enter a valid URL starting with http:// or https://";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateClientSide()) {
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          country: form.country || undefined,
          state: form.state.trim() || undefined,
          businessName: form.businessName.trim(),
          businessDescription: form.businessDescription.trim() || undefined,
          websiteUrl: form.websiteUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json?.error?.fields) {
          setFieldErrors(json.error.fields);
        } else {
          setError(json?.error?.message ?? "Registration failed.");
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Full Name */}
        <div>
          <label className={labelCls}>Full Name *</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              required
              value={form.fullName}
              onChange={set("fullName")}
              placeholder="Jagdish Singh"
              className={inputCls}
            />
          </div>
          {fieldErrors.fullName && <p className={errorCls}>{fieldErrors.fullName}</p>}
        </div>

        {/* Email */}
        <div>
          <label className={labelCls}>Email Address *</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              placeholder="jagdish@example.com"
              className={inputCls}
            />
          </div>
          {fieldErrors.email && <p className={errorCls}>{fieldErrors.email}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Password */}
        <div>
          <label className={labelCls}>Password * (min 8 chars)</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••••••"
              className={inputCls}
            />
          </div>
          {fieldErrors.password && <p className={errorCls}>{fieldErrors.password}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className={labelCls}>Phone Number (optional)</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+91 9041234567"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Country */}
        <div>
          <label className={labelCls}>Country</label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <select
              value={form.country}
              onChange={set("country")}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-zinc-300 outline-none transition focus:border-emerald-400/50 appearance-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-zinc-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* State */}
        <div>
          <label className={labelCls}>State</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={form.state}
              onChange={set("state")}
              placeholder="Punjab"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Business Name */}
        <div>
          <label className={labelCls}>Business Name *</label>
          <div className="relative">
            <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              required
              value={form.businessName}
              onChange={set("businessName")}
              placeholder="UpRankly Agency"
              className={inputCls}
            />
          </div>
          {fieldErrors.businessName && (
            <p className={errorCls}>{fieldErrors.businessName}</p>
          )}
        </div>

        {/* Website URL */}
        <div>
          <label className={labelCls}>Website URL * (starting with http:// or https://)</label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="url"
              required
              value={form.websiteUrl}
              onChange={set("websiteUrl")}
              placeholder="https://uprankly.in"
              className={inputCls}
            />
          </div>
          {fieldErrors.websiteUrl && <p className={errorCls}>{fieldErrors.websiteUrl}</p>}
        </div>
      </div>

      {/* Business Description */}
      <div>
        <label className={labelCls}>Business Description</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3.5 top-4 h-4 w-4 text-zinc-500" />
          <textarea
            value={form.businessDescription}
            onChange={set("businessDescription")}
            rows={3}
            placeholder="Describe what your business does..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/50"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

/* -------------------------- Admin Login Form -------------------------- */

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
  );
}
