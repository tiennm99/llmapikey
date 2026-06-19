"use server";

import "server-only";

import { getCurrentGithubIdentity } from "@/lib/auth/current-github-identity";
import * as repo from "@/lib/keys/api-keys-repository";
import { mintAndPersist, numEnv } from "@/lib/keys/mint-key";
import { keyMintingGateMessage } from "@/lib/project-status";

/**
 * @typedef {Object} GenerateKeyResult
 * @property {"created"|"exists"|"error"} status
 * @property {string|null} [rawKey] full key, present for "created" and "exists" (retrievable)
 * @property {string} [message]  human-friendly info/error
 */

// A pending row older than this is treated as an interrupted mint and reclaimed,
// so a crashed/timed-out request can never permanently lock a user out.
// Aggressive (mints take seconds); reconcile-keys.js only *reports* at a more
// conservative 10 min to avoid flagging genuinely in-flight reservations.
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

  const gateMessage = keyMintingGateMessage();
  if (gateMessage) {
    return { status: "error", message: gateMessage };
  }

  // Idempotency fast-path: existing active key → return it, never mint again.
  const existing = await repo.findByGithubUserId(identity.githubUserId);
  if (existing && existing.status === "active") {
    return { status: "exists", rawKey: existing.openrouter_key, message: "You already have a key." };
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
  // pending row is now counted). The `>` here is intentional — the pre-reserve
  // check above uses `>=` to reject at the cap, whereas here our own pending row
  // is already counted, so reject only when it pushed the total strictly over.
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
 * Returns either a fresh reservation id to mint against, or a terminal result.
 *
 * @param {{ githubUserId: string, githubUsername: string }} identity
 * @returns {Promise<{ reclaimedId?: string, result?: GenerateKeyResult }>}
 */
async function resolveConflict(identity) {
  const row = await repo.findByGithubUserId(identity.githubUserId);
  if (row?.status === "active") {
    return { result: { status: "exists", rawKey: row.openrouter_key, message: "You already have a key." } };
  }
  // Pending row. If stale, an earlier mint was interrupted — reclaim and retry.
  if (row && isStale(row.created_at, STALE_PENDING_MS)) {
    await repo.deletePending(row.id);
    const retryId = await repo.reserve(identity.githubUserId, identity.githubUsername);
    if (retryId) return { reclaimedId: retryId };
  }
  return {
    result: { status: "error", message: "A key request is already in progress. Try again shortly." },
  };
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
