/**
 * Pure key formatting helpers. No secrets, no I/O — safe to import anywhere and
 * unit-testable in isolation.
 */

/**
 * Last 4 chars of a raw key, for masked display/storage. The raw key itself is
 * never stored; only this hint is.
 *
 * @param {string} rawKey
 * @returns {string}
 */
export function last4(rawKey) {
  if (typeof rawKey !== "string" || rawKey.length === 0) return "";
  return rawKey.slice(-4);
}

/**
 * Masked representation from a stored last-4 hint, e.g. "sk-or-v1-••••1234".
 *
 * @param {string | null | undefined} hint
 * @returns {string}
 */
export function maskFromHint(hint) {
  if (!hint) return "••••";
  return `sk-or-v1-••••${hint}`;
}
