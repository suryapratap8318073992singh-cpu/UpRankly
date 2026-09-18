# CURAEASE ISOLATION — READ THIS FIRST

You already run **CuraEase** (its own code, database, auth, hosting). UpRankly must never
interfere with it. This document is the hard boundary.

## Two completely separate worlds

```
CuraEase   →  CuraEase VS Code folder   →  CuraEase database   →  CuraEase Vercel project
UpRankly   →  UpRankly VS Code folder   →  UpRankly database   →  UpRankly Vercel project
```

Nothing crosses this line. Ever.

## Rules (non-negotiable)

1. **Do not open CuraEase project files while configuring UpRankly.** Work in a separate VS Code window.
2. **Do not copy CuraEase `.env` values into UpRankly.** UpRankly has its own `.env.example`.
3. **Do not use CuraEase's database URL** (or any of its keys) for UpRankly.
4. **Do not run UpRankly's schema/migrations inside CuraEase's database.**
   UpRankly's schema is from a separate codebase and creates `users`, `projects`,
   `subscriptions`, `payments`, etc. If accidentally pointed at CuraEase,
   `npx drizzle-kit push` could alter CuraEase's `users` table. **Always verify
   `DATABASE_URL` is the UpRankly database before pushing.**
5. **Do not modify CuraEase's database** (no renames, drops, alters — nothing).
6. **Do not deploy UpRankly using CuraEase's Vercel project** and never overwrite
   CuraEase's Vercel environment variables.
7. **Do not share authentication** between the two apps. UpRankly has its own user
   and admin tables in its own database.
8. **Create a new GitHub repository** named `uprankly`. Do not commit UpRankly code
   into the CuraEase repository.

## How UpRankly guarantees this by construction

- UpRankly ships **no** CuraEase code, config, keys or table references.
- Its schema only *creates new UpRankly tables* — there are no `DROP TABLE` /
  cross-project statements anywhere in the codebase.
- All credentials are read from UpRankly's own environment variables at runtime.
- The admin/user/auth systems are self-contained in this repository.

## Quick safety check before any database command

```bash
# In the UpRankly folder — this must print YOUR UPRANKLY database, nothing else:
grep DATABASE_URL .env.local
# Then, and only then:
npx drizzle-kit push
```

If the printed URL mentions a project/host that belongs to CuraEase — **stop**.
You are in the wrong file. Switch to UpRankly's `.env.local` first.
