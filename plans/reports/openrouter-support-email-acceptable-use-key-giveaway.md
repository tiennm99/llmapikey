# OpenRouter Support Email — Acceptable-Use Confirmation (Free Key Giveaway)

> Copy the body below into an email to OpenRouter support (support@openrouter.ai or the in-app support/Trust channel). Fill the `[bracketed]` blanks before sending.

---

**To:** support@openrouter.ai
**Subject:** Acceptable-use check — free giveaway of per-user, daily-capped API keys (no reselling)

---

Hi OpenRouter team,

I'm building a small **non-commercial, free** community project and want to confirm it's acceptable under your Terms (esp. §7.4 on reselling / competing services) **before** I launch. I'd rather ask first than risk my account.

**What it is**
A simple website that lets developers try flagship models they may not otherwise have access to (currently MiniMax M3; possibly GLM and Kimi later). It's purely a "try it out" giveaway — I am **not selling tokens, not charging users anything, and not running a paid or competing API service.**

**How it works technically**
- One OpenRouter account (mine), with a **Provisioning/Management key**.
- Usage is backed by **BYOK** — I've connected my own monthly provider subscription, which already has its own spending cap. So I'm routing through my own paid subscription, not reselling your metered credits.
- For each user I mint a separate API key via the Provisioning API, each hard-capped at **$10/day** (`limit: 10`, `limit_reset: daily`).
- Users authenticate with **GitHub login** so I can enforce **one key per GitHub account**. (Starring my repo is an optional nudge only — not required for access.)
- The key is handed to the user so they can call the models directly from their own tools.

**My questions — acceptable use**
1. Is this free, non-commercial giveaway of per-user, daily-capped keys (backed by my own BYOK subscription) acceptable under your Terms?
2. If not, is there a preferred pattern you'd recommend for this use case — e.g. **Organizational Accounts** with Authorized Users instead of distributing raw keys?
3. Are there any guardrails you'd require of me (model allowlist, logging, abuse handling) given I'd be the responsible account holder for end-user activity?

**My questions — technical (these decide whether the design is even viable)**
4. Does BYOK function at a **zero credit balance**, or does the 5% platform fee (deducted from credits) cause requests to fail once the monthly free-request allowance is exhausted?
5. With `include_byok_in_limit: true`, does a key's `limit` count the **5% fee** or the **full model-equivalent cost**? (Determines what "$10/day" actually permits.)
6. Does `limit_reset: daily` reset at **midnight UTC**?
7. Is **MiniMax** a supported **BYOK provider** (not just a model available on OpenRouter)?
8. Can a provisioned key be **restricted to a single provider/model**, or can it call any model on my account?
9. Can paid-credit **fallback be disabled** so requests fail rather than silently bill my credits?
10. Confirm the create-key response identifier used for `DELETE /api/v1/keys/:hash` is `data.hash`.

I'm happy to adjust the design to whatever keeps things compliant. Thanks for building OpenRouter — this project only exists because your platform makes multi-model access easy.

Best regards,
[Your name]
[Project name / repo URL: https://github.com/tiennm99/llmapikey]
[Your OpenRouter account email]

---

## Notes (not part of the email)

- **Why this email matters:** ToS §7.4 prohibits "reselling API access … or otherwise developing a competing service." A free, BYOK-backed giveaway is arguably outside that clause, but it's ambiguous. Written confirmation removes the account-ban risk.
- **Strongest points to lean on:** (1) no money changes hands, (2) BYOK = your own subscription, not resale of OpenRouter credits, (3) per-key $10/day hard cap, (4) one-key-per-identity control.
- **If they say no:** the fallback is Organizational Accounts (Authorized Users) or a server-side proxy — both keep the raw key out of users' hands. Ask them which they prefer.
- **Send from** the same email as your OpenRouter account so they can tie the request to it.
