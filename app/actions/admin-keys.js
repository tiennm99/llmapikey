"use server";

import "server-only";

import { requireAdminIdentity } from "@/lib/auth/is-admin";
import * as repo from "@/lib/keys/api-keys-repository";
import { mintAndPersist, numEnv } from "@/lib/keys/mint-key";
import { deleteKey } from "@/lib/openrouter/provisioning-client";

/**
 * Admin actions over the `api_keys` registry. EVERY action re-gates with
 * `requireAdminIdentity()` server-side — the `/admin` page gate is
 * defense-in-depth only; server actions are independently invocable.
 *
 * @typedef {Object} AdminActionResult
 * @property {"revoked"|"created"|"exists"|"error"} status
 * @property {string} [keyHint] last-4 hint (create only). Raw key is NEVER returned here.
 * @property {string} [message] human-friendly info/error
 */

/**
 * Revoke a key: delete the upstream OpenRouter key (idempotent), then the DB row.
 * Pending rows (null hash) skip the upstream call and just remove the row. If the
 * upstream delete fails for a non-404 reason, the DB row is kept so the key isn't
 * silently orphaned (reconcile-keys.js will report it).
 *
 * @param {string} id  api_keys row id
 * @returns {Promise<AdminActionResult>}
 */
export async function revokeKey(id) {
  if (!(await requireAdminIdentity())) {
    return { status: "error", message: "Not authorized." };
  }

  const row = await repo.findById(id);
  if (!row) return { status: "error", message: "Key not found." };

  if (row.openrouter_key_hash) {
    try {
      await deleteKey(row.openrouter_key_hash); // idempotent on 404
    } catch {
      return { status: "error", message: "Could not revoke upstream key. Try again." };
    }
  }

  await repo.deleteById(id);
  return { status: "revoked" };
}

/**
 * Manually mint a key for an arbitrary GitHub user (admin override). Reuses the
 * shared reserve→mint→activate flow and honors PROVISIONING_ENABLED and the
 * MAX_TOTAL_KEYS ceiling, exactly like the self-serve path.
 *
 * @param {{ githubUserId: string, githubUsername: string }} params
 * @returns {Promise<AdminActionResult>}
 */
export async function adminCreateKey({ githubUserId, githubUsername } = {}) {
  if (!(await requireAdminIdentity())) {
    return { status: "error", message: "Not authorized." };
  }

  const userId = String(githubUserId ?? "").trim();
  if (!/^\d+$/.test(userId)) {
    return { status: "error", message: "githubUserId must be numeric (GitHub provider_id)." };
  }
  const username = String(githubUsername ?? "").trim() || userId;

  // Idempotency: an existing active key is never re-minted.
  const existing = await repo.findByGithubUserId(userId);
  if (existing && existing.status === "active") {
    return { status: "exists", keyHint: existing.key_hint, message: "User already has a key." };
  }

  if (process.env.PROVISIONING_ENABLED !== "true") {
    return { status: "error", message: "Key giveaway is not live yet. Check back soon." };
  }

  const maxKeys = numEnv("MAX_TOTAL_KEYS", 0);
  if (maxKeys > 0 && (await repo.countLiveKeys()) >= maxKeys) {
    return { status: "error", message: "Key limit reached. Cannot mint more keys." };
  }

  const reservedId = await repo.reserve(userId, username);
  if (!reservedId) {
    // A pending row exists (in-flight or a prior active resolved above).
    return { status: "error", message: "A key request for this user is already in progress." };
  }

  // Authoritative ceiling re-check now that our own pending row is counted.
  if (maxKeys > 0 && (await repo.countLiveKeys()) > maxKeys) {
    await repo.deletePending(reservedId);
    return { status: "error", message: "Key limit reached. Cannot mint more keys." };
  }

  const result = await mintAndPersist(reservedId, userId);
  if (result.status !== "created") {
    return { status: "error", message: result.message };
  }
  // Surface only the masked hint to the admin UI — never the raw key here.
  return { status: "created", keyHint: result.keyHint };
}
