---
phase: 2
title: "OAuth Routes & Identity Swap"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: OAuth Routes & Identity Swap

## Overview
Wire the new flow end-to-end and flip the identity source from Supabase to the signed
cookie. After this phase the app authenticates via its own GitHub OAuth; Supabase auth
code is no longer exercised (deleted in Phase 3).

## Requirements
- Functional: `/auth/login` initiates GitHub OAuth (state cookie + redirect);
  `/auth/callback` validates state, exchanges code, fetches `/user`, mints session;
  `/auth/sign-out` clears session; `getCurrentGithubIdentity()` reads the cookie.
- Non-functional: open-redirect safe (`next` sanitized); state single-use; identity
  contract `{ githubUserId, githubUsername }` unchanged for all callers.

## Architecture
Flow: button → `GET /auth/login?next=/dashboard` (server: create state, set
`oauth_state` httpOnly cookie, 302 to GitHub authorize URL) → GitHub consent → `GET
/auth/callback?code&state` (verify state vs cookie, Arctic `validateAuthorizationCode`,
`GET https://api.github.com/user` with bearer → `{ id, login }` → `createSession` →
clear state cookie → 302 to sanitized `next`).

`getCurrentGithubIdentity()` now delegates to `readSession()` — same return shape, so
`lib/auth/admin-allowlist.js`, `app/actions/generate-key.js`, `app/actions/admin-keys.js`,
`app/dashboard/page.js`, `app/admin/page.js` need **no changes**.

**Exception — `components/site-header.js`** currently calls `createServerAuthClient()`
directly (NOT `getCurrentGithubIdentity()`), so it MUST be migrated: replace the Supabase
`getUser()` block with `const identity = await getCurrentGithubIdentity()` and use
`identity?.githubUsername`.

Middleware no longer refreshes a Supabase session (stateless JWT verified on demand). Keep
a minimal/no-op middleware or remove the file; remove the `@supabase/ssr` import either way.

## Related Code Files
- Create: `app/auth/login/route.js`
- Modify: `app/auth/callback/route.js` (rewrite: state + Arctic + `/user` + session; import shared `sanitizeNext`)
- Modify: `app/auth/sign-out/route.js` (keep `POST` + `{status:303}`; clear cookie instead of `supabase.auth.signOut()`)
- Modify: `lib/auth/current-github-identity.js` (read `readSession()`; keep numeric assert + JSDoc)
- Modify: `components/sign-in-with-github-button.js` (anchor to `/auth/login?next=…`; drop browser supabase client)
- Modify: `components/site-header.js` (use `getCurrentGithubIdentity()`; drop Supabase client)
- Modify: `middleware.js` (delete file — stateless JWT needs no refresh)

## Implementation Steps
1. `app/auth/login/route.js` (GET): derive `origin` from request; `next = sanitizeNext(query.next)`;
   `const state = generateState()` (Arctic); `oauth = getGithubOAuth(origin)`;
   `url = oauth.createAuthorizationURL(state, GITHUB_SCOPES)`; set `oauth_state` cookie
   (httpOnly, secure, lax, maxAge 600) AND `oauth_next` cookie (same attrs) via the
   `cookies()` store; `return NextResponse.redirect(url)`. (Cookies set via `cookies()`
   attach to the redirect response in route handlers.)
2. Rewrite `app/auth/callback/route.js`:
   - read `code`, `state`; read `oauth_state` cookie; if mismatch/missing → redirect `/?auth_error=1`.
   - `oauth = getGithubOAuth(origin)` (same origin as login → matching redirect_uri);
     `tokens = await oauth.validateAuthorizationCode(code)`; `access = tokens.accessToken()`.
   - `fetch('https://api.github.com/user', { headers:{ Authorization:`Bearer ${access}`,
     'User-Agent':'llmapikey' }})` → `{ id, login }`; coerce `id` to string, assert numeric.
   - `await createSession({ githubUserId:String(id), githubUsername:login })`.
   - read `next` from `oauth_next` cookie → `sanitizeNext`; clear `oauth_state` + `oauth_next`;
     redirect to `${origin}${next}`. Discard the access token (not persisted).
3. `app/auth/sign-out/route.js` (keep `POST`): `await clearSession(); return
   NextResponse.redirect(new URL('/', request.url), { status: 303 })`. Remove Supabase import.
   (Caller is a `method="post"` form in `site-header.js`; 303 turns it into a GET.)
4. `lib/auth/current-github-identity.js`: replace Supabase body with `return await
   readSession();` Keep the `GithubIdentity` typedef + numeric invariant note. Drop the
   Supabase import.
5. `components/sign-in-with-github-button.js`: replace `signInWithOAuth` with a plain
   anchor/`<a href={'/auth/login?next='+encodeURIComponent(next)}>` (or `router.push`).
   Remove `createBrowserSupabaseClient` import. Keep loading UX minimal.
6. `components/site-header.js`: replace `createServerAuthClient()`/`getUser()` with
   `const identity = await getCurrentGithubIdentity()`; `username = identity?.githubUsername`.
   Keep the try/catch (DB/config unconfigured → signed-out header). Drop Supabase import.
7. `middleware.js`: delete the file entirely (stateless JWT verified on demand; pages
   self-gate via `getCurrentGithubIdentity()`). KISS.
8. `npm run build`; manual local check deferred to Phase 3 (needs real GitHub creds).

## Success Criteria
- [ ] `/auth/login` 302s to `github.com/login/oauth/authorize` with `state` + `read:user`.
- [ ] `/auth/callback` with valid code sets `llmapikey_session` cookie and redirects to `next`.
- [ ] State mismatch/missing → redirect to `/?auth_error=1`, no session set.
- [ ] `getCurrentGithubIdentity()` returns the same shape from the cookie; admin/dashboard/
      generate-key compile and behave unchanged.
- [ ] No remaining `@supabase/ssr` import in `middleware.js`, sign-in button, or auth routes.
- [ ] `npm run build` clean.

## Risk Assessment
- **State/next cookie coupling** — keep state and next in httpOnly cookies; never trust
  query `next` without `sanitizeNext`. Mitigation: reuse existing sanitizer.
- **GitHub `/user` rate/UA** — GitHub requires a `User-Agent` header; omitting it 403s.
- **Cookie not set on redirect** — set cookies on the `NextResponse` (route handlers can
  write); verify `Set-Cookie` present on the 302.
- **Email/primary not needed** — we only read `id`+`login`; no extra `user:email` scope.

## Security Considerations
- CSRF via single-use `state` (httpOnly, 10-min TTL), compared server-side.
- Open-redirect prevented by `sanitizeNext` (same-origin relative only).
- Access token never stored or logged; lives only inside the callback request.
- Session cookie httpOnly+Secure+Lax; numeric `provider_id` re-asserted before minting.
