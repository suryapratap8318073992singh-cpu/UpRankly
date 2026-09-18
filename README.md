# UpRankly — AI SEO Growth Operating System

UpRankly is an AI-powered SEO automation platform for businesses. It audits websites with
real technical signals, generates a Gemini-powered growth strategy, manages reviewable SEO
tasks, applies owner-approved metadata via a one-line integration script, and runs a complete
manual-payment subscription system with admin control.

**Honesty by design:** no fake rankings, no fake traffic, no fake backlinks, no fake AI actions,
no guaranteed-Google-#1 promises. Features that need external data (Search Console, rank
tracking) stay marked "not connected" until a legitimate integration is added.

---

## 🏗️ Architecture

```
Next.js 16 (App Router, TypeScript) ──┬── Landing / Marketing (DB-driven pricing + contact)
                                      ├── User Dashboard (projects, audits, tasks, payments)
                                      ├── Admin Panel (users, payments, pricing, logs, settings)
                                      └── API Routes (Zod-validated, session-authorized)
PostgreSQL (Drizzle ORM) ──────────────┴── users, projects, subscriptions, payments, audits,
                                           tasks, seo_meta + versions, logs, notifications,
                                           settings, rate_limits, integrations, rank_tracking
Cheerio ───────────────────────────────── HTML parsing for real audit signals
Gemini API (REST, server-side only) ───── validated via Zod (repair + retry), never trusted blindly
```

### Auth model
- **Business users:** passwordless email OTP (6-digit codes, hashed at rest, 10-min expiry,
  attempt-limited, rate-limited). Email delivery is provider-pluggable via `OTP_EMAIL_WEBHOOK_URL`;
  without it, codes use clearly-marked **development delivery**. Phone OTP is architecture-ready
  and activates only when an SMS provider is configured — the UI says so honestly.
- **Admin:** single Super Admin, email + password (scrypt hash only — never plain text),
  rate-limited login, all attempts logged. Change email/password securely from Admin Settings
  (requires current password). `/admin/*` is guarded server-side in both the layout and every
  admin API route (session + `role = super_admin`).

Every request re-validates ownership/roles server-side — this is the enforcement layer
(equivalent protection model to RLS, implemented at the application server since UpRankly talks
directly to its own Postgres).

---

## 🗂️ Folder structure

```
UpRankly/
├── src/
│   ├── app/
│   │   ├── page.tsx / pricing/ / contact/         # public marketing (DB-driven)
│   │   ├── auth/                                  # email OTP sign-in
│   │   ├── dashboard/                             # user: overview, new project, project workspace, settings
│   │   ├── admin/
│   │   │   ├── login/                             # admin login (unguarded)
│   │   │   └── (panel)/                           # guarded: overview, users, payments, pricing, logs, settings
│   │   └── api/                                   # audit, seo.js, payments, admin/*, auth/*, cron/*
│   ├── components/                                # ui, marketing, forms, countdown, audit
│   ├── lib/                                       # auth, url (SSRF), audit, gemini, ratelimit, subscription, settings
│   └── db/                                        # Drizzle client + schema
├── drizzle.config.json
├── .env.example
├── UPRANKLY_SUPABASE_SETUP.md                       # fresh-database setup (if using Supabase Postgres)
├── CURAEASE_ISOLATION.md                          # hard separation rules
├── VSCODE_SETUP.md                                # beginner-friendly local setup
└── README.md
```

---

## ⚙️ Local setup

```bash
npm install
cp .env.example .env.local     # fill in values (see below)
npm run dev
```

Then apply the schema to your fresh UpRankly database:

```bash
npx drizzle-kit push           # creates all UpRankly tables (runs against YOUR DATABASE_URL)
```

App runs at http://localhost:3000
Admin login: http://localhost:3000/admin/login (uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first login)

### Where each env value comes from

| Variable | Source |
|---|---|
| `DATABASE_URL` | Your **new, UpRankly-only** Postgres. Local: `postgresql://postgres:postgres@127.0.0.1:5432/uprankly_db`. Supabase option: new project's Settings → Database → connection string. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | You choose these (used once to bootstrap the first admin). |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey (free tier). **Server-side only.** |
| `NEXT_PUBLIC_APP_URL` | Your public app URL (used in the integration script tag). |
| `CRON_SECRET` | Any long random string you generate. |
| `OTP_EMAIL_WEBHOOK_URL` | Optional — any webhook that accepts `{to, subject, text}` and emails it. |

---

## ✅ Testing checklist

**Auth**
- [ ] Email OTP request → verify → lands on `/dashboard`
- [ ] Wrong code rejected; code expires after 10 min; attempts capped
- [ ] `/admin/login` boots admin from env; wrong password rejected + logged
- [ ] Visiting `/admin` signed out → redirected to `/admin/login`
- [ ] A normal user's session cannot call `/api/admin/*` (403)

**User flow**
- [ ] Create project (duplicate domain rejected)
- [ ] Run audit → score + checks appear; tasks created
- [ ] Invalid URL / private IP URL → clean error (SSRF blocked)
- [ ] Submit payment → shows "Pending Verification"
- [ ] Second payment while pending → blocked

**Admin flow**
- [ ] Pending payment appears on Overview + Payments
- [ ] Approve → subscription active, calendar-based expiry, user notified
- [ ] Reject (with reason) → subscription stays inactive
- [ ] Change price → old payments keep old `amountInr`; log shows `price_changed` with old/new
- [ ] Update contact settings → public footer/contact shows new values; empties hidden
- [ ] Cancel subscription → status cancelled, timestamp recorded, script disabled
- [ ] Logs page filters by action

**Subscription engine**
- [ ] Monthly = start + 1 calendar month; 6-months; yearly; lifetime = no expiry
- [ ] Countdown ticks live; expired status auto-applies on next access
- [ ] `/api/seo.js` works only when active; pending/cancelled/expired → no-op script
- [ ] Lifetime → `Lifetime Active` and script keeps working

**Script**
- [ ] Valid project + active sub + approved meta → metadata applied in console/browser
- [ ] Invalid project id → 200 no-op; wrong referer domain → disabled
- [ ] Dashboard shows hit count + last request timestamp

---

## ☁️ Vercel deployment (UpRankly's OWN project)

1. Push this folder to a **new** GitHub repo named `uprankly` (not any existing repo).
2. Vercel → **Add New Project** (separate project — do not reuse an existing one).
3. Add the same env vars from `.env.local` in **Project Settings → Environment Variables**
   (set `NEXT_PUBLIC_APP_URL` to your production domain).
4. Deploy. Run `npx drizzle-kit push` once against the production `DATABASE_URL`.
5. Optional cron: Vercel → Project → Cron Jobs → add
   `GET /api/cron/expire` daily with header `Authorization: Bearer $CRON_SECRET`.

`.gitignore` already excludes `.env*`, `node_modules`, `.next`. Never commit keys.

---

## 🔐 Security notes

- SSRF protection on every URL: protocol whitelist, private/loopback/metadata blocking,
  DNS-resolution check, per-hop redirect validation, size + time limits.
- Rate limits (DB-backed): audits, OTP, payments, admin login.
- Gemini output always Zod-validated; JSON repair + one safe retry; failures degrade honestly.
- Never store passwords in plain text; only the *fact* of password change is logged.
- Session cookies: httpOnly, SameSite=Lax, 30-day expiry, server-side rotation possible.
