import assert from "node:assert/strict";
import { test } from "node:test";

import { buildFilterDescriptor, clampInt } from "../lib/keys/admin-keys-filters.js";

// Pure filter-shape tests: prove which inputs become SQL predicates, without a
// live DB. The actual queries (admin-keys-queries.js) feed these descriptors
// into parameterized `postgres` fragments — values are never spliced into SQL.

test("buildFilterDescriptor: status filters only for pending/active", () => {
  assert.deepEqual(buildFilterDescriptor({ status: "pending" }), {
    statusFilter: "pending",
    search: null,
  });
  assert.deepEqual(buildFilterDescriptor({ status: "active" }), {
    statusFilter: "active",
    search: null,
  });
});

test("buildFilterDescriptor: 'all' / unknown / empty status → no predicate", () => {
  assert.equal(buildFilterDescriptor({ status: "all" }).statusFilter, null);
  assert.equal(buildFilterDescriptor({ status: "garbage" }).statusFilter, null);
  assert.equal(buildFilterDescriptor({}).statusFilter, null);
});

test("buildFilterDescriptor: q is trimmed; blank → no search", () => {
  assert.equal(buildFilterDescriptor({ q: "  octocat " }).search, "octocat");
  assert.equal(buildFilterDescriptor({ q: "   " }).search, null);
  assert.equal(buildFilterDescriptor({ q: "" }).search, null);
  assert.equal(buildFilterDescriptor({}).search, null);
});

test("buildFilterDescriptor: combines status and search", () => {
  assert.deepEqual(buildFilterDescriptor({ q: "42", status: "active" }), {
    statusFilter: "active",
    search: "42",
  });
});

test("clampInt: clamps to range and falls back on non-numeric", () => {
  assert.equal(clampInt(20, 1, 100, 20), 20);
  assert.equal(clampInt(0, 1, 100, 20), 1);
  assert.equal(clampInt(500, 1, 100, 20), 100);
  assert.equal(clampInt(-5, 0, 100, 0), 0);
  assert.equal(clampInt("abc", 1, 100, 20), 20);
  assert.equal(clampInt(undefined, 1, 100, 20), 20);
  assert.equal(clampInt(3.9, 1, 100, 20), 3); // truncates
});
