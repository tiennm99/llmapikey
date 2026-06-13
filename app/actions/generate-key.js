"use server";

import "server-only";

import { getCurrentGithubIdentity } from "@/lib/auth/current-github-identity";
import { last4 } from "@/lib/keys/key-format";
import * as repo from "@/lib/keys/api-keys-repository";
import { createKey, deleteKey } from "@/lib/openrouter/provisioning-client";

/**
 * @typedef {Object} GenerateKeyResult
 * @property {"created"|"exists"|"error"} status
 * @property {string} [rawKey]   present only when status === "created" (shown once)
 * @property {string|null} [keyHint] last-4 hint for masked display
 * @property {string} [message]  human-friendly info/error
 */

// A pending row older than this is treated as an interrupted mint and reclaimed,
// so a crashed/timed-out request can never permanently lock a user out.
const STALE_PENDING_MS = 2 * 60 * 1000;

/**
 * Generate exactly one OpenRouter key for the signed-in GitHub user.
 * Flow: idempotency check → gate/limits → reserve → mint → persist → compensate.
 *
 * The DB unique constraint (not application locking) is the concurrency guard:
 * concurrent double-submits both call reserve(), only one gets a row id.
 *
 * @returns {Promise<GenerateKeyResult>}
 */
export async function generateKey() {
  const identity = await getCurrentGithubIdentity();
  if (!identity) {
    return { status: "error", message: "Sign in with GitHub first." };
  }

  // Idempotency fast-path: existing active key → masked hint, never mint again.
  const existing = await repo.findByGithubUserId(identity.githubUserId);
  if (existing && existing.status === "active") {
    return { status: "exists", keyHint: existing.key_hint, message: "You already have a key." };
  }

  // Feature gate: live minting stays OFF until the OpenRouter ToS gate clears.
  if (process.env.PROVISIONING_ENABLED !== "true") {
    return { status: "error", message: "Key giveaway is not live yet. Check back soon." };
  }

  // Sybil kill-switch (cheap early-out; re-checked authoritatively post-reserve).
  const maxKeys = numEnv("MAX_TOTAL_KEYS", 0);
  if (maxKeys > 0 && (await repo.countLiveKeys()) >= maxKeys) {
    return { status: "error", message: "We've reached the current key limit. Please try again later." };
  }

  // Reserve. A conflicting concurrent submit gets null.
  let reservedId = await repo.reserve(identity.githubUserId, identity.githubUsername);
  if (!reservedId) {
    const resolved = await resolveConflict(identity);
    if (resolved.reclaimedId) {
      reservedId = resolved.reclaimedId; // stale pending reclaimed — proceed to mint
    } else {
      return resolved.result;
    }
  }

  // Authoritative ceiling re-check: closes the concurrent-overshoot gap (our own
  // pending row is now counted). Free the reservation if we tipped over.
  if (maxKeys > 0 && (await repo.countLiveKeys()) > maxKeys) {
    await repo.deletePending(reservedId);
    return { status: "error", message: "We've reached the current key limit. Please try again later." };
  }

  return mintAndPersist(reservedId, identity.githubUserId);
}

/**
 * Resolve a reserve() conflict: existing active key, reclaimable stale pending,
 * or an in-progress request.
 *
 * @param {{ githubUserId: string, githubUsername: string }} identity
 * @returns {Promise<{ reclaimedId?: string, result: GenerateKeyResult }>}
 */
async function resolveConflict(identity) {
  const row = await repo.findByGithubUserId(identity.githubUserId);
  if (row?.status === "active") {
    return { result: { status: "exists", keyHint: row.key_hint, message: "You already have a key." } };
  }
  // Pending row. If stale, an earlier mint was interrupted — reclaim and retry.
  if (row && isStale(row.created_at, STALE_PENDING_MS)) {
    await repo.deletePending(row.id);
    const retryId = await repo.reserve(identity.githubUserId, identity.githubUsername);
    if (retryId) return { reclaimedId: retryId, result: { status: "error" } };
  }
  return {
    result: { status: "error", message: "A key request is already in progress. Try again shortly." },
  };
}

/**
 * Mint then persist, compensating on either failure.
 *
 * @param {string} reservedId
 * @param {string} githubUserId
 * @returns {Promise<GenerateKeyResult>}
 */
async function mintAndPersist(reservedId, githubUserId) {
  let mint;
  try {
    mint = await createKey({
      name: `llmapikey:${githubUserId}`, // opaque numeric id — no PII into OpenRouter logs
      limitUsd: numEnv("KEY_DAILY_LIMIT_USD", 10),
      resetPeriod: "daily",
      includeByok: true,
      expiresAt: expiryIso(numEnv("KEY_EXPIRY_DAYS", 90)),
    });
  } catch {
    await repo.deletePending(reservedId); // free the reservation; no orphan key exists
    return { status: "error", message: "Could not create your key. Please try again." };
  }

  try {
    await repo.activate(reservedId, { hash: mint.hash, hint: last4(mint.key) });
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

/**
 * Parse a numeric env var, falling back if missing or malformed.
 *
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
function numEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * @param {string|Date} createdAt
 * @param {number} maxAgeMs
 * @returns {boolean}
 */
function isStale(createdAt, maxAgeMs) {
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && Date.now() - t > maxAgeMs;
}

/**
 * ISO timestamp `days` in the future for the key's expires_at.
 *
 * @param {number} days
 * @returns {string}
 */
function expiryIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
