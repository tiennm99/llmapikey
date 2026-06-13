import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCreateKeyBody } from "../lib/openrouter/create-key-request-body.js";

test("create-key body uses OpenRouter snake_case fields", () => {
  const body = buildCreateKeyBody({
    name: "llmapikey:12345",
    limitUsd: 10,
    resetPeriod: "daily",
    includeByok: true,
    expiresAt: "2026-09-11T00:00:00.000Z",
  });

  assert.deepEqual(body, {
    name: "llmapikey:12345",
    limit: 10,
    limit_reset: "daily",
    include_byok_in_limit: true,
    expires_at: "2026-09-11T00:00:00.000Z",
  });
});

test("create-key body has no camelCase leakage", () => {
  const body = buildCreateKeyBody({
    name: "x",
    limitUsd: 5,
    resetPeriod: "daily",
    includeByok: false,
    expiresAt: "2026-01-01T00:00:00.000Z",
  });
  const keys = Object.keys(body);
  assert.ok(!keys.includes("limitReset"));
  assert.ok(!keys.includes("includeByok"));
  assert.ok(!keys.includes("expiresAt"));
});
