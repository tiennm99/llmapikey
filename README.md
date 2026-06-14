# llmapikey

Free, capped OpenRouter API key giveaway — one key per GitHub account.

Next.js (App Router, JS + JSDoc) on Vercel. App-native GitHub OAuth (Arctic +
jose stateless signed-cookie session) — Supabase is the Postgres host only.
Per-user OpenRouter keys are minted from the owner's master Provisioning key,
each capped at a daily USD limit. Key records live in a dedicated, unexposed
`llmapikey` Postgres schema reached only by a server-side direct connection.

> **Status:** code build only. Live key minting is gated behind
> `PROVISIONING_ENABLED=false` until the OpenRouter ToS approval gate (plan
> Phase 1) clears. Do not deploy a public giveaway before that.

## Stack

- **Next.js 15** App Router, plain JS + JSDoc (no TypeScript)
- **App-native GitHub OAuth** — [Arctic](https://arcticjs.dev) for the OAuth2
  dance, [jose](https://github.com/panva/jose) for a stateless HS256 signed-cookie
  session. No auth provider; GitHub → `/auth/callback` directly. `read:user` scope
  only; the access token is read once and discarded (no token storage).
- **Postgres** (`postgres` npm) — direct connection to the unexposed `llmapikey`
  schema; the anon role can never reach `api_keys`. (Supabase = DB host only.)
- **OpenRouter Provisioning API** — mints per-user keys

## Architecture notes

- **Identity anchor:** the numeric, immutable GitHub `provider_id` (not the
  mutable login). One key per `github_user_id`, enforced by a DB unique constraint.
- **Server-only secrets:** `POSTGRES_URL`, `OPENROUTER_MANAGEMENT_KEY`,
  `GITHUB_OAUTH_CLIENT_SECRET`, and `AUTH_SESSION_SECRET` are guarded by the
  `server-only` package and never reach the client bundle (no `NEXT_PUBLIC_`).
- **Stateless session:** signed JWT (HS256) in an httpOnly+Secure+SameSite=Lax
  cookie; no DB session table. CSRF handled by a single-use `state` cookie
  verified at the callback; `next` redirects pass through a same-origin sanitizer.
- **Schema isolation is structural:** the `llmapikey` schema is unexposed to
  PostgREST and reached only via the direct PG client (deny-all RLS as defense in
  depth). The app ships no anon DB client, so the isolation holds by construction.
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
   | `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth App client id (server-only) |
   | `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth App client secret (server-only) |
   | `AUTH_SESSION_SECRET` | Session JWT signing secret, ≥32 bytes (`openssl rand -base64 48`) |
   | `POSTGRES_URL` | Supabase **transaction pooler** string (server-only; provisioned by the Supabase Vercel integration) |
   | `OPENROUTER_MANAGEMENT_KEY` | Master management/provisioning key (server-only) |
   | `PROVISIONING_ENABLED` | `false` until Phase 1 ToS gate clears |
   | `MAX_TOTAL_KEYS` | Kill-switch: stop minting past N active keys |
   | `KEY_DAILY_LIMIT_USD` | Per-key daily cap sent to OpenRouter |
   | `KEY_EXPIRY_DAYS` | Key lifetime (sets `expires_at`) |
   | `ADMIN_GITHUB_USER_IDS` | Admin allowlist — numeric GitHub `provider_id`s, CSV (server-only) |
3. **Database** — apply the migration to a **staging branch first**, then prod
   (Supabase SQL editor or `psql "$POSTGRES_URL" -f ...`):
   ```bash
   psql "$POSTGRES_URL" -f supabase/migrations/0001_llmapikey_schema_and_api_keys.up.sql
   ```
   Do NOT add `llmapikey` to the project's PostgREST "Exposed schemas".
   Rollback: `...0001_...down.sql`.
4. **GitHub OAuth App** — register one at GitHub > Settings > Developer settings >
   OAuth Apps. Authorization callback URL points at the **app** (not Supabase):
   `https://llmapikey.vercel.app/auth/callback` for prod (use a separate dev app
   with `http://localhost:3000/auth/callback` for local). Copy the Client ID +
   Secret into `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`. The callback
   is derived from the request origin at runtime, so no callback env is needed —
   but reach the app on its **canonical domain** (the one registered above);
   GitHub rejects sign-in arriving on any other host (e.g. Vercel deployment-hash
   or preview URLs).
5. **Run**
   ```bash
   npm run dev      # http://localhost:3000
   npm test         # unit tests
   ```

## Deploy (gated)

Git-triggered builds on Vercel are enabled (`vercel.json` →
`git.deploymentEnabled: true`). Builds and deploys do NOT start the giveaway:
live key minting is gated independently by `PROVISIONING_ENABLED`. Keep
`PROVISIONING_ENABLED=false` in the Vercel environment until the Phase 1
OpenRouter ToS gate clears; only then set it `true` to begin minting.
