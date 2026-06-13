---
phase: 2
title: "Scaffold and Config"
status: pending
priority: P1
effort: "0.5d"
dependencies: [1]
---

# Phase 2: Scaffold and Config

## Overview
Stand up the Next.js (App Router, JS + JSDoc) project, Supabase clients, the dedicated `llmapikey` Postgres schema + `api_keys` table + RLS, and Vercel env wiring. No feature logic yet.

## Requirements
- Functional: app boots locally and on Vercel; Supabase reachable; schema migrated.
- Non-functional: JS + JSDoc (no TypeScript); secrets server-only; files < 200 LOC.

## Architecture
- Next.js App Router, plain JS with JSDoc typedefs (`@typedef`, `@param`, `@returns`).
- Supabase: two clients — browser (anon key, for **auth UI only** — never queries `api_keys`) and server (service-role, server-only). Use `@supabase/ssr` for cookie-based sessions.
- **Access model = server-only.** All `api_keys` reads/writes go through the service-role server client. The `api_keys` table is NEVER exposed to the anon role: do NOT add `llmapikey` to PostgREST exposed schemas. RLS = **deny-all** (enable RLS, no permissive policies → anon/authenticated get nothing; service-role bypasses RLS). This avoids the forgeable-`user_metadata` RLS trap (user_metadata is end-user-mutable per Supabase docs) and removes dead RLS machinery.
- **Schema isolation:** all objects in dedicated `llmapikey` schema. NOTE (blast radius): the service-role key bypasses RLS for the **entire shared project**, not just `llmapikey` — schema isolation does not contain a service-role compromise. Recommendation: prefer a dedicated Supabase project for this spending-key registry; if shared is kept (user's choice), enforce server-only via the `server-only` npm package on the service-role module (compile-time guard, not just convention).
- Secrets in Vercel env (and `.env.local` for dev): `OPENROUTER_PROVISIONING_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_OAUTH_*` (configured in Supabase, not app), `NEXT_PUBLIC_REPO_URL`. `OPENROUTER_WORKSPACE_ID` only if Phase 1 confirms workspaces are used — otherwise omit (no maybe-vars).

## Related Code Files
- Create: `package.json`, `next.config.mjs`, `jsconfig.json`
- Create: `app/layout.js`, `app/page.js` (placeholder)
- Create: `lib/supabase/server-client.js` (imports `server-only`), `lib/supabase/browser-client.js`
- Create: `supabase/migrations/0001_llmapikey_schema_and_api_keys.up.sql` + matching `.down.sql`
- Create: `.env.example` (names only, no secrets), `.gitignore` already present
- Create: `README.md` (update existing — setup + env doc)

## Implementation Steps
1. `npx create-next-app` (JS, App Router, no TS). Strip boilerplate.
2. Add `@supabase/supabase-js` + `@supabase/ssr`. Create browser + server client modules with JSDoc.
3. Write migration SQL (`.up.sql`):
   - `create schema if not exists llmapikey;`
   - `create table llmapikey.api_keys (id uuid pk default gen_random_uuid(), github_user_id text unique not null, github_username text not null, openrouter_key_hash text, status text not null default 'pending', created_at timestamptz default now());` — note: `openrouter_key_hash` (the OpenRouter delete handle, NOT `id`), nullable, default status `pending` to support reserve-then-mint (Phase 4). Add a `key_hint` column for last-4 display.
   - `alter table llmapikey.api_keys enable row level security;` with **NO policies** → deny-all to anon/authenticated; service-role bypasses. Do not write a `user_metadata`-based policy.
   - Write paired `.down.sql` (drop table + schema) for rollback.
4. Apply `.up.sql` to a Supabase **branch/staging DB first**, then production (SQL editor or `supabase db push`). Shared project → never run untested DDL straight at prod.
5. Add `.env.example`; document each var in README.
6. Deploy skeleton to Vercel; set env vars; confirm build green.

## Success Criteria
- [ ] App runs locally (`next dev`) and deploys green on Vercel
- [ ] `llmapikey.api_keys` exists with unique `github_user_id`, `openrouter_key_hash` column, RLS enabled with deny-all (no policies)
- [ ] Server client uses service-role, imports `server-only`, and is never imported into client components
- [ ] `llmapikey` schema NOT added to PostgREST exposed schemas
- [ ] `.up.sql` + `.down.sql` both present; migration applied to staging before prod
- [ ] `.env.example` documents all vars; no secret committed; no `OPENROUTER_WORKSPACE_ID` unless Phase 1 confirmed workspaces

## Risk Assessment
- **Service-role blast radius (shared project):** service-role bypasses RLS for ALL apps in the shared project. Mitigate with `server-only` import guard (compile-time) + recommend dedicated project. RLS deny-all is defense-in-depth, not the primary control — the server action scoping by session identity IS the control.
- **Untested DDL on shared prod DB:** always apply to staging/branch first; keep `.down.sql` for rollback (Vercel rollback does not revert DB).
