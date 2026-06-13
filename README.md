# llmapikey

Free, capped OpenRouter API key giveaway — one key per GitHub account.

Next.js (App Router, JS + JSDoc) on Vercel. GitHub sign-in via Supabase Auth.
Per-user OpenRouter keys are minted from the owner's master Provisioning key,
each capped at a daily USD limit. Key records live in a dedicated, unexposed
`llmapikey` Postgres schema reached only by a server-side direct connection.

> **Status:** code build only. Live key minting is gated behind
> `PROVISIONING_ENABLED=false` until the OpenRouter ToS approval gate (plan
> Phase 1) clears. Do not deploy a public giveaway before that.

## Stack

- **Next.js 15** App Router, plain JS + JSDoc (no TypeScript)
- **Supabase Auth** — GitHub OAuth provider (sessions via `@supabase/ssr`)
- **Postgres** (`postgres` npm) — direct connection to the unexposed `llmapikey`
  schema; the anon role can never reach `api_keys`
- **OpenRouter Provisioning API** — mints per-user keys

## Architecture notes

- **Identity anchor:** the numeric, immutable GitHub `provider_id` (not the
  mutable login). One key per `github_user_id`, enforced by a DB unique constraint.
- **Server-only secrets:** `DATABASE_URL` and `OPENROUTER_PROVISIONING_KEY` are
  guarded by the `server-only` package and never reach the client bundle.
- **Reserve-then-mint:** a `pending` row is inserted (ON CONFLICT DO NOTHING)
  before minting, so concurrent double-submits yield exactly one OpenRouter key.
- **Schema isolation:** `llmapikey` is NOT added to PostgREST exposed schemas;
  RLS is deny-all as defense in depth.
- **Admin console:** route `/admin` (unlisted — no nav link) lists, searches,
  filters, revokes, and manually mints keys. Access is gated by the
  `ADMIN_GITHUB_USER_IDS` allowlist against the same numeric `provider_id`
  anchor; non-admins get `notFound()` (a 404, never a redirect that would leak
  the route's existence). Every admin server action re-checks the allowlist
  server-side, so the page gate is defense-in-depth only.

## Setup

1. **Install**
   ```bash
   npm install
   ```
2. **Environment** — copy `.env.example` to `.env.local` and fill in values.
   | Var | Purpose |
   |-----|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, auth UI only) |
   | `DATABASE_URL` | Supabase **transaction pooler** string (server-only) |
   | `OPENROUTER_PROVISIONING_KEY` | Master Provisioning key (server-only) |
   | `NEXT_PUBLIC_REPO_URL` | Repo URL for the soft star nudge |
   | `NEXT_PUBLIC_OPENROUTER_MODEL` | Model id shown in `/docs` |
   | `PROVISIONING_ENABLED` | `false` until Phase 1 ToS gate clears |
   | `MAX_TOTAL_KEYS` | Kill-switch: stop minting past N active keys |
   | `KEY_DAILY_LIMIT_USD` | Per-key daily cap sent to OpenRouter |
   | `KEY_EXPIRY_DAYS` | Key lifetime (sets `expires_at`) |
   | `ADMIN_GITHUB_USER_IDS` | Admin allowlist — numeric GitHub `provider_id`s, CSV (server-only) |
3. **Database** — apply the migration to a **staging branch first**, then prod
   (Supabase SQL editor or `psql "$DATABASE_URL" -f ...`):
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_llmapikey_schema_and_api_keys.up.sql
   ```
   Do NOT add `llmapikey` to the project's PostgREST "Exposed schemas".
   Rollback: `...0001_...down.sql`.
4. **GitHub OAuth** — register a GitHub OAuth App; set the client id/secret in
   the Supabase dashboard (Auth > Providers > GitHub), callback
   `https://<project>.supabase.co/auth/v1/callback`. Add localhost + your Vercel
   domain to Supabase Auth redirect URLs.
5. **Run**
   ```bash
   npm run dev      # http://localhost:3000
   npm test         # unit tests
   ```

## Deploy (gated)

Auto-build on Vercel is intentionally disabled (see `vercel.json`). Promote
manually once the Phase 1 ToS gate clears and `PROVISIONING_ENABLED=true`.
