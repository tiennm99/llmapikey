import "server-only";

import { getCurrentGithubIdentity } from "@/lib/auth/current-github-identity";
import { isAdmin, parseAdminIds } from "@/lib/auth/admin-allowlist";

// Re-export the pure helpers so server code has a single import surface while
// the unit tests import them from `admin-allowlist.js` (no `server-only` guard).
export { isAdmin, parseAdminIds };

/**
 * Resolve the current GitHub identity and gate it in one call — the single gate
 * used by the `/admin` page and every admin server action.
 *
 * `getCurrentGithubIdentity()` returns `null` when unauthenticated and can throw
 * on malformed session metadata; both map to "not admin".
 *
 * @returns {Promise<import('./current-github-identity').GithubIdentity|null>}
 *   the identity when admin, else `null` (caller maps to `notFound()`/rejection).
 */
export async function requireAdminIdentity() {
  try {
    const identity = await getCurrentGithubIdentity();
    return identity && isAdmin(identity) ? identity : null;
  } catch {
    return null;
  }
}
