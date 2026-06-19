# Project Status

## Overview

Status: pending as of 2026-06-19.

`llmapikey` is paused until a provider can safely support a public free monthly
API-key giveaway without unexpected pass-through costs.

## Current Gate

- `PROJECT_STATUS=pending` keeps the product pending and hides self-serve key
  minting/retrieval in the UI so spend-capable keys are not surfaced while the
  provider decision is unresolved.
- `PROVISIONING_ENABLED=false` remains the lower-level minting kill switch.
- Key creation requires both `PROJECT_STATUS=live` and
  `PROVISIONING_ENABLED=true`.

## OpenRouter Finding

Official OpenRouter docs confirm BYOK is not unbounded free usage through
OpenRouter:

- BYOK docs: the rendered page currently says custom provider keys cost 5% of
  what the same model/provider would cost normally on OpenRouter, deducted from
  OpenRouter credits, with the first 1M BYOK requests per month waived.
- FAQ: the rendered page frames the waived unit as BYOK requests per month, not
  tokens.
- Independent research confirmed the policy shape, but saw placeholders in
  OpenRouter's markdown docs for the exact threshold/percentage. Re-verify the
  rendered docs or ask OpenRouter support before setting `PROJECT_STATUS=live`.
- Free model docs: free models and the free router can be zero cost, but they
  have low rate limits/availability and are not a fit for a public giveaway that
  promises stable model access.

Sources:

- https://openrouter.ai/docs/guides/overview/auth/byok
- https://openrouter.ai/docs/faq
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://openrouter.ai/docs/guides/routing/model-variants/free

## Reopen Criteria

- Suitable provider found and accepted.
- OpenRouter BYOK exact threshold/fee re-verified if OpenRouter remains in scope.
- Billing behavior verified for public free-key usage.
- Monthly and per-key caps verified against real provider controls.
- `PROJECT_STATUS=live` and `PROVISIONING_ENABLED=true` set deliberately in
  runtime env.

## Unresolved Questions

- Which provider can support the same free monthly giveaway economics safely?
- Whether any previously minted OpenRouter keys need manual revoke in the
  OpenRouter dashboard.
