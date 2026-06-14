# Research Report: OpenRouter Workspace-Scoped Key Minting

_Conducted: 2026-06-14 12:24 (+07). Sources: 5 (OpenRouter official docs)._

## Executive Summary

Creating a minted key inside a specific workspace is a **one-field change**: OpenRouter's
`POST /api/v1/keys` accepts an optional **`workspace_id`** (UUID) body field. Set it to
`33179556-3ab3-40a4-af8b-211d322aa94e` and the key lands in that workspace; omit it and the
key goes to the management key's default workspace (current behavior — why keys aren't where
expected). No header, no separate endpoint, no provisioning-key reissue needed: **management
keys operate at the account level across all workspaces**, so the existing master
`OPENROUTER_MANAGEMENT_KEY` can target any workspace in the org.

Key `name` is a required string (≥1 char) with no documented format constraints. Current
`llmapikey:${githubUserId}` is already non-PII (numeric immutable id) and fine; only minor
naming polish is optional.

## Key Findings

### 1. `POST /api/v1/keys` — full request schema

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string (≥1) | **Yes** | Display name for the key |
| `limit` | number \| null | No | Spending limit (USD) |
| `limit_reset` | `daily`\|`weekly`\|`monthly` \| null | No | Resets at midnight UTC |
| `include_byok_in_limit` | boolean | No | Count BYOK usage toward limit |
| `expires_at` | ISO 8601 UTC datetime \| null | No | Must be UTC (non-UTC rejected) |
| `creator_user_id` | string \| null | No | Only meaningful for org-owned keys |
| **`workspace_id`** | **string (UUID)** | **No** | **Workspace to create the key in. Defaults to default workspace if omitted.** |

Current code (`create-key-request-body.js`) sends `name, limit, limit_reset,
include_byok_in_limit, expires_at` — correct, just missing `workspace_id`.

### 2. Workspace scoping mechanism

- Every API key lives in a workspace. The owning workspace is determined by `workspace_id`
  if provided, else the authenticated (management) key's default workspace.
- "Management keys operate at the account level and can be used to perform administrative
  actions across **all workspaces** via the management API." → no per-workspace management
  key needed; the master key targets `workspace_id` directly.

### 3. Key naming

- Only constraint found: required, ≥1 char. No length/charset rules documented.
- Best practice: non-PII + identifiable for reconciliation. Current `llmapikey:${githubUserId}`
  (numeric immutable GitHub id) already satisfies this. The numeric id is the right anchor
  (login is mutable/PII-ish). Optional polish: namespace clarity, e.g.
  `llmapikey/gh-${githubUserId}`. Avoid embedding the GitHub login.

## Implementation Recommendations

1. Add `workspace_id` to `buildCreateKeyBody(...)` output (snake_case, matches API).
2. Thread a `workspaceId` param through `createKey()` → `mintAndPersist()`. Source it from a
   new env `OPENROUTER_WORKSPACE_ID` (default to the given UUID) rather than hardcoding — keeps
   it config, parallels the other key controls, and lets staging/prod differ.
3. Keep `name` non-PII; optionally tidy to `llmapikey/gh-${githubUserId}`.
4. Unit-test `buildCreateKeyBody` includes `workspace_id` (extend existing test).

### Example request body (target)
```json
{
  "name": "llmapikey/gh-12345",
  "limit": 10,
  "limit_reset": "daily",
  "include_byok_in_limit": true,
  "expires_at": "2026-09-12T00:00:00.000Z",
  "workspace_id": "33179556-3ab3-40a4-af8b-211d322aa94e"
}
```

### Common pitfalls
- Omitting `workspace_id` silently routes to the default workspace (the current symptom).
- `expires_at` MUST be UTC ISO 8601 — non-UTC rejected (current `toISOString()` is UTC ✓).
- Don't conflate `creator_user_id` with `workspace_id`; the former is org-member attribution,
  not workspace placement, and is irrelevant here.

## Resources & References

### Official Documentation
- [Create a new API key](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)
- [Provisioning API Keys](https://openrouter.ai/docs/features/provisioning-api-keys)
- [Management API Keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)
- [Workspaces](https://openrouter.ai/docs/guides/features/workspaces)
- [Introducing Workspaces (blog)](https://openrouter.ai/blog/introducing-workspaces/)

## Unresolved Questions
1. Exact API error when `workspace_id` is invalid / not accessible by the management key — docs
   don't specify (likely 4xx). Plan should handle create-key failure gracefully (already does
   via `ProvisioningError` → compensating delete). Worth a one-time manual probe at deploy.
2. Confirm the master `OPENROUTER_MANAGEMENT_KEY` belongs to the org that owns workspace
   `33179556-…` (cross-org targeting not documented as supported).
