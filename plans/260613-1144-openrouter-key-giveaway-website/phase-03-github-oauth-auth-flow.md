---
phase: 3
title: "GitHub OAuth Auth Flow"
status: pending
priority: P1
effort: "0.5d"
dependencies: [2]
---

# Phase 3: GitHub OAuth Auth Flow

## Overview
GitHub sign-in via Supabase Auth (GitHub provider). Establish server-side session; expose `github_user_id` + `github_username` to server actions. This identity is the one-key-per-account key.

## Requirements
- Functional: user signs in with GitHub, returns authenticated; sign-out works; session readable server-side.
- Non-functional: OAuth scope minimal (`read:user`; `public_repo` only if a future star-read is added — soft nudge needs no star read, so `read:user` suffices).

## Architecture
- Supabase Auth GitHub provider. GitHub OAuth App registered with callback `https://<supabase-project>.supabase.co/auth/v1/callback`.
- Next.js: `signInWithOAuth({ provider: 'github' })` from a client button → Supabase callback → app `/auth/callback` route exchanges code for session (cookie via `@supabase/ssr`).
- **Identity anchor (pinned, not "TBD"):** `github_user_id = user_metadata.provider_id` (the **numeric, immutable** GitHub id) and `github_username = user_metadata.user_name`. Do NOT use `user_name` as the id (it's the mutable login) and do NOT use `sub` (that's the Supabase user UUID, not the GitHub id). Resolve by logging the full `user_metadata` from one real GitHub session in a Phase 3 spike, then assert the chosen field is numeric. Note `user_metadata` is end-user-mutable, so it is used only server-side to scope queries — never as an RLS authorization claim (see Phase 2 deny-all RLS).

## Related Code Files
- Create: `app/auth/callback/route.js` (code exchange)
- Create: `app/auth/sign-out/route.js`
- Create: `components/sign-in-with-github-button.js`
- Create: `lib/auth/current-github-identity.js` (server helper → `{ githubUserId, githubUsername }`)
- Modify: `app/layout.js` (session-aware header)

## Implementation Steps
1. Register GitHub OAuth App (decide owner — see Unresolved). Add client id/secret to Supabase Auth GitHub provider config (NOT app env).
2. Enable GitHub provider in Supabase dashboard.
3. Build sign-in button (client component) calling `signInWithOAuth`.
4. Implement `/auth/callback` route to exchange code → set session cookie.
5. **Spike:** sign in once, log full `session.user.user_metadata`, confirm `provider_id` is the numeric GitHub id. Pin it in `current-github-identity.js`.
6. Implement `current-github-identity.js` server helper → `{ githubUserId: provider_id, githubUsername: user_name }`.
7. Implement sign-out.

## Success Criteria
- [ ] Sign in with GitHub → authenticated session (cookie set)
- [ ] Server helper returns `githubUserId` = numeric `provider_id` (asserted numeric), `githubUsername` = `user_name`
- [ ] Test fails if stored `github_user_id` equals the login string instead of the numeric id
- [ ] Sign-out clears session
- [ ] Works on Vercel domain (callback URLs correct)

## Risk Assessment
- **Wrong identity field:** GitHub `user_name`/login is mutable → renamed account could mint a second key. Anchor on numeric `provider_id`; guard with the numeric-id assertion test above.
- **Callback URL mismatch:** Supabase callback vs app redirect — set both Supabase Site URL and additional redirect URLs for localhost + Vercel domain.
