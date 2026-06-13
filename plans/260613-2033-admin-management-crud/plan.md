---
title: "Admin management (api_keys registry CRUD)"
description: "Env-allowlisted admin console to list/search/revoke and manually mint OpenRouter keys."
status: completed
priority: P2
effort: 6h
branch: master
tags: [admin, authz, crud, nextjs, security]
created: 2026-06-13
---

# Admin management — api_keys registry CRUD

Small, gated admin console over `llmapikey.api_keys`. CRUD = **C**reate (manual
mint for a user), **R**ead (list + search + filter + paginate), **D**elete
(revoke). No update-limits endpoint (**YAGNI** — revoke + recreate covers it).

Authz is **env-allowlist only** (`ADMIN_GITHUB_USER_IDS`) against the existing
numeric `provider_id` identity anchor — **no DB role column, no migration**.
Route `/admin` is unlisted (no nav link) and returns `notFound()` for
non-admins (never a redirect that would leak its existence). Every server action
re-gates server-side; SQL is parameterized; raw keys are never read or logged.

## Phases

| # | Phase | Status | Depends on |
|---|-------|--------|-----------|
| 01 | [Admin authz (`is-admin.js`)](phase-01-admin-authz.md) | completed | — |
| 02 | [Repository queries (list/count/find/delete)](phase-02-repository-queries.md) | completed | — |
| 03 | [Admin server actions (revoke / create)](phase-03-admin-server-actions.md) | completed | 01, 02 |
| 04 | [Admin UI (`/admin` + components)](phase-04-admin-ui.md) | completed | 01, 02, 03 |
| 05 | [Env, docs & tests](phase-05-env-docs-tests.md) | completed | 01–04 |

## Implementation note (completed)

Pure logic was split into `server-only`-free modules so `node --test` can import
it (the codebase convention — `server-only` throws under plain node):
- `lib/auth/admin-allowlist.js` (`parseAdminIds`/`isAdmin`) ← `is-admin.js` re-exports + adds `requireAdminIdentity`.
- `lib/keys/admin-keys-filters.js` (`buildFilterDescriptor`/`clampInt`) ← consumed by `admin-keys-queries.js`.

Verified: `npm test` 21 pass / 1 skip (Supabase-gated); `npm run build` clean; code review found zero blocking issues.

## Key decisions

- **No migration.** Allowlist lives in env; identity anchor reused as-is.
- **Shared mint logic.** Extract the existing `mintAndPersist` + helpers from
  `app/actions/generate-key.js` into `lib/keys/mint-key.js` (DRY), imported by
  both `generate-key.js` and the new `admin-keys.js`. generate-key behavior
  must stay byte-for-byte identical.
- **Repo split.** Admin read/search queries go in a new
  `lib/keys/admin-keys-queries.js` so `api-keys-repository.js` stays <200 lines.
- **Excluded (YAGNI):** edit-limits / update endpoint, bulk ops, audit log,
  CSV export, role table, per-admin scoping.

## File ownership (no overlap across parallel work)

- Phase 01: `lib/auth/is-admin.js`
- Phase 02: `lib/keys/admin-keys-queries.js`, `lib/keys/api-keys-repository.js`
- Phase 03: `app/actions/admin-keys.js`, `lib/keys/mint-key.js`,
  `app/actions/generate-key.js` (refactor only)
- Phase 04: `app/admin/page.js`, `components/admin/*`, `app/globals.css`
- Phase 05: `.env.example`, `README.md`, `tests/*.test.js`, `docs/*`

Phases 01 & 02 are independent → parallelizable. 03 depends on both. 04 on 03.

## Global success criteria

- Non-admin hitting `/admin` or any admin action gets `notFound()` / rejection.
- List/search/filter/paginate works; counts header accurate.
- Revoke removes the OpenRouter key (idempotent) and the DB row.
- Manual mint reuses reserve→mint→activate, honoring gates.
- `npm test` green; no raw key in any log/response except one-time create display.
