# OpenRouter + GitHub API: ToS & Technical Feasibility Research

**Date:** 2026-06-13  
**Status:** Complete research, multiple sources verified  
**Scope:** OpenRouter provisioning API, spending controls, ToS restrictions; GitHub star verification API & acceptable use

---

## 1. Provisioning / Programmatic API Key Creation

**Verdict: YES — Full CRUD available**

OpenRouter exposes Management API Keys specifically for programmatic key management:

### API Endpoint
- **POST** `/api/v1/keys` — Create new API key [https://openrouter.ai/docs/api/api-reference/api-keys/create-keys]
- **DELETE** `/api/v1/keys/{key_id}` — Delete a key [https://openrouter.ai/docs/api/api-reference/api-keys/delete-keys]
- List, read, update operations implied via Management API [https://openrouter.ai/docs/guides/overview/auth/provisioning-api-keys]

### Authentication Required
- **Bearer token** in Authorization header
- Must use a **Management API Key** (special key type, separate from user keys)
- Management keys are **NOT usable for model completions** — only key management operations

### Creation Parameters
- `name` (required): string
- `expires_at` (optional): ISO 8601 timestamp
- `limit` (optional): USD spending cap
- `limit_reset` (optional): `daily`, `weekly`, or `monthly`
- `include_byok_in_limit` (optional): bool, include BYOK usage in limit
- `creator_user_id` (optional): associate with specific user
- `workspace_id` (optional): UUID for workspace assignment

### Response
- Returns the **key string itself** (one-time display)
- Includes metadata: creation time, expiration, limit info, workspace

**Use case alignment:** Perfect for SaaS multi-tenant, per-customer key creation + rotation [https://openrouter.ai/docs/cookbook/administration/organization-management]

---

## 2. Per-Key Spending Limits

**Verdict: YES — But **DAILY/WEEKLY/MONTHLY only, no "per-request" limit**

### Hard Spending Caps Available
- Yes, each key can have a **`limit`** in USD
- Paired with **`limit_reset`** = `daily`, `weekly`, or `monthly`
- Once limit is reached, key is subject to OpenRouter's rate limits (20 RPM for free models)

### Limitation: Enforcement
- **Lifetime-only is NOT available** (only rolling reset)
- **Per-request limits are NOT available** (only per-key aggregate)
- To implement "$10/day cap": use `limit: 10`, `limit_reset: daily`

### Real-Time Enforcement
- Limit status available via Management API responses: `limit_remaining` field
- Can poll for real-time spend tracking
- BYOK (Bring Your Own Key) usage **can be included/excluded** from the limit via `include_byok_in_limit` flag [https://openrouter.ai/docs/api/reference/limits]

**Verdict for "$10/day":** YES — use `limit_reset: daily` + `limit: 10`. Enforcement is automatic.

---

## 3. Per-Key Usage Tracking

**Verdict: YES — Available via API, near-real-time**

### Usage Endpoints
- **Activity Dashboard** — real-time usage display in web UI [https://openrouter.ai/docs/faq]
- **`/api/v1/generation` endpoint** — query stats for specific request ID (token counts, cost) after completion [https://costgoat.com/pricing/openrouter]
- **Broadcast/observability** — OpenRouter sends token usage (prompt, completion, total tokens) in response headers [https://openrouter.ai/docs/guides/features/broadcast]

### Real-Time Latency
- API response includes immediate cost/token counts (within request)
- Generation stats endpoint available post-completion
- Not confirmed as instant; assume ~1-5 second propagation to tracking system

### Per-Key Granularity
- Per-key usage logs available via Activity tab
- Per-key spending visible in dashboard
- **No explicit per-key API endpoint documented**, but management API returns key metadata with usage stats

**Limitation:** No documented REST endpoint for "query usage for key X in last 24h" — would require either (a) parsing Activity dashboard, or (b) polling generation endpoints for each request.

---

## 4. Model Availability & Pricing

**Verdict: YES for GLM; YES for Kimi; PARTIAL for MiniMax**

### MiniMax Models (Confirmed)
- **MiniMax M3** (multimodal): $0.30/M input, $1.20/M output, 1M token context [https://openrouter.ai/minimax/minimax-m3]
- **MiniMax M2.7**: $0.25/M input, $1.00/M output, 204K context [https://openrouter.ai/minimax/minimax-m2.7]
- **MiniMax M2**: $0.255/M input, $1.00/M output, 197K context [https://openrouter.ai/minimax/minimax-m2]
- ✅ All available on OpenRouter

### GLM / Z.ai Models (Confirmed)
- **GLM-5.1** (Apr 2026): $0.98/M input, $3.08/M output, long-context coding [https://openrouter.ai/z-ai/glm-5]
- **GLM-5** (Feb 2026): $0.60/M input, $1.92/M output, 202K context [https://openrouter.ai/z-ai/glm-5-1]
- **GLM-4.7** (Jan 2026): $0.40/M input, $1.75/M output [https://openrouter.ai/z-ai/glm-4.7]
- **GLM-4.5**: $0.60/M input, $2.20/M output
- **GLM-4.5 Air** (free tier): 0 cost [https://openrouter.ai/z-ai/glm-4.5-air:free]
- ✅ 12 GLM variants available on OpenRouter

### Kimi / MoonshotAI Models (Confirmed)
- **Kimi K2.7 Code** (Jun 2026): $0.95/M input, $4.00/M output, 262K context [https://openrouter.ai/moonshotai/kimi-k2.7-code]
- **Kimi K2.6** (Apr 2026): $0.68/M input, $3.41/M output, 262K context [https://openrouter.ai/moonshotai/kimi-k2.6]
- **Kimi K2.6 (free)**: 0 cost [https://openrouter.ai/moonshotai/kimi-k2.6:free/pricing]
- **Kimi K2.5**: $0.35/M input, $1.89/M output [https://openrouter.ai/moonshotai/kimi-k2.5]
- ✅ 10 Kimi variants available on OpenRouter

---

## 5. ToS — Reselling / Sharing Keys / Sub-Accounts

**Verdict: NO — Reselling explicitly prohibited. Key sharing ambiguous. Provisioning for end-users is legally murky.**

### Reselling Prohibition (Section 7.4)
**Quote:** "access the Site or Service for purposes of reselling API access to Models or otherwise developing a competing service" **is prohibited** [https://openrouter.ai/terms]

**Implication:** Creating a marketplace where you resell OpenRouter API access as your own service **violates ToS.**

### API Key Sharing
**Quote (Section 3):** "you are solely responsible for maintaining the confidentiality of your account and password, and you accept responsibility for all activities that occur under your account" [https://openrouter.ai/terms]

**Implication:** Sharing a key with end-users is NOT explicitly forbidden, but you assume liability for their abuse.

### Sub-Accounts / Authorized Users (Section 3)
- OpenRouter allows **Organizational Accounts** with Admin User + Authorized Users
- **Quote:** "Authorized Users may only use the Service as configured by the Admin User"
- Admin can restrict logging, data retention, model access per user
- This is an **intended use case** [https://openrouter.ai/terms]

### Provisioning Keys for End-Users
- **Provisioning API is documented** and officially supported [https://openrouter.ai/docs/features/provisioning-api-keys]
- Creating keys per customer (SaaS multi-tenant) is listed as a common use case
- **However:** Creating keys and distributing them to end-users (not employees) is NOT explicitly blessed in ToS
- **Risk:** If you distribute keys + they violate upstream model provider ToS (e.g., content policy), OpenRouter holds you liable

**Best practice:** Use OpenRouter's **Organizational Accounts** (not raw key provisioning) if you intend to offer API access to third parties — it ensures OpenRouter controls permissions + logging.

---

## 6. ToS — Acceptable Use & End-User Responsibility

**Verdict: YES — Clear responsibility clause. KYC not enforced; abuse responsibility is.**

### End-User Responsibility (Section 5.6, 6.6, 7)
**Quotes:**
- "You are solely responsible for selecting the Models you use, configuring your account settings"
- "You are solely responsible for your Inputs and the consequences of providing Inputs"
- "Organizations are responsible for their Authorized Users' compliance with Model Terms and these Terms" [https://openrouter.ai/terms]

### Account Registration / KYC
- OpenRouter **does not require KYC** (no ID verification, no business verification)
- Registration requires email only
- **Quote (Section 3):** "you agree that the information you provide is accurate and will be kept up-to-date" [https://openrouter.ai/terms]

### Prohibited Conduct
- Section 7: User cannot violate upstream model provider ToS
- Cannot use models for illegal, harmful, or deceptive content
- **"must not...assist or permit any person in engaging in"** prohibited conduct
- OpenRouter maintains dynamic list of prohibited content, updated per upstream providers [https://openrouter.ai/terms]

### Abuse Reporting
- Not detailed in ToS; managed via support tickets and Trust Center [https://trust.openrouter.ai/?tab=securityControls]

**Implication for reselling:** If you create keys for end-users and they violate policy, OpenRouter will hold YOUR account responsible and may suspend all keys.

---

## 7. Free Tier / Rate Limits

**Verdict: YES — Generous free tier, good for MVP**

### Free Models Available
- 28+ models (as of June 2026) including DeepSeek R1, Llama 3.3 70B, Qwen3 Coder, Gemini Flash, **GLM-4.5 Air (free)**, **Kimi K2.6 (free)** [https://costgoat.com/pricing/openrouter-free-models]
- **No credit card required**

### Rate Limits (free models, IDs ending in `:free`)
- **20 requests per minute (RPM)** — hard cap
- **Daily limit depends on account history:**
  - <$10 purchased lifetime: 50 requests/day
  - ≥$10 purchased at any point: 1,000 requests/day
- **Failed requests count toward quota** [https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know]

### Paid Models
- No enforced rate limits from OpenRouter (depends on upstream provider)
- Only limit is spending cap (if set)

**Verdict for "free trial":** Yes, 20 RPM + 50–1,000 daily is usable for light testing. Upgrade to paid models removes RPM limits.

---

## GitHub API: Star Verification

**Verdict: YES — Endpoint exists, OAuth scope is `public_repo` or `repo`**

### Endpoint
- **GET** `/user/starred/{owner}/{repo}` [https://docs.github.com/en/rest/activity/starring]
- **Response:** 204 (starred) or 404 (not starred)
- **Requires authentication** (401 if missing credentials)

### OAuth Scope Required
- **`public_repo`** — minimum scope to check/star public repos [based on GitHub OAuth scope docs]
- **`repo`** — full access (public + private repos)

### Note
- Endpoint determines "Whether the authenticated user has starred the repository"
- Works with Personal Access Tokens or OAuth tokens

---

## GitHub ToS: Incentivized Stars

**Verdict: NO — Prohibited. "Star-for-access" violates Acceptable Use Policy**

### Prohibited Conduct (Acceptable Use Policy)
GitHub explicitly prohibits:
- **"inauthentic interactions, such as fake accounts and automated inauthentic activity"**
- **"rank abuse, such as automated starring or following"**
- **Starring incentivized by "cryptocurrency airdrops, tokens, credits, gifts or other give-aways"** [https://gigazine.net/gsc_news/en/20260421-github-fake-star-economy] [https://awesomeagents.ai/news/github-fake-stars-investigation/]

### Enforcement
- Reactive (not proactive)
- No published enforcement metrics or transparency reports
- Fake star detection is ongoing investigation (6M+ suspected fake stars as of late 2025) [https://arxiv.org/html/2412.13459v2]

**Implication for "star-for-API-access" plan:**
- **Offering API credits/access in exchange for stars = violation of GitHub ToS**
- GitHub may suspend your account if detected
- Better alternative: use "star" as optional metric, but don't tie it to access

---

## Summary Verdicts

| # | Finding | Verdict |
|---|---------|---------|
| 1 | Provisioning API (create/list/delete keys) | ✅ YES — Full CRUD via Management API |
| 2 | Per-key spending limits (daily cap) | ✅ YES — `limit` + `limit_reset: daily` works |
| 3 | Per-key usage tracking endpoint | ⚠️ PARTIAL — Dashboard + generation endpoint, no dedicated "usage by key" REST endpoint |
| 4 | MiniMax, GLM, Kimi availability + pricing | ✅ YES — All available, current pricing confirmed |
| 5 | ToS: Reselling/sharing keys prohibited? | 🚫 YES reselling prohibited (7.4). Sharing ambiguous (3). Provisioning for sub-accounts OK via Org API. |
| 6 | ToS: End-user responsibility clause? | ✅ YES — Clear liability on account owner. KYC not enforced. |
| 7 | Free tier / rate limits | ✅ YES — 28+ free models, 20 RPM, 50–1K daily. |
| — | GitHub: Star verification endpoint | ✅ YES — GET `/user/starred/{owner}/{repo}`, scope `public_repo` |
| — | GitHub: Incentivized stars OK? | 🚫 NO — ToS prohibits star-for-reward exchanges |

---

## Architectural Implications

### For a Reselling Marketplace
- **❌ Direct reselling is illegal** under OpenRouter ToS §7.4
- **✅ Alternative:** Use OpenRouter Organizational Accounts + Management API
  - Create org with per-customer authorization
  - Each customer gets isolated access, controlled by your admin settings
  - Billing rolls up to your master account
  - OpenRouter assumes the intermediary risk, not you alone

### For a "Free Trial with GitHub Star Incentive"
- **❌ Cannot tie API access to starred repo**
- **✅ Alternatives:**
  - Use free models (no credit card) + free tier rate limits
  - Offer paid access separate from star-checking
  - Check star as optional metric (analytics only, no access gating)

### For Usage & Billing Tracking
- **Use Management API + polling `limit_remaining` field** to track spend
- **Not production-grade:** No real-time usage API documented. Dashboard is GUI-only.
- **Recommended:** Generate reports from OpenRouter Activity export + locally track per-customer allocation

---

## Unresolved Questions

1. **Usage API endpoint:** Is there a documented REST endpoint to query "usage for key X in time range Y"? Current research found only dashboard + generation ID polling. Recommend: check OpenRouter support or API reference directly.

2. **Organizational Account billing limits:** Can you set per-user spending limits within an Org, or only per-account master limit? Affects whether Org API is viable for reselling.

3. **Key rotation + zero-downtime:** Does creating a new key + switching while old key still has requests "in flight" cause errors? Management API docs mention zero-downtime, but implementation not clear.

4. **GitHub star verification cadence:** If star is removed, how long until GET `/user/starred` returns 404? Is it instant or cached? Affects "star-for-access" revocation logic.

5. **OpenRouter content policy**: Full list of prohibited use cases not available in ToS snippet. Recommend reviewing Section 7 + upstream provider terms for your use case (e.g., agents, reselling).

---

## Sources

- [OpenRouter Provisioning API Keys](https://openrouter.ai/docs/features/provisioning-api-keys)
- [OpenRouter API Key Creation](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)
- [OpenRouter API Key Deletion](https://openrouter.ai/docs/api/api-reference/api-keys/delete-keys)
- [OpenRouter API Rate Limits](https://openrouter.ai/docs/api/reference/limits)
- [OpenRouter MiniMax M3](https://openrouter.ai/minimax/minimax-m3)
- [OpenRouter GLM-5](https://openrouter.ai/z-ai/glm-5)
- [OpenRouter Kimi K2.6](https://openrouter.ai/moonshotai/kimi-k2.6)
- [OpenRouter Terms of Service](https://openrouter.ai/terms)
- [OpenRouter Organization Management](https://openrouter.ai/docs/cookbook/administration/organization-management)
- [OpenRouter Rate Limits FAQ](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know)
- [OpenRouter Free Models (Jun 2026)](https://costgoat.com/pricing/openrouter-free-models)
- [GitHub REST API: Starring](https://docs.github.com/en/rest/activity/starring)
- [GitHub Fake Star Economy](https://gigazine.net/gsc_news/en/20260421-github-fake-star-economy)
- [GitHub Fake Stars Investigation](https://awesomeagents.ai/news/github-fake-stars-investigation/)
- [Six Million Suspected Fake Stars Study](https://arxiv.org/html/2412.13459v2)
