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

Next.js (App Router, JS + JSDoc) site on Vercel. Gives developers a $10/day-capped OpenRouter API key — one per GitHub account — minted from owner's master Provisioning key, backed by owner's BYOK monthly subscription. Supabase only (dedicated `llmapikey` schema in a shared project, server-only access) for auth + key records. No proxy: OpenRouter enforces the cap. Soft star nudge (not enforced).

**Cost model caveat (verify in Phase 1):** "free to users" — owner pays. OpenRouter BYOK still bills ~5% of model cost to OpenRouter credits and can fall back to paid endpoints, so "strictly free for the owner" is UNVERIFIED. The "$10/day" cap basis and zero-balance BYOK behavior are open questions for OpenRouter support (Phase 1). Owner's subscription cap is the global $ ceiling.

**Source:** `plans/reports/brainstorm-summary-260613-1144-openrouter-key-giveaway-website-report.md`

**GATING:** Phase 1 (ToS Approval Gate) blocks all build phases. If OpenRouter support rejects the free key-giveaway model, the plan is **cancelled** — do not build.

**Scope OUT (v1):** proxy, payments, GLM/Kimi, per-model restriction, admin analytics, star enforcement.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [ToS Approval Gate](./phase-01-tos-approval-gate.md) | Pending |
| 2 | [Scaffold and Config](./phase-02-scaffold-and-config.md) | Pending |
| 3 | [GitHub OAuth Auth Flow](./phase-03-github-oauth-auth-flow.md) | Pending |
| 4 | [Key Provisioning](./phase-04-key-provisioning.md) | Pending |
| 5 | [Pages and UI](./phase-05-pages-and-ui.md) | Pending |
| 6 | [Test and Deploy](./phase-06-test-and-deploy.md) | Pending |

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
