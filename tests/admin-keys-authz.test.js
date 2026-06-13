import assert from "node:assert/strict";
import { test } from "node:test";

import { isAdmin } from "../lib/auth/admin-allowlist.js";

const ENV = "ADMIN_GITHUB_USER_IDS";

/**
 * Authz-guard contract. Both admin server actions (`revokeKey`, `adminCreateKey`)
 * gate on `requireAdminIdentity()`, which returns the identity only when
 * `isAdmin(identity)` is true and `null` otherwise (the action then performs NO
 * DB/OpenRouter work). The full action path needs Supabase + a DB, so here we
 * assert the deterministic guard logic those actions depend on: a non-admin (or
 * an empty allowlist) is never admitted, so the actions can only short-circuit
 * to a rejection with no side effects.
 */

function withAllowlist(value, fn) {
  const prev = process.env[ENV];
  if (value === undefined) delete process.env[ENV];
  else process.env[ENV] = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env[ENV];
    else process.env[ENV] = prev;
  }
}

test("guard denies a non-admin identity (action would short-circuit, no side effects)", () => {
  withAllowlist("12345", () => {
    assert.equal(isAdmin({ githubUserId: "99999" }), false);
  });
});

test("guard denies when no admins are configured (fail-closed)", () => {
  withAllowlist("", () => {
    assert.equal(isAdmin({ githubUserId: "12345" }), false);
  });
  withAllowlist(undefined, () => {
    assert.equal(isAdmin({ githubUserId: "12345" }), false);
  });
});

test("guard denies an unauthenticated caller (null identity)", () => {
  withAllowlist("12345", () => {
    assert.equal(isAdmin(null), false);
  });
});

test("guard admits only an exact allowlisted id", () => {
  withAllowlist("12345", () => {
    assert.equal(isAdmin({ githubUserId: "12345" }), true);
  });
});
