# llmapikey

Pending free, capped OpenRouter API key giveaway — one key per GitHub account.

Next.js (App Router, JS + JSDoc) on Vercel. App-native GitHub OAuth (Arctic +
jose stateless signed-cookie session) — Supabase is the Postgres host only.
Per-user OpenRouter keys are minted from the owner's master Provisioning key,
each capped at a daily USD limit. Key records live in a dedicated, unexposed
`llmapikey` Postgres schema reached only by a server-side direct connection.

> **Status:** pending. Live key minting is gated behind
> `PROJECT_STATUS=pending` and `PROVISIONING_ENABLED=false` until a suitable
> provider is found. Official OpenRouter docs confirm BYOK has a 5% OpenRouter
> fee after the first 1M BYOK requests per month (requests, not tokens), so this
> giveaway is paused before public launch.

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
- **Project lifecycle gate:** `PROJECT_STATUS` defaults fail-closed to
  `pending`; the UI hides self-serve key minting/retrieval while pending, and key
  creation requires `PROJECT_STATUS=live` plus `PROVISIONING_ENABLED=true`.
- **Reserve-then-mint:** a `pending` row is inserted (ON CONFLICT DO NOTHING)
  before minting, so concurrent double-submits yield exactly one OpenRouter key.
- **Key storage:** the raw key is stored in `openrouter_key` so users can copy it
  again from the dashboard; `openrouter_delete_hash` is OpenRouter's revoke handle
  (not a hash of the key). Keys are minted into the `OPENROUTER_WORKSPACE_ID`
  workspace.
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
   | `OPENROUTER_WORKSPACE_ID` | Workspace minted keys are created in (create-key `workspace_id`); omit for the management key's default |
   | `PROJECT_STATUS` | `pending` until a suitable provider is found; only `live` can enable the product |
   | `PROVISIONING_ENABLED` | Lower-level minting flag; must be `true` in addition to `PROJECT_STATUS=live` |
   | `MAX_TOTAL_KEYS` | Kill-switch: stop minting past N active keys |
   | `KEY_DAILY_LIMIT_USD` | Per-key daily cap sent to OpenRouter |
   | `KEY_EXPIRY_DAYS` | Key lifetime (sets `expires_at`) |
   | `ADMIN_GITHUB_USER_IDS` | Admin allowlist — numeric GitHub `provider_id`s, CSV (server-only) |
3. **Database** — apply all migrations in order to a **staging branch first**,
   then prod (Supabase SQL editor, `psql "$POSTGRES_URL" -f ...`, or
   `node --env-file=.env.local scripts/run-migration.mjs <file>`):
   ```bash
   psql "$POSTGRES_URL" -f supabase/migrations/0001_llmapikey_schema_and_api_keys.up.sql
   psql "$POSTGRES_URL" -f supabase/migrations/0002_api_keys_store_raw_key.up.sql
   psql "$POSTGRES_URL" -f supabase/migrations/0003_rename_key_hash_to_delete_hash.up.sql
   ```
   Do NOT add `llmapikey` to the project's PostgREST "Exposed schemas".
   Rollback: run the matching `*.down.sql` files in reverse order (0003 → 0001).
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

## OpenRouter BYOK finding

As of 2026-06-19, the rendered official OpenRouter docs say BYOK usage has a
fee after the monthly waiver: the first 1M BYOK requests per month are free,
then OpenRouter charges 5% of what the same model/provider would normally cost
on OpenRouter, deducted from OpenRouter credits. This is documented as requests,
not tokens.

Independent research also confirmed the policy shape (request-based monthly
waiver, then percentage fee from OpenRouter credits), but saw placeholders in
OpenRouter's markdown docs for the exact threshold/percentage. Re-verify the
rendered docs or ask OpenRouter support before setting `PROJECT_STATUS=live`.

Implication: the public free-key giveaway stays pending until a provider can
support the intended economics without surprise pass-through charges. See
[`docs/project-status.md`](docs/project-status.md).

Sources:

- https://openrouter.ai/docs/guides/overview/auth/byok
- https://openrouter.ai/docs/faq

## Deploy (gated)

Git-triggered builds on Vercel are enabled (`vercel.json` →
`git.deploymentEnabled: true`). Builds and deploys do NOT start the giveaway:
live key minting is gated independently by `PROJECT_STATUS` and
`PROVISIONING_ENABLED`. Keep `PROJECT_STATUS=pending` and
`PROVISIONING_ENABLED=false` in the Vercel environment until provider economics
are accepted; only then set `PROJECT_STATUS=live` and `PROVISIONING_ENABLED=true`
to begin minting.
