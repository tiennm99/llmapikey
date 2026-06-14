---
phase: 1
title: Implement
status: completed
priority: P2
effort: 30m
dependencies: []
---

# Phase 1: Implement

## Overview
Thread a workspace id and a non-PII name into the create-key call so minted keys land in the
target workspace.

## Requirements
- Functional: every minted key carries `workspace_id` = `OPENROUTER_WORKSPACE_ID` (default
  `33179556-3ab3-40a4-af8b-211d322aa94e`) and `name` = `llmapikey/gh-${githubUserId}`.
- Non-functional: no new deps; raw `fetch` retained; numeric-id-only name (no login/PII).

## Architecture
Body shaping is pure (`create-key-request-body.js`); the HTTP client passes fields through
(`provisioning-client.js`); the workspace id + name are decided in the orchestrator
(`mint-key.js`) where the other env-driven controls already live. Data flow:
`mintAndPersist` → `createKey({..., workspaceId})` → `buildCreateKeyBody({..., workspaceId})`
→ `{ ..., workspace_id }`.

## Related Code Files
- Modify: `lib/openrouter/create-key-request-body.js` — accept `workspaceId`, emit
  `workspace_id` (snake_case) only when set.
- Modify: `lib/openrouter/provisioning-client.js` — `createKey` accepts `workspaceId`, forwards
  it to `buildCreateKeyBody`.
- Modify: `lib/keys/mint-key.js` — read `OPENROUTER_WORKSPACE_ID` (default UUID); pass
  `workspaceId`; change `name` to `llmapikey/gh-${githubUserId}`.

## Implementation Steps
1. `create-key-request-body.js`: add `workspaceId` to the param object; in the returned object
   add `workspace_id: workspaceId` — include the field only when `workspaceId` is truthy
   (keep body clean when unset, so omission falls back to the default workspace). Update JSDoc.
2. `provisioning-client.js`: add `workspaceId` to `createKey`'s destructured params and to its
   JSDoc typedef; pass it into `buildCreateKeyBody({ ..., workspaceId })`.
3. `mint-key.js`:
   - Add a small helper or inline: `const workspaceId = process.env.OPENROUTER_WORKSPACE_ID ?? "33179556-3ab3-40a4-af8b-211d322aa94e";`
   - Pass `workspaceId` in the `createKey({...})` call.
   - Change `name` from `llmapikey:${githubUserId}` to `llmapikey/gh-${githubUserId}`.
   - Keep the inline comment that the name is an opaque numeric id (no PII).
4. `npm run build` — must compile clean.

## Success Criteria
- [ ] `buildCreateKeyBody` emits `workspace_id` when `workspaceId` is provided, omits it otherwise.
- [ ] `createKey` forwards `workspaceId`; `mintAndPersist` sources it from `OPENROUTER_WORKSPACE_ID` with the UUID default.
- [ ] Key `name` is `llmapikey/gh-${githubUserId}` (no login/PII).
- [ ] `npm run build` clean.

## Risk Assessment
- **Invalid/inaccessible workspace_id** → OpenRouter returns 4xx; existing `ProvisioningError`
  + compensating `deletePending` already handle create failure gracefully. Mitigation: one-time
  manual probe at deploy (confirm the management key's org owns the workspace).
- **Stale default if UUID ever changes** → it's env-overridable; the default is a fallback only.
