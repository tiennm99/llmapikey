import assert from "node:assert/strict";
import { test } from "node:test";

import { last4, maskFromHint } from "../lib/keys/key-format.js";

test("last4 returns the final four characters", () => {
  assert.equal(last4("sk-or-v1-abcd1234"), "1234");
});

test("last4 handles short and empty input", () => {
  assert.equal(last4("xy"), "xy");
  assert.equal(last4(""), "");
  assert.equal(last4(/** @type {any} */ (undefined)), "");
});

test("maskFromHint builds a masked string from the hint", () => {
  assert.equal(maskFromHint("1234"), "sk-or-v1-••••1234");
});

test("maskFromHint degrades gracefully without a hint", () => {
  assert.equal(maskFromHint(null), "••••");
  assert.equal(maskFromHint(""), "••••");
});
