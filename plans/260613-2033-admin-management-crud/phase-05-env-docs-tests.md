# Phase 05 — Env, docs & tests

**Context:** [plan.md](plan.md) · `.env.example`, `README.md` · test pattern `tests/mask-helper.test.js`, `tests/rls-deny-all.test.js`

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Document `ADMIN_GITHUB_USER_IDS`, note `/admin` is unlisted &
  gated, and add `node --test` coverage for authz parsing/matching, repo query
  shape, and the action authz guard. Update `docs/` per documentation rules.

## Key Insights
- `.env.example` uses commented sections; add admin var under a new "Admin"
  block. README has an env table (`README.md:40-51`) — add a row there.
- Tests are `node:test` + `node:assert/strict`, real logic, skip gracefully when
  external creds absent (`rls-deny-all.test.js:17-20`). No mocks-for-show.
- `isAdmin`/`parseAdminIds` are pure (env only) → fully unit-testable by setting
  `process.env.ADMIN_GITHUB_USER_IDS` per case.
- Action authz guard test: call `revokeKey`/`adminCreateKey` with no admin env
  (and/or no session) → expect rejection result and **no** DB/OpenRouter call.
  Since actions read `requireAdminIdentity()` (which calls Supabase), test the
  guard at the `isAdmin` boundary directly, or skip-when-no-DB for the full path.
- Repo query-shape test: assert the parameterized query builder produces the
  expected fragments for each `status`/`q` combination without hitting the DB —
  if the builder is internal, export a tiny pure `whereClause`-describing helper
  for testability, OR run against a real DB gated like `rls-deny-all`.

## Requirements
**Functional**
- `.env.example`: add `ADMIN_GITHUB_USER_IDS=` with a comment (numeric
  `provider_id`s, comma-separated, empty = no admins).
- `README.md`: add env-table row + a short "Admin console" note (route `/admin`,
  unlisted, gated, `notFound()` for non-admins).
- Tests:
  - `tests/is-admin.test.js` — `parseAdminIds` (empty, whitespace, multiple,
    trailing commas) + `isAdmin` (match, non-match, null identity, substring
    non-match like `"4"` vs `"42"`).
  - `tests/admin-keys-queries.test.js` — filter/search query shape per
    `status`/`q` combo (pure builder) — skip path if it requires a live DB.
  - `tests/admin-keys-authz.test.js` — guard rejects non-admin (no side effects).

**Non-functional**
- Tests deterministic; restore `process.env` after each case.

## Architecture
```
env doc ──▶ .env.example (+comment) , README env table (+row) , README admin note
tests   ──▶ is-admin (pure) | queries shape (pure or DB-gated) | action guard
docs    ──▶ docs/system-architecture.md (admin authz boundary), codebase-summary
```

## Related Code Files
- **Modify:** `.env.example`, `README.md`
  (no `docs/` directory exists in this repo — README is the single doc surface;
  do NOT scaffold a docs tree for this small feature, YAGNI)
- **Create:** `tests/is-admin.test.js`, `tests/admin-keys-queries.test.js`,
  `tests/admin-keys-authz.test.js`
- **Read for pattern:** `tests/mask-helper.test.js`, `tests/rls-deny-all.test.js`
- **Delete:** none

## Implementation Steps
1. `.env.example`: append Admin section:
   `# Comma-separated numeric GitHub provider_ids granted /admin access. Empty = no admins.`
   then `ADMIN_GITHUB_USER_IDS=`.
2. `README.md`: add table row `| ADMIN_GITHUB_USER_IDS | Admin allowlist (numeric provider_ids, CSV) |`
   and a 2-3 line "Admin console" paragraph (unlisted, gated, notFound).
3. `tests/is-admin.test.js`: set/restore `process.env.ADMIN_GITHUB_USER_IDS`;
   assert `parseAdminIds` + `isAdmin` cases incl. substring-non-match.
4. `tests/admin-keys-queries.test.js`: assert builder output per filter combo;
   if it needs a DB, gate with `skip: !process.env.DATABASE_URL` and assert real
   list/count behavior on a staging DB.
5. `tests/admin-keys-authz.test.js`: with empty allowlist, assert
   `revokeKey`/`adminCreateKey` return error and perform no mutation (verify via
   the pure guard, or DB-gated with row-count assertion).
6. Run `npm test` — all green (skips where creds absent).

## Todo
- [ ] `.env.example` admin var + comment
- [ ] README env row + admin console note
- [ ] `tests/is-admin.test.js`
- [ ] `tests/admin-keys-queries.test.js`
- [ ] `tests/admin-keys-authz.test.js`
- [ ] `npm test` green

## Success Criteria
- `npm test` passes locally and in CI (skips DB/Supabase tests when no creds).
- `parseAdminIds`/`isAdmin` cover empty/whitespace/multiple/non-match/substring.
- Authz test proves a non-admin action call has no side effects.
- README + `.env.example` document the var and the gated, unlisted route.

## Security Considerations
- Tests assert fail-closed behavior (empty allowlist ⇒ no admin).
- Substring-non-match test guards against a future loosening of the comparison.
- No real secrets in test fixtures; numeric ids only.

## Next Steps
- Feature complete. Optional follow-ups (out of scope): audit log, edit-limits,
  bulk revoke — defer per YAGNI.

## Unresolved
- None. (Verified: no `docs/` directory in repo — README is the doc surface.)
