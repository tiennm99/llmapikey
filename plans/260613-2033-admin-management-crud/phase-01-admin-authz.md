# Phase 01 — Admin authz (`lib/auth/is-admin.js`)

**Context:** [plan.md](plan.md) · identity anchor `lib/auth/current-github-identity.js:24-45`

## Overview
- **Priority:** P1 (blocks 03, 04)
- **Status:** pending
- **Description:** Env-allowlist admin check over the existing numeric
  `provider_id` identity. No DB role, no migration.

## Key Insights
- Identity already exposes `githubUserId` (numeric string, regex-asserted at
  `current-github-identity.js:40`). Reuse it verbatim — do NOT re-parse metadata.
- Allowlist is operator-controlled env → safe trust boundary. Compare as strings
  after trimming; both sides are numeric `provider_id`s.
- `getCurrentGithubIdentity()` returns `null` (unauthenticated) and can **throw**
  (malformed metadata). The combined helper must treat both as "not admin".

## Requirements
**Functional**
- `isAdmin(identity)` → boolean. True iff `identity?.githubUserId` is in the
  parsed `ADMIN_GITHUB_USER_IDS` allowlist.
- `parseAdminIds(raw)` (exported for tests) → `string[]`, comma-split, trimmed,
  empties dropped. Empty/undefined env → `[]` (no admins).
- `requireAdminIdentity()` → resolves identity + gates in one call; returns the
  identity if admin, else `null` (caller maps `null` → `notFound()` / rejection).

**Non-functional**
- File <200 lines (will be ~40). Pure logic except the resolve helper.
- No logging of the allowlist or identity.

## Architecture
Data flow:
```
env ADMIN_GITHUB_USER_IDS ──parseAdminIds──▶ string[]
identity.githubUserId ─────includes?───────▶ boolean (isAdmin)
requireAdminIdentity(): getCurrentGithubIdentity() ──try/catch──▶ identity|null
                                                   └─ isAdmin? ─▶ identity | null
```
- `isAdmin` is pure (env read only) → unit-testable without a session.
- `requireAdminIdentity` is the single gate used by pages and actions.

## Related Code Files
- **Create:** `lib/auth/is-admin.js`
- **Read for pattern:** `lib/auth/current-github-identity.js`
- **Modify:** none
- **Delete:** none

## Implementation Steps
1. Create `lib/auth/is-admin.js` with `import "server-only";` and import
   `getCurrentGithubIdentity`.
2. `export function parseAdminIds(raw)` — `String(raw ?? "").split(",").map(s => s.trim()).filter(Boolean)`.
3. `export function isAdmin(identity)` — guard `identity?.githubUserId`; return
   `parseAdminIds(process.env.ADMIN_GITHUB_USER_IDS).includes(identity.githubUserId)`.
4. `export async function requireAdminIdentity()` — `try { const id = await getCurrentGithubIdentity(); return id && isAdmin(id) ? id : null; } catch { return null; }`.
5. JSDoc each export (`@param`, `@returns`); note allowlist values are numeric
   `provider_id`s, not logins.

## Todo
- [ ] Create `lib/auth/is-admin.js`
- [ ] `parseAdminIds` (trim/empty/multi)
- [ ] `isAdmin` (null-safe)
- [ ] `requireAdminIdentity` (catch throw → null)
- [ ] JSDoc + `server-only`

## Success Criteria
- `parseAdminIds("")` → `[]`; `parseAdminIds(" 1 , 2 ,,3 ")` → `["1","2","3"]`.
- `isAdmin({githubUserId:"42"})` true when env contains `42`, false otherwise,
  false for `null`/missing id.
- `requireAdminIdentity()` returns `null` when identity throws or is non-admin.

## Security Considerations
- Allowlist compared as exact strings — no substring/`startsWith` (would let
  `"4"` match `"42"`).
- Empty env = zero admins (fail-closed), never "allow all".
- Never log identity or allowlist contents.

## Next Steps
- Phase 03 actions and Phase 04 page both call `requireAdminIdentity()`.
