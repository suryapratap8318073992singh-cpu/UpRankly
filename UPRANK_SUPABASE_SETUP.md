# UpRankly — Fresh Database Setup (Supabase option)

> **Tenet #1:** UpRankly uses its OWN database. If you choose Supabase as your Postgres host,
> it must be a **brand-new Supabase project created only for UpRankly**. This guide keeps your
> other projects completely untouched.

UpRankly talks to Postgres directly (Drizzle). A new Supabase project gives you a perfectly
isolated Postgres database — you only need its connection string. You do **not** need to reuse
any other project's URL, anon key, service role key, auth or storage.

---

### Step 1 — Open Supabase

Go to https://supabase.com/dashboard and sign in.

### Step 2 — Create a completely NEW project

- Click **New project**
- Name: `UpRankly` (or `uprankly-prod`)
- Choose a **strong, unique database password** (save it — you'll need it for the URL)
- Region: closest to your users

> Do **not** select any existing project. Do **not** reuse an existing project's database.

### Step 3 — DO NOT run UpRankly SQL anywhere else

UpRankly schema is applied with `npx drizzle-kit push` and it **creates only UpRankly tables**
(`users`, `projects`, `subscriptions`, `payments`, `seo_audits`, …). It contains **no**
`DROP TABLE`, **no** `ALTER` of unknown tables, **no** schema wipes. Even so: run it **only**
while your `.env.local` points at the new UpRankly database. Double-check `DATABASE_URL`
before every push.

### Step 4 — Get the connection string

In the **new UpRankly project**:

1. Project Settings → **Database**
2. Find **Connection string → URI**
3. It looks like:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`
4. Paste it into **UpRankly's** `.env.local` as `DATABASE_URL` with the password you set in Step 2.

### Step 5 — Configure environment

In UpRankly's `.env.local` (this project folder only):

```env
DATABASE_URL=postgresql://postgres:YOUR-NEW-UPRANKLY-DB-PASSWORD@db.YOUR-NEW-REF.supabase.co:5432/postgres
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=choose-a-long-random-password
GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any-long-random-string
```

You need exactly **one** secret from Supabase for this architecture: the Postgres connection
string shown above. (The Supabase anon/service-role keys are for apps using the Supabase JS
client — UpRankly deliberately keeps its own server-side auth, so there is **nothing** to copy
from any other project and **no** service-role key that could leak to the browser.)

### Step 6 — Apply the schema

From the UpRankly folder:

```bash
npx drizzle-kit push
```

Expected: all UpRankly tables created inside the **new UpRankly database only**.

### Step 7 — Run UpRankly independently

Open the `UpRankly` folder in its own VS Code window, `npm install`, `npm run dev`.

### Step 8 — Never touch your other project

- Do not modify any other project's `.env.local`
- Do not point UpRankly at any other project's database URL
- Do not deploy UpRankly into any other project's Vercel project
- Do not run UpRankly migrations while connected to any other database
