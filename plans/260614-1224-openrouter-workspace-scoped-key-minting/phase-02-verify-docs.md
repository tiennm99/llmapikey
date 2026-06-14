---
phase: 2
title: Verify & Docs
status: completed
priority: P2
effort: 20m
dependencies:
  - 1
---

# Phase 2: Verify & Docs

## Overview
Lock the behavior with a unit test and document the new env var.

## Requirements
- Functional: test proves `workspace_id` flows into the request body; docs list `OPENROUTER_WORKSPACE_ID`.
- Non-functional: tests pass under plain `node --test`; no secret committed.

## Related Code Files
- Modify: `tests/provisioning-client.test.js` — add a `buildCreateKeyBody` case asserting
  `workspace_id` present when `workspaceId` given, and absent when omitted.
- Modify: `.env.example` — add `OPENROUTER_WORKSPACE_ID` under the OpenRouter section with the
  default UUID + comment (server-only, not secret but env-driven).
- Modify: `README.md` — add `OPENROUTER_WORKSPACE_ID` row to the env table; one line noting
  minted keys are placed in this workspace.

## Implementation Steps
1. `tests/provisioning-client.test.js`: import `buildCreateKeyBody` (already exercised here);
   add two assertions — with `workspaceId: "ws-uuid"` → body has `workspace_id: "ws-uuid"`;
   without it → `"workspace_id" in body === false`.
2. `.env.example`: under `# ---- OpenRouter ...`, add
   `# Workspace the minted keys are created in (create-key workspace_id).`
   `OPENROUTER_WORKSPACE_ID=33179556-3ab3-40a4-af8b-211d322aa94e`.
3. `README.md`: env table row `| OPENROUTER_WORKSPACE_ID | Workspace minted keys are created in (create-key workspace_id) |`.
4. `npm test` — all green. `npm run build` — clean.

## Success Criteria
- [ ] New test asserts presence + omission of `workspace_id`; `npm test` green.
- [ ] `.env.example` + `README.md` document `OPENROUTER_WORKSPACE_ID`.
- [ ] `npm run build` clean.

## Risk Assessment
- **Test coupling** — assert only the `workspace_id` field, not the whole body, to avoid
  brittleness against unrelated body changes.
