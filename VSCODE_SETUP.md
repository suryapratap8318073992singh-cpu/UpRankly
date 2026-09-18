# UpRankly — VS Code Setup Guide (beginner friendly)

Follow these steps exactly. Keep your other projects closed while doing this.

## 1. Create the folder

Create a new empty folder anywhere (e.g. `Documents/UpRankly`). Do **not** create it inside
any other project's folder.

## 2. Open it in VS Code

`File → Open Folder… → UpRankly`. Open a **new VS Code window** just for UpRankly.

## 3. Put this code in the folder

Copy all project files (the `src/`, `README.md`, `.env.example`, etc.) into this folder,
keeping the same structure. If you received a zip/git repo, extract/clone here.

## 4. Open the VS Code terminal

Menu: `Terminal → New Terminal`. Make sure the path shown is your `UpRankly` folder.

## 5. Install dependencies

```bash
npm install
```

## 6. Create your environment file

```bash
cp .env.example .env.local      # macOS / Linux
copy .env.example .env.local    # Windows
```

## 7. Fill in `.env.local`

Open `.env.local` in VS Code and set:

| Key | What to put |
|---|---|
| `DATABASE_URL` | Local Postgres (e.g. `postgresql://postgres:postgres@127.0.0.1:5432/uprankly_db`) **or** the connection string of a **brand-new** Supabase project (see `UPRANKLY_SUPABASE_SETUP.md`). |
| `ADMIN_EMAIL` | Your admin email, e.g. `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | A long random password (used only for the first admin login) |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/app/apikey |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for now |
| `CRON_SECRET` | Any long random string |

## 8. Create the local database (skip if using Supabase)

```bash
# Postgres must be installed and running locally
createdb uprankly_db        # or: psql -c "CREATE DATABASE uprankly_db;"
```

## 9. Apply the schema

```bash
# CHECK FIRST: your .env.local DATABASE_URL must point to the UpRankly database
npx drizzle-kit push
```

## 10. Run the app

```bash
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin/login (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

## Files you may need to edit manually

| File | Why |
|---|---|
| `.env.local` | Your secrets (never commit it) |
| Admin → Settings (in the app) | Prices, contact info, UPI details, site name, AI toggles |
| `src/lib/gemini.ts` | Only if you want a different Gemini model (`GEMINI_MODEL` env) |

## Common issues

- **`DATABASE_URL is required`** → `.env.local` missing or empty. Create it (step 6–7) and restart.
- **OTP code shows on screen instead of email** → expected in dev; configure `OTP_EMAIL_WEBHOOK_URL` to deliver real emails.
- **AI strategy says "not configured"** → add `GEMINI_API_KEY` and restart. Deterministic audits keep working either way.
