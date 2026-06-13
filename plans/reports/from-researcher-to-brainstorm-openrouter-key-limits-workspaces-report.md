# OpenRouter API Key Limits, Workspaces & ToS Analysis
**Date:** 2026-06-13 | **Research Type:** Technical feasibility for provisioned key distribution to public end-users

---

## Executive Summary

The developer's plan to mint per-user API keys via Provisioning API, cap each at $10/day, and distribute to anonymous public users via GitHub login faces **ToS prohibition** on reselling/competing services. Workspaces are isolated project containers with unified billing. Key creation has **no documented account-level cap**, but **per-key cost all bills to master account**. Distributing raw keys to anonymous third parties **violates ToS §7(4)** unless the service itself (not the keys) is the product.

---

## Findings

### 1. Max Number of API Keys Per Account/Workspace

**NO documented cap on API key count.** OpenRouter's documentation does not specify a maximum number of API keys per account or per workspace.

- Provisioning API docs ([openrouter.ai/docs/features/provisioning-api-keys](https://openrouter.ai/docs/features/provisioning-api-keys)) focus on use cases (SaaS customer isolation, key rotation, usage monitoring) but omit numeric limits.
- DataStudios comprehensive limits guide ([usage-limits-explained](https://www.datastudios.org/post/openrouter-usage-limits-explained-rate-limits-spending-controls-provider-errors-fallbacks-byok)) treats keys as "budget containers" but does not mention per-account caps.
- FAQ ([openrouter.ai/docs/faq](https://openrouter.ai/docs/faq)) mentions management keys enable "programmatic key management" without cap details.
- Search across official docs and third-party analyses yields **no rate limit on the key-creation endpoint itself**.

**Verdict:** No limit found; likely unlimited, but verify with support@openrouter.ai.

---

### 2. Workspaces: Definition, Relation to Provisioning, Per-Workspace Limits

**Workspaces = isolated project containers** for segmentation, not permission/quota boundaries.

**Definition:**
- Workspaces organize projects into separate environments with independent API keys, routing defaults, guardrails, and observability ([openrouter.ai/docs/guides/features/workspaces](https://openrouter.ai/docs/guides/features/workspaces)).
- Each workspace inherits account-level policies; can impose stricter rules via guardrails.

**Relation to Provisioning Keys:**
- API keys are **workspace-scoped resources** ([workspaces doc](https://openrouter.ai/docs/guides/features/workspaces)).
- When creating a key via Provisioning API, you specify `workspace_id` parameter ([search result](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)).
- Members can create their own keys in workspaces they access; admins can create system-owned keys for workspace isolation.

**Per-Workspace Limits & Quotas:**
- **No per-workspace rate limits or key caps documented.** Guardrails ([openrouter.ai/docs/guides/features/guardrails](https://openrouter.ai/docs/guides/features/guardrails)) allow **spending caps** (daily/weekly/monthly reset) and **model/provider allowlists** per guardrail, but do not segment quota per workspace.
- Free-tier per-minute and daily limits ([API Rate Limits doc](https://openrouter.ai/docs/api/reference/limits)) apply account-wide, not per workspace.

**Billing Rollup:**
- **Unified billing across all workspaces** ([workspace blog announcement](https://openrouter.ai/announcements/introducing-workspaces)): all charges aggregate at account level; org admins manage billing centrally.
- Can filter logs and activity by workspace for cost breakdown, but all usage bills to one master credit pool.

**Verdict:** Workspaces are **logical containers for access control**, not cost silos. All provisioned keys' charges roll up to master account's single credit balance.

---

### 3. ToS: Distributing Provisioned Keys to Anonymous Third Parties

**PROHIBITED.** OpenRouter ToS §7(4) explicitly forbids **"accessing the Site or Service for purposes of reselling API access to Models or otherwise developing a competing service."** ([openrouter.ai/terms](https://openrouter.ai/terms))

**Analysis:**

| Scenario | Verdict | Evidence |
|----------|---------|----------|
| **Raw API keys to anonymous public users** | Prohibited | §7(4) "reselling API access" + account holder liability for key confidentiality (§3). Hacker News discussion: ["not allowed to expose the access to end users"](https://news.ycombinator.com/item?id=47702048) |
| **"Strictly free" exemption** | NO exemption | ToS uses "reselling API access" language; free does not negate access-distribution violation. Payment intent is irrelevant to the prohibition. |
| **SaaS with provisioned keys** | Allowed | OpenRouter rep confirmed: "build applications powered by OpenRouter (SaaS products, AI assistants)" is permitted. Caveat: "as long as you don't create a proxy that simply passes through API access." |
| **Gray zone: app offering OpenRouter's models as a service, no proxy** | Unresolved in ToS | Hacker News commenter raised: "SaaS product wrapping OpenRouter's models + charging users per token." OpenRouter did not directly answer; this remains **gray**. |

**Key Quote:**
> "OPENROUTER IS NOT RESPONSIBLE FOR THE ACCURACY OR QUALITY OF ANY OUTPUT YOU RECEIVE."
> Account holder must "maintain the confidentiality of your account and password" and accept "responsibility for all activities that occur under your account." ([openrouter.ai/terms](https://openrouter.ai/terms), §3, §6)

**Per Hacker News:**
OpenRouter has "strengthened account-level regional restrictions" and enforces upstream provider rules (e.g., OpenAI/Anthropic geoblocking). Account-level enforcement signals → master account is liable for all key activity.

**Verdict:** **Prohibited.** Distributing raw keys to anonymous public users = "reselling API access." Free service does not change this. Building a service that *uses* OpenRouter (with your own keys) is allowed; giving out your own keys to end-users is not.

---

### 4. Account-Level Liability & Abuse Mitigation

**Master account holds liability for all provisioned key activity.** No per-key content filtering or liability firewall exists.

**Liability:**
- ToS §6.7: OpenRouter "may, however, at any time and without prior notice, screen, remove, edit, or block any Inputs that in our sole judgment violates these Terms or is otherwise objectionable or illegal."
- **No exemption for master account:** if a provisioned key generates prohibited content, enforcement applies to the account/key pair. No documented consequence cap (suspension, account loss possible).
- Account holder is "responsible for all activities that occur under your account" (§3).

**Abuse Mitigation (Per-Key Controls):**

| Control | Available | Details |
|---------|-----------|---------|
| **Spending cap** | ✅ Yes (via guardrails) | Daily/weekly/monthly reset; requests rejected at limit ([guardrails doc](https://openrouter.ai/docs/guides/features/guardrails)). |
| **Model allowlist** | ✅ Yes (via guardrails) | Restrict key to specific models/providers; intersection logic if multiple guardrails apply. |
| **Content filtering** | ⚠️ Partial | Regex-based prompt injection detection; custom content filters with redact/block actions; NLP-based sensitive info detection ([guardrails doc](https://openrouter.ai/docs/guides/features/guardrails)). **Does not cover output (model response) filtering.** |
| **Per-key logging disable** | ❓ Undocumented | No per-key opt-out from logging found in docs. Account-level privacy controls exist. |

**Verdict:** **Guardrails reduce but do not eliminate risk.** Spending caps + model allowlists + prompt filtering mitigate financial + injection risk. **Output monitoring is OpenRouter's responsibility, not user-configurable.** Anonymous users remain a liability vector; upstream provider (OpenAI, Anthropic) abuse bans may cascade to master account.

---

### 5. Key Creation Requirements: Payment Method, Credit Balance, Minimum

**No per-key payment method required.** All charges bill to **master account's credit pool.**

**Key Creation via Provisioning API:**
- Does **NOT** require a separate payment method per key.
- Each provisioned key **shares the master account's credit balance** ([provisioning API doc](https://openrouter.ai/docs/features/provisioning-api-keys)).
- Billing is **unified across all keys** in all workspaces.

**Master Account Requirements:**
- **Credit balance**: OpenRouter uses prepaid credits. Account must have credit balance to serve requests; 402 errors returned if balance exhausted ([API Rate Limits doc](https://openrouter.ai/docs/api/reference/limits)).
- **Minimum purchase**: No hard minimum documented; "usually $5" mentioned in 3rd-party guides, but API docs state no floor ([pricing info](https://costgoat.com/pricing/openrouter)).
- **Negative balance:** If balance goes negative, requests fail with 402 Payment Required, even for free models ([API Rate Limits doc](https://openrouter.ai/docs/api/reference/limits)).

**Rate Limiting & Credits:**
- Rate limit (requests/second) is **per-account**, not per-key, and scales with master account credit balance: 0 credits → 1 req/s, $5 → 5 req/s, up to 200 req/s max ([API Rate Limits doc](https://openrouter.ai/docs/api/reference/limits)).
- Per-key spending cap (via guardrails) is enforced independently; total of all keys' spending must fit within master account balance.

**Verdict:** Each $10/day-capped provisioned key will cost nothing to create; **all usage charges bill to master account's single credit balance.** If 100 users each hit $10/day, master account must have $1000/day credit float to avoid 402 errors.

---

## Unresolved Questions

1. **Exact rate limit on key-creation endpoint:** Search found none. Provision API docs are 404 or minimal. Confirm with OpenRouter support: "Max requests/minute to POST /api/v1/keys?"

2. **Account-level consequence specifics:** ToS allows OpenRouter to "remove, edit, or block" inputs and (implicitly) suspend keys/accounts. No SLA on "banned key" recovery or escalation path. Clarify: "What happens to master account if a provisioned key generates CSAM or other severe violation?"

3. **Output filtering vs. input filtering:** Guardrails cover prompt injection, regex, sensitive-info detection. OpenRouter's own output monitoring (inference endpoint blocks) is not user-configurable. Gap: anonymous users generating harmful outputs → no per-key control.

4. **Free service + "reselling" interpretation:** ToS says "reselling." Legal analysis of whether non-profit/free distribution of raw API keys still = "reselling" is **gray**. "Reselling" typically = exchange-for-money, but ToS language does not explicitly carve out free services. Recommend: ask OpenRouter directly whether free, non-commercial key distribution is allowed under provisioning.

5. **Workspace member + provisioning key scope:** Docs state "members can create their own keys in workspaces they belong to." Unclear: can a provisioning key create keys for a different workspace than its own, or is it confined to its originating workspace?

---

## Sources

- [OpenRouter Terms of Service](https://openrouter.ai/terms)
- [OpenRouter Workspaces Documentation](https://openrouter.ai/docs/guides/features/workspaces)
- [OpenRouter Provisioning API Keys](https://openrouter.ai/docs/features/provisioning-api-keys)
- [OpenRouter Guardrails](https://openrouter.ai/docs/guides/features/guardrails)
- [OpenRouter API Rate Limits](https://openrouter.ai/docs/api/reference/limits)
- [OpenRouter FAQ](https://openrouter.ai/docs/faq)
- [Hacker News: "Not Allowed to Expose Access"](https://news.ycombinator.com/item?id=47702048)
- [DataStudios: OpenRouter Usage Limits Explained](https://www.datastudios.org/post/openrouter-usage-limits-explained-rate-limits-spending-controls-provider-errors-fallbacks-byok)
- [OpenRouter Blog: Introducing Workspaces](https://openrouter.ai/announcements/introducing-workspaces)
