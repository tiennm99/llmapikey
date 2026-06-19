---
title: "llmapikey — Free OpenRouter Key Giveaway Site"
description: ""
status: pending
priority: P2
branch: "master"
tags: []
blockedBy: []
blocks: []
created: "2026-06-13T04:50:23.160Z"
createdBy: "ck:plan"
source: skill
---

# llmapikey — Free OpenRouter Key Giveaway Site

## Overview

Next.js (App Router, JS + JSDoc) site on Vercel. Intended to give developers a $10/day-capped API key — one per GitHub account — minted from owner's master key, backed by a suitable provider. The original OpenRouter BYOK-backed path is pending because OpenRouter now documents a 5% BYOK fee after the first 1M BYOK requests per month. Supabase only (dedicated `llmapikey` schema in a shared project, server-only access) for auth + key records. No proxy.

**Cost model caveat (verify in Phase 1):** "free to users" — owner pays. OpenRouter BYOK still bills ~5% of model cost to OpenRouter credits and can fall back to paid endpoints, so "strictly free for the owner" is UNVERIFIED. The "$10/day" cap basis and zero-balance BYOK behavior are open questions for OpenRouter support (Phase 1). Owner's subscription cap is the global $ ceiling.

**Source:** `plans/reports/brainstorm-summary-260613-1144-openrouter-key-giveaway-website-report.md`

**GATING:** Project pending until a suitable provider is found. Runtime key creation requires `PROJECT_STATUS=live` and `PROVISIONING_ENABLED=true`. Keep both closed while provider economics are unresolved.

**Scope OUT (v1):** proxy, payments, GLM/Kimi, per-model restriction, admin analytics, star enforcement.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [ToS Approval Gate](./phase-01-tos-approval-gate.md) | Pending (BLOCKING — not started) |
| 2 | [Scaffold and Config](./phase-02-scaffold-and-config.md) | Code complete |
| 3 | [GitHub OAuth Auth Flow](./phase-03-github-oauth-auth-flow.md) | Code complete |
| 4 | [Key Provisioning](./phase-04-key-provisioning.md) | Code complete |
| 5 | [Pages and UI](./phase-05-pages-and-ui.md) | Code complete |
| 6 | [Test and Deploy](./phase-06-test-and-deploy.md) | Code+tests done; live E2E + deploy deferred |

## Implementation Status (2026-06-19)

Scaffold, app-native GitHub OAuth, DB migrations, key mint/reconcile/admin flows,
pages, and tests are code-complete in this repo, but public launch is pending.

Provider economics gate intentionally NOT cleared. Live minting is gated behind
`PROJECT_STATUS=pending` and `PROVISIONING_ENABLED=false`.

**Build/test:** historical `next build` green (7 routes); `npm test` 6 pass / 1
skip before this status update. Current verification should be rerun after every
status-gate change.

**Deviation from plan (Phase 2):** the `api_keys` table is reached via a direct
Postgres connection (`postgres` npm + `POSTGRES_URL`), NOT the service-role
supabase-js client. Reason: the plan required the `llmapikey` schema to stay
unexposed to PostgREST, but supabase-js cannot query an unexposed schema. Direct
PG keeps the schema fully hidden (a stronger realization of the same intent) and
removes the service-role blast-radius concern.

**Still requires, before public launch:** find/approve provider economics,
re-verify any OpenRouter BYOK thresholds/fees if OpenRouter remains in scope,
apply migration to a real DB, register GitHub OAuth app, set live env
(`PROJECT_STATUS=live`, `PROVISIONING_ENABLED=true`), run the RLS deny-all test
against real Supabase, create-delete round-trip on a throwaway key, manual E2E
(sign-in -> generate -> call model -> re-generate idempotent -> concurrent
double-submit = one key), dashboard verification (limit/daily-reset/billing),
and function-log redaction grep.

## Dependencies

None (greenfield, no cross-plan dependencies).

## Red Team Review

### Session — 2026-06-13
**Findings:** 15 (15 accepted, 0 rejected) — 4 reviewers (security, failure-mode, assumptions, scope)
**Severity breakdown:** 2 Critical, 4 High, 9 Medium
**Verification:** OpenRouter create/delete/BYOK + Supabase RLS claims fetched against official docs.

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Delete handle is `data.hash`, not `data.id` (revoke would silently fail) | Critical | Accept | P2, P4, P6 |
| 2 | BYOK not "free": 5% fee to credits + paid fallback; empty-balance mitigation unverified/likely false | Critical | Accept (harden P1) | P1, P4, plan |
| 3 | Mint-before-insert race leaks orphaned billable keys | High | Accept | P4 |
| 4 | RLS bypassed by service-role + `user_metadata` policy is forgeable | High | Accept | P2 |
| 5 | Identity anchor unverified — pin numeric `provider_id` | High | Accept | P3 |
| 6 | `$10/day` cost-basis (fee vs full) + midnight-UTC reset unverified | High | Accept (P1 question) | P1, P4 |
| 7 | No global ceiling / Sybil via free GitHub accounts | Medium | Accept (light guards; subscription cap = $ ceiling) | P4 |
| 8 | Revoke&regenerate is planner-introduced scope creep + unsafe | Medium | Accept (cut to v2) | P4, P5, P6 |
| 9 | Raw-key hardening: `expires_at`, no PII in name, no-log redaction | Medium | Accept | P4, P6 |
| 10 | Shared-Supabase service-role blast radius (all apps) | Medium | Accept (recommend dedicated project + `server-only`) | P2 |
| 11 | Phase 1 gate not binding; conditional approval may be design-fatal | Medium | Accept | P1 |
| 12 | Forward-only migration; RLS untested on shared DB | Medium | Accept (`.down.sql` + RLS negative test + staging) | P2, P6 |
| 13 | Mocked tests give false confidence; fold tests into build | Medium | Accept | P6 |
| 14 | Over-decomposed static components | Medium | Accept (inline) | P5 |
| 15 | Orphan reconcile script; decide WORKSPACE_ID; drop markRevoked | Medium | Accept | P2, P4 |

**Decision-touching findings surfaced (not silently flipped):** #2 (strictly-free/BYOK — folded into P1 verification, awaiting OpenRouter reply), #7 (Sybil ceiling — user's subscription cap retained as the $ bound, light app guards added), #10 (shared Supabase — user's choice kept, dedicated project recommended).

### Whole-Plan Consistency Sweep
- `data.id` → `openrouter_key_hash`/`data.hash` reconciled across P2 (schema), P4 (flow), P6 (round-trip). No `data.id` references remain.
- Revoke&regenerate removed from P4 flow, P5 UI, P6 E2E; `markRevoked` dropped from P4 repo.
- RLS: P2 deny-all + server-only is consistent with P3 (metadata used only server-side) and P4 (service-role queries).
- "Strictly free" softened in plan overview + P4 + P1; consistent.
- No unresolved contradictions.
