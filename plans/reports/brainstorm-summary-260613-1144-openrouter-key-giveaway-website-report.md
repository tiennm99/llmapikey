# Brainstorm Summary — llmapikey (Free OpenRouter Key Giveaway Site)

**Date:** 2026-06-13
**Status:** Design approved by user. Pending OpenRouter support approval before build.
**Related research:**
- `researcher-260613-1119-openrouter-github-tos-feasibility-report.md`
- `from-researcher-to-brainstorm-openrouter-key-limits-workspaces-report.md`
- Support email draft: `openrouter-support-email-acceptable-use-key-giveaway.md`

---

## Problem Statement

Build a website that gives developers free trial access to flagship models (currently MiniMax M3; later GLM, Kimi if demand). Each user gets one OpenRouter API key, capped $10/day, minted from owner's master account via Provisioning API, backed by owner's BYOK monthly subscription (already capped). Access gated by GitHub login; star is an optional nudge. Site = intro + key self-service.

## Requirements (locked)

- **Expected output:** Deployed Next.js site (Vercel) where a GitHub-authed user generates exactly one OpenRouter key ($10/day) and sees usage docs.
- **Acceptance criteria:** GitHub login works; one key per `github_user_id` (enforced); key minted via OpenRouter Provisioning API with `limit:10, limit_reset:daily`; returning user sees existing key; landing page explains purpose + models + soft star CTA.
- **Scope OUT (v1):** Proxy, payments, GLM/Kimi, per-model restriction, admin analytics, star enforcement.
- **Non-negotiable constraints:** Next.js + JS/JSDoc; Supabase only (dedicated `llmapikey` schema — shared project); Vercel; no proxy; raw-key delivery.
- **Touchpoints:** New repo (empty). Shared Supabase project. OpenRouter master account + provisioning key + BYOK subscription + workspace.

## Decisions (user-confirmed)

| Decision | Choice | Rationale |
|---|---|---|
| Access gate | **Soft star nudge** | Star-for-access violates GitHub AUP; gate on GitHub login only, star optional |
| Key delivery | **Raw provisioned key** (no proxy) | User accepts; OpenRouter auto-enforces cap; BYOK bounds cost |
| Monetization | **Strictly free** | Strengthens non-reselling position under ToS §7.4 |
| Datastore | **Supabase only** | Postgres + GitHub OAuth + RLS; one service |
| DB isolation | **Dedicated `llmapikey` schema** | Supabase project shared with other Vercel apps |
| Spend ceiling | **BYOK subscription cap** | Owner's monthly subscription already capped; per-key $10/day on top |
| ToS gating | **Support email first; cancel if rejected** | Removes account-ban ambiguity before any build |

## Approaches Evaluated

1. **Raw-key distribution (CHOSEN)** — mint per-user key, hand to user. Pro: simplest, native cap enforcement, no infra. Con: ToS §7.4 gray; full account liability; key usable off-site; cannot restrict models per key.
2. **Server-side proxy (declined)** — real key stays server-side; forward requests. Pro: ToS-"allowed" shape, model allowlist + content control + instant revoke. Con: more build effort (streaming gateway).
3. **Org Accounts / Authorized Users (fallback)** — if support rejects raw-key, OpenRouter's intended multi-user pattern.

## Recommended Solution (final)

Next.js (App Router, JS+JSDoc) on Vercel. Supabase dedicated `llmapikey` schema. GitHub OAuth via Supabase Auth (scope `public_repo`).

**Flow:** land `/` → Sign in with GitHub → lookup `github_user_id` → has key (show masked + docs) / no key (soft star CTA + "Generate my key") → server action `POST /api/v1/keys {name:<gh_username>, limit:10, limit_reset:"daily", include_byok_in_limit:true}` → store → show key once + usage snippet (`minimax/minimax-m3`).

**Data model — schema `llmapikey`, table `api_keys`:** `github_user_id` (unique), `github_username`, `openrouter_key_id`, `key_hint`, `created_at`, `status`. RLS: user reads only own row.

**Pages:** `/` landing · `/dashboard` (key/generate) · `/docs` (usage).

## Implementation Considerations & Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ToS §7.4 reselling/competing clause | High | Support email (drafted); BYOK; free; soft gate. **If rejected → abort.** |
| Account liability for end-user abuse | High | Owner responsible; revoke key via Provisioning API; keep model surface = BYOK only |
| Raw key can call unintended models | Medium | Keep OpenRouter credit balance empty → only BYOK subscription models usable; document allowed model |
| Key leakage / off-site use | Medium | Accepted; bounded by $10/day + BYOK cap |
| Master/provisioning key secret mgmt | Medium | Vercel env vars only; never client-exposed; server actions only |
| Shared Supabase collisions | Low | Dedicated `llmapikey` schema isolates objects/RLS |

## Success Metrics / Validation

- GitHub login → key generated end-to-end on Vercel.
- Second generate attempt by same account returns existing key (unique constraint holds).
- New key enforces $10/day (verify via OpenRouter dashboard).
- Landing clearly states purpose + models + optional star.

## Next Steps & Dependencies

1. **Phase 0 (gating):** Send OpenRouter support email; await approval. If rejected → cancel.
2. On approval: `/ck:plan` → scaffold Next.js, Supabase schema + Auth, provisioning server action, pages.
3. Provide secrets: OpenRouter provisioning key, BYOK subscription, Supabase URL/keys, GitHub OAuth app creds.

## Unresolved Questions

1. **Model allowlist:** Raw keys can't be model-restricted. Confirm "keep credit balance empty so only BYOK models work" is acceptable, or accept users may reach other models until balance hits $0.
2. **GitHub OAuth app:** Owner to create OAuth app (callback = Vercel domain) — confirm who registers it.
3. **BYOK setup:** Confirm BYOK subscription already connected in OpenRouter and which provider/models it covers (does it cover MiniMax M3?).
4. **Star revocation:** Since star is non-enforced, no revocation logic needed — confirm.
