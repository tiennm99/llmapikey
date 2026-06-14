---
phase: 1
title: "Session & OAuth Foundation"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Session & OAuth Foundation

## Overview
Add the OAuth client + stateless session primitives the new flow stands on, with no
behavior change yet (current Supabase path keeps working). Pure additive phase.

## Requirements
- Functional: a session module that signs/verifies a JWT cookie carrying
  `{ githubUserId, githubUsername }`; a GitHub OAuth client factory (Arctic).
- Non-functional: secrets server-only; cookie httpOnly+Secure+SameSite=Lax; HS256 with
  a ≥32-byte secret; numeric-`provider_id` invariant preserved.

## Architecture
- **Session (`lib/auth/session.js`)** — jose `SignJWT`/`jwtVerify`. Cookie name
  `llmapikey_session`. Exposes `createSession(identity)`, `readSession()` (returns
  `{ githubUserId, githubUsername } | null`, swallows verify errors), `clearSession()`,
  and cookie attribute constants. Uses `next/headers` `cookies()`.
- **OAuth client (`lib/auth/github-oauth.js`)** — wraps Arctic `GitHub(clientId,
  clientSecret, `${origin}/auth/callback`)`. Exposes a `getGithubOAuth(origin)` factory
  (origin-derived callback, no callback env) + the OAuth scope constant `["read:user"]`.
- **Sanitizer (`lib/auth/sanitize-next.js`)** — extracted from the current callback route
  so both `/auth/login` and `/auth/callback` share one open-redirect guard (same-origin
  relative paths only; default `/dashboard`).
- Secrets read from env: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
  `AUTH_SESSION_SECRET`. All server-only (no `NEXT_PUBLIC_`).

## Related Code Files
- Create: `lib/auth/session.js`
- Create: `lib/auth/github-oauth.js`
- Create: `lib/auth/sanitize-next.js`
- Create: `tests/session-roundtrip.test.js`
- Modify: `package.json` (add `arctic`, `jose` — pin Arctic major: API differs across majors)
- Modify: `.env.example` (add the 3 new server-only vars; leave Supabase vars for now)

## Implementation Steps
1. `npm install arctic jose` (runtime deps).
2. `lib/auth/session.js`:
   - `import "server-only";`
   - `const secret = () => new TextEncoder().encode(process.env.AUTH_SESSION_SECRET)` —
     throw if unset/<32 bytes.
   - `createSession({ githubUserId, githubUsername })`: `new SignJWT({ login })
     .setProtectedHeader({alg:'HS256'}).setSubject(githubUserId).setIssuedAt()
     .setExpirationTime('7d').sign(secret())`, then `cookies().set(NAME, jwt, ATTRS)`.
   - `readSession()`: read cookie → `jwtVerify` → re-assert `/^\d+$/` on `sub` →
     return `{ githubUserId: payload.sub, githubUsername: payload.login }`; any
     throw/missing → `null`.
   - `clearSession()`: `cookies().delete(NAME)`.
   - `ATTRS = { httpOnly:true, secure:true, sameSite:'lax', path:'/', maxAge: 60*60*24*7 }`.
3. `lib/auth/github-oauth.js`: `getGithubOAuth(origin)` returns
   `new GitHub(id, secret, `${origin}/auth/callback`)` (throw if id/secret unset);
   export `GITHUB_SCOPES`. Also create `lib/auth/sanitize-next.js` exporting `sanitizeNext`
   (moved from the callback route).
4. `tests/session-roundtrip.test.js` (node:test): set `AUTH_SESSION_SECRET`, sign an
   identity → verify roundtrip; assert tampered token → null; assert non-numeric `sub`
   rejected; assert expired token → null.
5. Update `.env.example` with the 3 new vars + comments (server-only).
6. `npm run build` — must compile clean.

## Success Criteria
- [ ] `arctic` + `jose` in `package.json`; `npm install` clean.
- [ ] `lib/auth/session.js` and `lib/auth/github-oauth.js` compile; `server-only` guarded.
- [ ] `npm test` passes including new session roundtrip + tamper/expiry/non-numeric tests.
- [ ] No behavior change — existing Supabase auth still functions (nothing wired yet).

## Risk Assessment
- **Weak/missing `AUTH_SESSION_SECRET`** → `secret()` throws (config error), so a
  misconfig 500s any page that reads identity (incl. public landing). Intended fail-fast.
  Note the split: `readSession` swallows *token* errors (tamper/expiry → null) but lets
  *config* errors propagate. Document 32-byte requirement.
- **jose ESM** — project is `"type":"module"`, so native import is fine.
- **SameSite choice** — `Lax` required so the cookie rides the top-level GET redirect back
  from GitHub; `Strict` would drop it. Documented inline.

## Security Considerations
- Secrets never prefixed `NEXT_PUBLIC_`; `server-only` import guard on both modules.
- Preserve numeric-`provider_id` assertion at both mint and read (defense in depth).
