/**
 * Single source of truth for the OpenRouter key `name` this app mints. Used by
 * the mint path (to set the name) and the reconcile script (to recognize app
 * keys). Keep both sides on this constant so they can never drift apart.
 *
 * The name is opaque and non-PII: a fixed prefix + the numeric, immutable GitHub
 * id (never the mutable login).
 */

/** Prefix on every key this app mints. Reconcile matches app keys by this. */
export const KEY_NAME_PREFIX = "llmapikey/gh-";

/**
 * Build the OpenRouter key name for a GitHub user.
 *
 * @param {string} githubUserId  numeric GitHub provider_id
 * @returns {string}
 */
export function keyName(githubUserId) {
  return `${KEY_NAME_PREFIX}${githubUserId}`;
}
