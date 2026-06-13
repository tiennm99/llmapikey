# Phase 03 — Admin server actions (revoke / manual create)

**Context:** [plan.md](plan.md) · [phase-01](phase-01-admin-authz.md) · [phase-02](phase-02-repository-queries.md) · pattern `app/actions/generate-key.js`

## Overview
- **Priority:** P1 (blocks 04)
- **Status:** pending
- **Description:** `app/actions/admin-keys.js` (`"use server"` + `server-only`)
  with `revokeKey(id)` and `adminCreateKey({ githubUserId, githubUsername })`.
  Both **re-gate with `requireAdminIdentity()` server-side** — never trust the
  page gate alone. Refactor shared mint logic into `lib/keys/mint-key.js` (DRY).

## Key Insights
- `mintAndPersist` + `numEnv`/`expiryIso` currently live private in
  `generate-key.js:111-172`. Extract to `lib/keys/mint-key.js` and import from
  both files so admin mint and self-serve mint share one code path. generate-key
  output/flow must remain identical (regression risk — see tests).
- The full reserve→ceiling-recheck→mint flow in `generateKey()` is **per-user
  idempotent** and keyed on the signed-in identity. For admin create we mint for
  an **arbitrary** target user → reuse `reserve`/`countLiveKeys`/`mintAndPersist`
  but with the admin-supplied `{ githubUserId, githubUsername }`, not the
  admin's own identity.
- `deleteKey(hash)` is idempotent on 404 (`provisioning-client.js:63-71`) → safe
  to call before `deleteById`; a missing upstream key still cleans the DB row.
- Pending rows have `openrouter_key_hash = null` → revoke must skip `deleteKey`
  when hash is absent and just delete the row.

## Requirements
**Functional**
- `revokeKey(id)`:
  1. `requireAdminIdentity()`; `null` → `{ status: "error", message: "Not authorized." }`.
  2. `findById(id)`; missing → `{ status: "error", message: "Key not found." }`.
  3. if `openrouter_key_hash` → `deleteKey(hash)` (idempotent).
  4. `deleteById(id)`.
  5. return `{ status: "revoked" }`.
- `adminCreateKey({ githubUserId, githubUsername })`:
  1. re-gate (as above).
  2. validate `githubUserId` matches `/^\d+$/`; else `{ status: "error", message: "githubUserId must be numeric." }`.
  3. coerce `githubUsername` to a non-empty string (fallback to the id if blank).
  4. existing active key for that id → `{ status: "exists" }`.
  5. `PROVISIONING_ENABLED !== "true"` → gated error (same copy as generate-key).
  6. `MAX_TOTAL_KEYS` ceiling (pre + post-reserve authoritative re-check).
  7. reserve → mint → activate via shared `mint-key.js`.
  8. return `{ status: "created", keyHint }` — **do not** return `rawKey` to the
     admin UI list view (see security); creation result surfaces hint only.

**Non-functional**
- File <200 lines. Return shapes mirror existing `GenerateKeyResult` style.

## Architecture
```
admin-keys.js  ──requireAdminIdentity()──▶ gate (both actions, first line)
revokeKey      → findById → [deleteKey?] → deleteById
adminCreateKey → validate id → reserve → ceiling re-check → mintAndPersist (shared)

lib/keys/mint-key.js (extracted)
  mintAndPersist(reservedId, githubUserId) → CreateKeyResult flow + compensation
  numEnv / expiryIso (moved here; generate-key imports them)
```
Refactor sequence (must keep generate-key green):
1. Create `mint-key.js`, move `mintAndPersist`, `numEnv`, `expiryIso` verbatim.
2. In `generate-key.js`, delete the moved fns, import from `mint-key.js`.
3. Verify `generateKey()` behavior unchanged (existing provisioning-client test
   + new mint test).

## Related Code Files
- **Create:** `app/actions/admin-keys.js`, `lib/keys/mint-key.js`
- **Modify:** `app/actions/generate-key.js` (extract shared fns, import them)
- **Read for pattern:** `app/actions/generate-key.js`, `lib/keys/api-keys-repository.js`
- **Delete:** none

## Implementation Steps
1. Create `lib/keys/mint-key.js` (`server-only`); move `mintAndPersist`,
   `numEnv`, `expiryIso`; export them. Keep `STALE_PENDING_MS` in generate-key
   (only its conflict path uses it).
2. Update `generate-key.js` imports; remove the now-moved private fns; confirm no
   other references.
3. Create `app/actions/admin-keys.js` with `"use server"` + `server-only`,
   import `requireAdminIdentity`, repo (`findById`/`deleteById`/`reserve`/
   `findByGithubUserId`/`countLiveKeys`/`deletePending`), `deleteKey`,
   `mintAndPersist`, `numEnv`.
4. Implement `revokeKey(id)` per Requirements; wrap `deleteKey` failure path to
   surface `{ status:"error" }` (do not delete the DB row if upstream delete
   throws non-404 — leaves a recoverable state, reconcile script reports it).
5. Implement `adminCreateKey(...)` reusing the generate-key ceiling logic
   (pre-`>=` then post-reserve `>` re-check) against the target id.
6. JSDoc + result typedefs; never log `rawKey`/`hash`.

## Todo
- [ ] Extract `mint-key.js`; rewire `generate-key.js`
- [ ] `revokeKey` with admin gate + idempotent deleteKey + null-hash skip
- [ ] `adminCreateKey` with gate + numeric validation + ceiling + shared mint
- [ ] No `rawKey` returned to admin list view
- [ ] generate-key regression check

## Success Criteria
- Non-admin calling either action → rejection, no DB/OpenRouter side effects.
- Revoking an active key calls `deleteKey` then removes the row; revoking a
  pending row (null hash) just removes the row.
- `adminCreateKey` rejects non-numeric id; honors `PROVISIONING_ENABLED` and
  `MAX_TOTAL_KEYS`; second create for same id → `exists`.
- `generateKey()` behaves identically after the extraction.

## Security Considerations
- **Server-side re-gate on every action** — the page gate is defense-in-depth
  only; actions are independently invocable.
- Raw key never returned to the admin table flow; `hash` never logged.
- Numeric-id validation prevents minting against a spoofed/garbage identity and
  keeps the OpenRouter key `name` (`llmapikey:<id>`) PII-free.
- `deleteKey` before `deleteById` ordering avoids orphaned billable upstream keys.

## Next Steps
- Phase 04 wires these actions into the table revoke button and a create form.
