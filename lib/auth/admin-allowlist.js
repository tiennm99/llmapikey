/**
 * Pure admin-allowlist logic. No `server-only` guard and no network I/O — only
 * an env read — so it is unit-testable under plain node, mirroring
 * `lib/keys/key-format.js`. The session-resolving gate (`requireAdminIdentity`)
 * lives in `lib/auth/is-admin.js`, which adds the `server-only` boundary.
 *
 * Authz is keyed on the numeric, immutable GitHub `provider_id` — the same
 * identity anchor used for key ownership — never the mutable login.
 */

/**
 * Parse the comma-separated allowlist env value into trimmed, non-empty ids.
 *
 * @param {string|undefined|null} raw  e.g. "12345, 67890"
 * @returns {string[]} numeric provider_id strings; `[]` when empty/unset.
 */
export function parseAdminIds(raw) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * True iff the identity's numeric GitHub id is in `ADMIN_GITHUB_USER_IDS`.
 * Compared as exact strings — never a substring/prefix match, so "4" can never
 * match "42". Empty/unset env ⇒ zero admins (fail-closed).
 *
 * @param {{ githubUserId?: string }|null|undefined} identity
 * @returns {boolean}
 */
export function isAdmin(identity) {
  const id = identity?.githubUserId;
  if (!id) return false;
  return parseAdminIds(process.env.ADMIN_GITHUB_USER_IDS).includes(id);
}
