---
phase: 1
title: "ToS Approval Gate"
status: pending
priority: P1
effort: "1-5 days (mostly waiting)"
dependencies: []
---

# Phase 1: ToS Approval Gate

## Overview
Blocking precondition. Confirm OpenRouter permits a free, BYOK-backed, per-user key giveaway before writing any code. If rejected → cancel plan (or pivot to Org Accounts / proxy in a new plan).

## Requirements
- Functional: written reply from OpenRouter support on acceptable use under ToS §7.4.
- Non-functional: no build work starts until a clear answer is received.

## Architecture
N/A — process gate, not code. Decision branch on the reply.

## Related Code Files
- Read: `plans/reports/openrouter-support-email-acceptable-use-key-giveaway.md` (drafted email)
- Read: `plans/reports/from-researcher-to-brainstorm-openrouter-key-limits-workspaces-report.md`

## Technical verification questions (ASK OpenRouter here, not "verify at build time")
These are load-bearing assumptions the whole architecture rests on. Get them answered in the same support thread (or by a throwaway test key) BEFORE Phase 2:
1. **BYOK economics:** Does BYOK function at a **zero credit balance**, or does the 5%-of-cost platform fee (deducted from OpenRouter credits) cause requests to fail once the monthly free-request allowance is exhausted? (Docs: BYOK fee = 5%, waived first ~1M req/mo, default fallback to paid shared endpoints.)
2. **Limit cost-basis:** With `include_byok_in_limit: true`, does the per-key `limit` count the **5% fee** or the **full model-equivalent cost**? (If only the fee, `limit:10` permits ~$200/day of real usage.)
3. **Daily reset:** Confirm `limit_reset:daily` resets at **midnight UTC** (not rolling 24h).
4. **MiniMax M3 BYOK:** Is MiniMax actually a supported **BYOK provider** (not just available on OpenRouter)? BYOK provider docs historically name only OpenAI/Azure/Bedrock/Vertex.
5. **Delete handle:** Confirm the create-key response identifier used for `DELETE /api/v1/keys/:hash` is `data.hash` (the plan corrects `data.id` → `hash`).
6. **Per-key model restriction:** Can a provisioned key be restricted to one provider/model? (If no, raw-key cannot honor any "model allowlist" condition — see design-fatal note below.)
7. **Fallback control:** Can paid-credit fallback be disabled ("Always use this provider") so requests **fail** rather than silently bill?

## Implementation Steps
1. Fill bracketed blanks in the drafted email (name, OpenRouter account email, repo URL). Append the Technical verification questions above.
2. Send from the same email as the OpenRouter account (so support can tie request to it).
3. Await reply. Record outcome + answers to all 7 questions in this phase file.
4. Branch on outcome:
   - **Approved (as-is) AND BYOK questions answered favorably:** proceed to Phase 2.
   - **Approved with a model-restriction or per-user-identity condition:** **DESIGN-FATAL for raw-key.** Provisioning API can't restrict models per key — do NOT treat as a Phase 4 tweak. Pivot to server-side proxy or Org Accounts in a new plan; re-confirm with user.
   - **Rejected:** STOP. Cancel plan. Optionally open a new plan for Org Accounts or server-side proxy.
5. **Binding rule:** No Phase 2 commit until a written, account-tied reply is recorded here. **Silence = rejection.**

## Success Criteria
- [ ] Email sent from OpenRouter account address, with the 7 verification questions
- [ ] Written reply received and recorded here, including BYOK economics + limit-basis answers
- [ ] All 7 verification questions answered (or empirically confirmed via a test key)
- [ ] Go / no-go decision documented; conditions classified as benign-tweak vs design-fatal

## Risk Assessment
- **No reply / slow reply:** follow up once after ~5 business days; do not build on silence (silence ≠ permission).
- **Conditional approval (model restriction / per-user identity):** design-fatal for raw-key → forces proxy/Org-Accounts pivot, not a Phase 4 tweak. Re-confirm with user.
- **BYOK not free / breaks at $0 balance:** if confirmed, the "strictly free + empty balance" model is invalid — re-decide architecture before building.
