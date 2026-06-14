import "server-only";

import { last4 } from "@/lib/keys/key-format";
import * as repo from "@/lib/keys/api-keys-repository";
import { createKey, deleteKey } from "@/lib/openrouter/provisioning-client";

/**
 * Shared mint-and-persist logic for a reserved key row. Used by both the
 * self-serve `generateKey()` action and the admin `adminCreateKey()` action so
 * the reserve→mint→activate→compensate flow lives in exactly one place (DRY).
 *
 * @typedef {Object} MintResult
 * @property {"created"|"error"} status
 * @property {string} [rawKey]   present only when status === "created" (shown once)
 * @property {string} [keyHint]  last-4 hint for masked display
 * @property {string} [message]  human-friendly error
 */

/**
 * Mint then persist against an already-reserved row, compensating on either
 * failure so a crashed mint never leaves an orphaned billable key or a stuck
 * pending row.
 *
 * @param {string} reservedId
 * @param {string} githubUserId
 * @returns {Promise<MintResult>}
 */
export async function mintAndPersist(reservedId, githubUserId) {
  let mint;
  try {
    mint = await createKey({
      name: `llmapikey/gh-${githubUserId}`, // opaque numeric id — no PII into OpenRouter logs
      limitUsd: numEnv("KEY_DAILY_LIMIT_USD", 10),
      resetPeriod: "daily",
      includeByok: true,
      expiresAt: expiryIso(numEnv("KEY_EXPIRY_DAYS", 90)),
      workspaceId: workspaceId(),
    });
  } catch {
    await repo.deletePending(reservedId); // free the reservation; no orphan key exists
    return { status: "error", message: "Could not create your key. Please try again." };
  }

  try {
    await repo.activate(reservedId, { hash: mint.hash, hint: last4(mint.key), rawKey: mint.key });
  } catch {
    try {
      await deleteKey(mint.hash); // avoid an orphaned billable key
    } catch {
      // best-effort; reconcile-keys.js will surface any leak
    }
    await repo.deletePending(reservedId);
    return { status: "error", message: "Could not save your key. Please try again." };
  }

  // Raw key returned for one-time display. Never logged or re-persisted.
  return { status: "created", rawKey: mint.key, keyHint: last4(mint.key) };
}

/** Default OpenRouter workspace for minted keys (env-overridable). */
const DEFAULT_WORKSPACE_ID = "33179556-3ab3-40a4-af8b-211d322aa94e";

/**
 * Workspace the minted keys are created in. Override via OPENROUTER_WORKSPACE_ID;
 * the default places keys in the project's intended workspace.
 *
 * @returns {string}
 */
export function workspaceId() {
  return process.env.OPENROUTER_WORKSPACE_ID || DEFAULT_WORKSPACE_ID;
}

/**
 * Parse a numeric env var, falling back if missing or malformed.
 *
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
export function numEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * ISO timestamp `days` in the future for the key's expires_at.
 *
 * @param {number} days
 * @returns {string}
 */
export function expiryIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
