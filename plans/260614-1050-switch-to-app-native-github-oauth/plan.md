---
title: "Switch auth: Supabase Auth → app-native GitHub OAuth (Arctic + jose)"
description: "Replace Supabase Auth (GitHub provider) with self-contained GitHub OAuth handled in the Next.js app. Stateless signed-cookie session. Removes shared-Supabase coupling; Supabase becomes Postgres-only."
status: in-progress
priority: P2
branch: "master"
tags: [auth, oauth, github, security, nextjs]
blockedBy: []
blocks: []
created: "2026-06-14T03:52:45.628Z"
createdBy: "ck:plan"
source: skill
---

# Switch auth: Supabase Auth → app-native GitHub OAuth (Arctic + jose)

## Overview

Today auth is brokered by Supabase (GitHub provider → Supabase `/auth/v1/callback` →
app). Supabase is used **only** for auth — data is direct Postgres to the unexposed
`llmapikey` schema. This plan replaces Supabase Auth with GitHub OAuth handled in-app
(GitHub → `llmapikey.vercel.app/auth/callback`), using **Arctic** for the OAuth2 dance
and **jose** for a stateless signed-cookie session. Net effect: per-app user isolation,
one fewer redirect hop, no shared `auth.users`/JWT/rate-limit pool, and Supabase
downgraded to "just the DB host".

Identity contract is preserved: `getCurrentGithubIdentity()` keeps returning
`{ githubUserId, githubUsername }` (numeric `provider_id` anchor), so admin allowlist,
key minting, and dashboard are untouched downstream.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Session & OAuth Foundation](./phase-01-session-oauth-foundation.md) | Done |
| 2 | [OAuth Routes & Identity Swap](./phase-02-oauth-routes-identity-swap.md) | Done |
| 3 | [Cleanup Config & Deploy](./phase-03-cleanup-config-deploy.md) | Code done; deploy steps (OAuth App, Vercel env, prod deploy) pending |

## Key Decisions

- **Stateless session** — signed JWT (HS256, jose) in an httpOnly cookie. No DB session
  table (app has no user table; identity = `provider_id` + login). Re-login on expiry.
- **No token storage** — `read:user` scope only; fetch `/user` once at callback, derive
  id+login, discard the access token. Nothing to refresh.
- **CSRF** — Arctic `state` stored in a short-lived httpOnly cookie, verified at callback.
- **Origin-derived redirect URI** — `${origin}/auth/callback`, built from the request
  origin (no callback env). GitHub validates it against the OAuth App's single registered
  callback, so sign-in works only when the app is reached on its canonical registered host;
  non-canonical hosts (Vercel deployment-hash / preview URLs) fail at GitHub — accepted, we
  link only the canonical domain. Login + callback pass the same origin so `redirect_uri`
  matches across authorize + token-exchange. The post-login `next` redirect also uses origin.

## Dependencies

- **Supersedes** the auth design in `project:260613-1144-openrouter-key-giveaway-website`
  (that plan is effectively built/deployed; only its Supabase-auth choice is replaced here).
  No hard block — the live site keeps working through cutover.
- **No impact** on `project:260613-2033-admin-management-crud` (completed) — admin authz
  reads the unchanged `getCurrentGithubIdentity()` contract.
