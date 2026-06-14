---
title: OpenRouter workspace-scoped key minting
description: >-
  Mint per-user OpenRouter keys into a specific workspace via the create-key
  workspace_id field, with a non-PII name. Config-driven
  (OPENROUTER_WORKSPACE_ID).
status: completed
priority: P2
branch: master
tags:
  - openrouter
  - provisioning
  - keys
  - config
blockedBy: []
blocks: []
created: '2026-06-14T05:28:46.125Z'
createdBy: 'ck:plan'
source: skill
---

# OpenRouter workspace-scoped key minting

## Overview

Minted keys currently land in the management key's **default** workspace because the
create-key request omits `workspace_id`. OpenRouter's `POST /api/v1/keys` accepts an optional
`workspace_id` (UUID); management keys act account-wide across workspaces (research report:
`plans/reports/from-researcher-to-planner-260614-1224-openrouter-workspace-scoped-key-minting-report.md`).
Add `workspace_id` to the request (sourced from a new `OPENROUTER_WORKSPACE_ID` env, default
`33179556-3ab3-40a4-af8b-211d322aa94e`) and tidy the key name to a non-PII
`llmapikey/gh-${githubUserId}`. Small, config-driven, no new dependency.

## Key Decisions

- **No SDK** — the official `@openrouter/sdk` (v0.12 beta) exposes only `chat`/`byok`/`files`,
  **no key-management resource**. Keep the existing raw `fetch`, which already matches the API
  ref. (Verified during research.)
- **Workspace id is config, not hardcoded** — `OPENROUTER_WORKSPACE_ID` env with the UUID as
  default. Parallels `KEY_DAILY_LIMIT_USD` etc.; lets staging/prod differ; keeps the literal
  out of code.
- **Name stays non-PII** — anchor on the numeric immutable GitHub id; never the login.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Implement](./phase-01-implement.md) | Completed |
| 2 | [Verify & Docs](./phase-02-verify-docs.md) | Completed |

## Dependencies

- Reads the unchanged identity contract; no impact on the auth migration plan.
- Out of scope: live DB error `relation "llmapikey.api_keys" does not exist` is an unapplied
  migration (`supabase/migrations/0001_...up.sql`), not a code issue.
