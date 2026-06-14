---
phase: 3
title: "Cleanup Config & Deploy"
status: pending
priority: P1
effort: "2h"
dependencies: [2]
---

# Phase 3: Cleanup Config & Deploy

## Overview
Remove the dead Supabase-auth surface, reconcile config/docs/tests, provision the GitHub
OAuth App + Vercel env, and ship. End state: app authenticates entirely on its own; Supabase
is Postgres-only.

## Requirements
- Functional: no Supabase auth code/deps remain; live GitHub sign-in works end-to-end.
- Non-functional: build+tests green; secrets server-only; docs match reality.

## Architecture
Deletes `lib/supabase/*` (auth clients) and the `@supabase/*` deps. The only Supabase
touchpoint left is `POSTGRES_URL` (DB), consumed by `lib/db/postgres-client.js` — unchanged.
GitHub OAuth App callback now points at the **app** (`/auth/callback`), not Supabase.

## Related Code Files
- Delete: `lib/supabase/server-client.js`, `lib/supabase/browser-client.js` (whole `lib/supabase/`)
- Delete: `tests/rls-deny-all.test.js` (top-level imports `@supabase/supabase-js`; would fail to load once the dep is removed — DECIDED: delete)
- Modify: `package.json` (remove `@supabase/ssr`, `@supabase/supabase-js`)
- Modify: `.env.example` (remove `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`; finalize new vars)
- Modify: `README.md` (rewrite auth/setup: GitHub OAuth App callback → app domain, new env table)

## Implementation Steps
1. Delete `lib/supabase/` (both clients). Grep-confirm zero remaining imports of
   `@/lib/supabase/*`, `@supabase/ssr`, `@supabase/supabase-js` across `app/ lib/ middleware.js`.
2. `npm uninstall @supabase/ssr @supabase/supabase-js`.
3. Delete `tests/rls-deny-all.test.js` (DECIDED). Its top-level `import { createClient }
   from "@supabase/supabase-js"` would throw module-not-found once the dep is removed, even
   though the test self-skips. Isolation stays structural (unexposed schema + direct PG +
   deny-all RLS); add a README note.
4. `.env.example`: drop the two `NEXT_PUBLIC_SUPABASE_*` lines; add `GITHUB_OAUTH_CLIENT_ID`,
   `GITHUB_OAUTH_CLIENT_SECRET`, `AUTH_SESSION_SECRET` (callback is origin-derived, no env);
   keep `POSTGRES_URL`, `OPENROUTER_MANAGEMENT_KEY`, caps, `ADMIN_GITHUB_USER_IDS`.
5. `README.md`: rewrite Stack + Setup auth steps — GitHub OAuth App with callback
   `https://llmapikey.vercel.app/auth/callback`; remove Supabase Auth provider setup; note
   Supabase = Postgres only. Update Architecture "Server-only secrets" list.
6. **GitHub OAuth App**: create (or repoint) with Authorization callback
   `https://llmapikey.vercel.app/auth/callback`; copy Client ID + Secret.
7. **Vercel env** (Production): add `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
   `AUTH_SESSION_SECRET` (`openssl rand -base64 48`). Remove `NEXT_PUBLIC_SUPABASE_URL`/
   `_ANON_KEY`. (Callback is origin-derived; sign-in works only on the canonical domain
   registered in the OAuth App — non-canonical hosts fail at GitHub. Accepted.)
8. `npm run build && npm test` — all green.
9. `vercel deploy --prod --yes`; smoke-test: `/` 200, `/auth/login` 302→github, full
   sign-in lands on `/dashboard`, `/admin` 404 anon, sign-out clears cookie.

## Success Criteria
- [ ] No `@supabase/*` deps in `package.json`; `lib/supabase/` gone; zero stale imports.
- [ ] `.env.example` + `README.md` reflect app-native OAuth; no Supabase-auth references.
- [ ] `npm run build` + `npm test` pass.
- [ ] Live: GitHub sign-in completes → `/dashboard`; sign-out works; `/admin` 404 for anon.
- [ ] Vercel has the 3 new vars; Supabase anon vars removed.

## Risk Assessment
- **Cutover invalidates existing Supabase sessions** — users re-login once. Acceptable
  (gated/low usage). Communicate if needed.
- **Forgot to repoint GitHub OAuth callback** → `redirect_uri mismatch` at GitHub.
  Mitigation: step 6 before deploy; verify exact string.
- **`AUTH_SESSION_SECRET` differs Preview vs Prod** — fine (separate session domains); just
  ensure each is set or `readSession` throws.
- **Removing rls test** reduces explicit coverage of schema isolation — mitigate by a note
  in README that isolation is structural (unexposed schema + direct PG).

## Security Considerations
- Confirm no secret ever carries `NEXT_PUBLIC_`.
- Verify deployed `Set-Cookie` flags (httpOnly, Secure, SameSite=Lax) via curl.
- Keep `ADMIN_GITHUB_USER_IDS` fail-closed behavior intact (unchanged identity contract).

## Resolved Decisions
1. **rls-deny-all test** — DELETED (top-level supabase-js import breaks once dep removed; isolation is structural).
2. **Redirect URI** — origin-derived (`${origin}/auth/callback`), no callback env; sign-in works only on the canonical registered domain (deployment-hash/preview hosts fail at GitHub — accepted).
3. **middleware.js** — DELETED entirely (stateless JWT, pages self-gate).

## Open Questions
1. **GitHub OAuth App** — register a fresh app dedicated to llmapikey (recommended) vs reuse existing? (deploy-time, not code)
