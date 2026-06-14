import "server-only";

import { readSession } from "@/lib/auth/session";

/**
 * @typedef {Object} GithubIdentity
 * @property {string} githubUserId   Numeric, immutable GitHub id (provider_id).
 * @property {string} githubUsername GitHub login (mutable — display only).
 */

/**
 * Resolve the current GitHub identity from the signed session cookie.
 *
 * Identity anchor: `provider_id` — the numeric, immutable GitHub id. NOT the
 * mutable login (a rename could otherwise mint a second key). The numeric
 * invariant is enforced inside `readSession` (defense in depth) and again at
 * mint time in the OAuth callback. `githubUsername` is display-only.
 *
 * @returns {Promise<GithubIdentity | null>} null when unauthenticated.
 */
export async function getCurrentGithubIdentity() {
  return readSession();
}
