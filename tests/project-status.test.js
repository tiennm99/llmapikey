import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getProjectStatus,
  isKeyMintingEnabled,
  keyMintingGateMessage,
  PROJECT_STATUS,
} from "../lib/project-status.js";

function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("project status defaults to pending when env is missing or unknown", () => {
  withEnv({ PROJECT_STATUS: undefined }, () => {
    assert.equal(getProjectStatus(), PROJECT_STATUS.PENDING);
  });

  withEnv({ PROJECT_STATUS: "enabled" }, () => {
    assert.equal(getProjectStatus(), PROJECT_STATUS.PENDING);
  });
});

test("project status accepts live case-insensitively", () => {
  withEnv({ PROJECT_STATUS: " LIVE " }, () => {
    assert.equal(getProjectStatus(), PROJECT_STATUS.LIVE);
  });
});

test("key minting requires both live project status and provisioning enabled", () => {
  withEnv({ PROJECT_STATUS: "pending", PROVISIONING_ENABLED: "true" }, () => {
    assert.equal(isKeyMintingEnabled(), false);
    assert.match(keyMintingGateMessage(), /pending/);
  });

  withEnv({ PROJECT_STATUS: "live", PROVISIONING_ENABLED: "false" }, () => {
    assert.equal(isKeyMintingEnabled(), false);
    assert.equal(keyMintingGateMessage(), "Key giveaway is not live yet. Check back soon.");
  });

  withEnv({ PROJECT_STATUS: "live", PROVISIONING_ENABLED: "true" }, () => {
    assert.equal(isKeyMintingEnabled(), true);
    assert.equal(keyMintingGateMessage(), null);
  });
});
