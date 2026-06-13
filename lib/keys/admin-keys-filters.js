/**
 * Pure filter/pagination helpers for the admin key queries. No `server-only`
 * guard and no I/O, so they're unit-testable under plain node (mirroring
 * `key-format.js`). The SQL-composing queries that consume them live in
 * `admin-keys-queries.js` behind the `server-only` boundary.
 */

/**
 * Reduce raw filter input to a normalized, validated descriptor.
 *
 * - `status` only filters for the known values `pending`/`active`; anything else
 *   (including `all`/empty) ⇒ no status predicate.
 * - `q` is trimmed; blank ⇒ no search predicate.
 *
 * @param {{ q?: string, status?: string }} [filters]
 * @returns {{ statusFilter: 'pending'|'active'|null, search: string|null }}
 */
export function buildFilterDescriptor({ q, status } = {}) {
  const statusFilter = status === "pending" || status === "active" ? status : null;
  const term = typeof q === "string" ? q.trim() : "";
  return { statusFilter, search: term || null };
}

/**
 * Clamp a value to an integer within [min, max], falling back when non-numeric.
 *
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
export function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}
