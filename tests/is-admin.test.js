import assert from "node:assert/strict";
import { test } from "node:test";

import { parseAdminIds, isAdmin } from "../lib/auth/admin-allowlist.js";

const ENV = "ADMIN_GITHUB_USER_IDS";

/** Run `fn` with the allowlist env set to `value`, restoring it afterwards. */
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

test("parseAdminIds: empty / unset → []", () => {
  assert.deepEqual(parseAdminIds(""), []);
  assert.deepEqual(parseAdminIds(undefined), []);
  assert.deepEqual(parseAdminIds(null), []);
});

test("parseAdminIds: trims, drops empties and trailing commas", () => {
  assert.deepEqual(parseAdminIds(" 1 , 2 ,,3 "), ["1", "2", "3"]);
  assert.deepEqual(parseAdminIds("42"), ["42"]);
});

test("isAdmin: matches an id in the allowlist", () => {
  withAllowlist("12345,67890", () => {
    assert.equal(isAdmin({ githubUserId: "67890" }), true);
    assert.equal(isAdmin({ githubUserId: "12345" }), true);
  });
});

test("isAdmin: rejects ids not in the allowlist", () => {
  withAllowlist("12345", () => {
    assert.equal(isAdmin({ githubUserId: "99999" }), false);
  });
});

test("isAdmin: exact match only — no substring/prefix match", () => {
  withAllowlist("42", () => {
    assert.equal(isAdmin({ githubUserId: "4" }), false);
    assert.equal(isAdmin({ githubUserId: "420" }), false);
    assert.equal(isAdmin({ githubUserId: "42" }), true);
  });
});

test("isAdmin: fail-closed for null/missing identity and empty allowlist", () => {
  withAllowlist("12345", () => {
    assert.equal(isAdmin(null), false);
    assert.equal(isAdmin(undefined), false);
    assert.equal(isAdmin({}), false);
  });
  withAllowlist("", () => {
    assert.equal(isAdmin({ githubUserId: "12345" }), false);
  });
});
