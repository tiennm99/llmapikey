---
phase: 6
title: "Test and Deploy"
status: code-complete (live E2E + prod deploy deferred to post-Phase-1)
priority: P2
effort: "0.5d"
dependencies: [5]
---

# Phase 6: Test and Deploy

## Overview
Validate the end-to-end flow, lock in the critical invariants (one-key-per-account, cap, secret isolation), and ship to Vercel production.

## Requirements
- Functional: full flow works on the production Vercel domain with real GitHub + OpenRouter.
- Non-functional: no secret in client bundle; build green; basic regression tests for the provisioning logic.

Tests should be written alongside Phases 4-5 (not test-last). This phase is the consolidation + verification gate + production promotion. Mocked tests give false confidence for API-shape and concurrency bugs — the load-bearing invariants are verified by real E2E + dashboard, not mocks.

## Architecture
- **Thin unit tests** (node test runner) for genuinely pure logic only: mask/last-4 helper; provisioning-client request-body shaping (snake_case fields). Skip a mocked-Supabase repository test — it tests the mock, not the unique constraint.
- **Real verification** (the parts that actually matter):
  - RLS negative test against a real Supabase: anon/authenticated client cannot SELECT any `api_keys` row.
  - Create→delete round-trip on a throwaway OpenRouter key (confirms `data.hash` is the right handle).
  - Manual E2E on Vercel: sign-in → generate → call MiniMax M3 → re-generate (no second mint) → concurrent double-submit (exactly one key in OpenRouter dashboard).
  - Dashboard verification: minted key shows `limit:10`, daily reset, BYOK-included.
  - Raw-key redaction: grep Vercel function logs to confirm no raw key / full mint response logged.

## Related Code Files
- Create: `tests/mask-helper.test.js`
- Create: `tests/provisioning-client.test.js` (mock fetch — request shaping only)
- Create: `tests/rls-deny-all.test.js` (real Supabase anon client → expects empty/denied)
- Modify: `package.json` (test script)

## Implementation Steps
1. Write the thin unit tests (mask, provisioning-client shaping).
2. RLS deny-all test: anon client SELECT on `llmapikey.api_keys` returns nothing.
3. Create→delete round-trip test on a throwaway key.
4. Verify no secret in client bundle (grep build output) AND no raw key in function logs.
5. Manual E2E on Vercel preview (see Architecture); confirm dashboard config + concurrent double-submit yields one key.
6. Promote to production; smoke test. Keep `.down.sql` ready for DB rollback (Vercel rollback won't revert the migration).

## Success Criteria
- [ ] Thin unit tests pass (mask, provisioning-client shaping)
- [ ] RLS deny-all verified: anon cannot read `api_keys`
- [ ] Create→delete round-trip succeeds (`data.hash` is correct handle)
- [ ] No secret in client bundle; no raw key in function logs
- [ ] E2E on production: sign-in → generate → call MiniMax M3 succeeds
- [ ] Re-generate idempotent; concurrent double-submit = exactly one OpenRouter key (dashboard-verified)
- [ ] Dashboard shows $10/day + daily reset + BYOK-included

## Risk Assessment
- **Real-money E2E:** calling MiniMax M3 spends BYOK budget — keep test calls tiny.
- **Mocks mask real bugs:** API-shape (hash) and concurrency invariants are only real at the OpenRouter/Postgres layer — verify via round-trip + dashboard + double-submit, not mocked tests.
- **Secret leak:** bundle grep + log grep are the gates; fail the phase if any server secret or raw key appears.
