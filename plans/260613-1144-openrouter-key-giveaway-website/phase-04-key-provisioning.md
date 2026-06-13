---
phase: 4
title: "Key Provisioning"
status: pending
priority: P1
effort: "1d"
dependencies: [3]
---

# Phase 4: Key Provisioning

## Overview
Core logic: authenticated user generates exactly one OpenRouter key ($10/day cap) via the Provisioning API; key stored in `llmapikey.api_keys`; returning users see existing key (masked). One key per `github_user_id`, enforced by DB unique constraint + pre-check.

## Requirements
- Functional: first generate → mint + store + return raw key once; second attempt → return existing (no new mint); concurrent double-submit → only one key.
- Non-functional: provisioning key server-only; raw key shown once, never persisted (store only `key_hint` = last 4).

- Server action `generateKey()` — **reserve-then-mint** to make the unique constraint guard the *mint*, not just the row:
  1. Resolve `{ githubUserId, githubUsername }` from session (Phase 3 helper).
  2. **Reserve:** `insert` a `pending` row `{ github_user_id, github_username, status:'pending' }` with `ON CONFLICT (github_user_id) DO NOTHING`. If 0 rows inserted (conflict) → a row already exists → return masked hint + "already issued" and STOP (never mints). This makes concurrent double-submits safe: only the winning insert proceeds to mint.
  3. **Mint:** `POST https://openrouter.ai/api/v1/keys` with `Authorization: Bearer <OPENROUTER_PROVISIONING_KEY>`, body `{ name: "llmapikey:<githubUserId>", limit: 10, limit_reset: "daily", include_byok_in_limit: true, expires_at: <+90d ISO> }`. NOTE: name uses the opaque numeric id, NOT the username (avoid leaking PII into OpenRouter-side logs).
  4. **Persist:** parse response — raw key is top-level `key` (shown once); the delete handle is `data.hash`. `update` the reserved row → `{ openrouter_key_hash: data.hash, key_hint: last4, status:'active' }`.
  5. **Compensate on failure:** if mint fails → delete the pending row (free the reservation). If persist (update) fails after a successful mint → best-effort `deleteKey(data.hash)` to avoid an orphaned billable key, then surface a retryable error.
  6. Return raw key to client for one-time display. **Never log the raw key or the full mint response.**
- OpenRouter create response: `{ key: "sk-or-v1-…" (once), data: { hash, … } }`. The `hash` is the identifier for `DELETE /api/v1/keys/:hash` — there is no `data.id`.
- **Sybil/abuse guard:** env-driven `MAX_TOTAL_KEYS` kill-switch (stop minting past N active keys); optional min GitHub account age check via the session/GitHub API. Per-key $10/day bounds each key; the owner's BYOK subscription cap bounds total $ exposure (user-confirmed ceiling).
- **No revoke & regenerate in v1.** Raw key is shown once; if lost, that's acceptable for a free key. (Revoke/regenerate deferred to v2 — it adds a destructive multi-step delete+remint flow with several partial-failure modes; not worth it for MVP.)

## Related Code Files
- Create: `app/actions/generate-key.js` (server action, imports `server-only`)
- Create: `lib/openrouter/provisioning-client.js` (create/delete key wrappers, JSDoc)
- Create: `lib/keys/api-keys-repository.js` (Supabase CRUD for `api_keys`)
- Create: `scripts/reconcile-keys.js` (list OpenRouter keys vs DB rows; flag orphans + dangling rows)

## Implementation Steps
1. Build `provisioning-client.js`: `createKey({name, limitUsd, resetPeriod, includeByok, expiresAt})` returning `{ key, hash }`; `deleteKey(hash)` (treat 404 as success/idempotent). Handle non-2xx with typed errors. Confirm request field casing is **snake_case** (`limit_reset`, `include_byok_in_limit`) per API ref.
2. Build `api-keys-repository.js`: `reserve(githubUserId, githubUsername)` (insert pending, ON CONFLICT DO NOTHING, returns whether reserved), `activate(id, {hash, hint})`, `deletePending(id)`, `findByGithubUserId`.
3. Build `generate-key.js` server action implementing reserve→mint→persist→compensate above.
4. Mask helper: store/display last 4 chars only.
5. Build `reconcile-keys.js`: `GET /api/v1/keys`, diff against DB by hash; report orphaned OpenRouter keys (cost leak) and DB rows whose key was deleted out-of-band.
6. Manual test: generate, re-generate (idempotent — no second mint), concurrent double-submit (exactly one OpenRouter key), verify cap + BYOK-included + daily reset in OpenRouter dashboard.

## Success Criteria
- [ ] First generate mints a key with `limit:10, limit_reset:daily, include_byok_in_limit:true, expires_at` — **verified in OpenRouter dashboard** (not just that the field was sent)
- [ ] `openrouter_key_hash` stores `data.hash`; a create→delete round-trip on a throwaway key succeeds
- [ ] Second attempt returns existing key, does NOT mint
- [ ] Concurrent double-submit yields exactly ONE OpenRouter key (verified in dashboard, not just one DB row)
- [ ] Mint-fail leaves no pending row; persist-fail deletes the orphan key
- [ ] Raw key returned once; only `key_hint` + `hash` persisted; raw key never logged
- [ ] Provisioning + service-role keys never reach the client bundle
- [ ] `MAX_TOTAL_KEYS` kill-switch halts minting when reached

## Risk Assessment
- **Raw key unrecoverable (v1):** shown once; no in-app recovery. Prominent "copy now" warning (Phase 5). Revoke/regenerate deferred to v2.
- **Model surface too wide:** raw key can call any model on the account; Provisioning API can't restrict per key (confirmed: create-keys has no model field). The "empty credit balance" idea is UNVERIFIED and may break BYOK — do not rely on it until Phase 1 answers Q1/Q2/Q6. Document intended model `minimax/minimax-m3`; if Phase 1 says per-key model restriction is impossible AND support requires it → proxy pivot.
- **BYOK economics:** 5% fee to credits + paid fallback (Phase 1 Q1/Q2). "$10/day" cost-basis unverified — could permit far more real usage if it counts only the fee. Gate on Phase 1 answers.
- **Orphaned keys:** mitigated by reserve-then-mint + compensation + `reconcile-keys.js`.
- **Provisioning rate-limit:** handle OpenRouter 429 explicitly (back off, surface "try later", do NOT retry-loop into more mints).
