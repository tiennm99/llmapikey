import "server-only";

import { createServerAuthClient } from "@/lib/supabase/server-client";

/**
 * @typedef {Object} GithubIdentity
 * @property {string} githubUserId   Numeric, immutable GitHub id (provider_id).
 * @property {string} githubUsername GitHub login (mutable — display only).
 */

/**
 * Resolve the current GitHub identity from the validated server session.
 *
 * Identity anchor: `provider_id` — the numeric, immutable GitHub id. NOT
 * `user_name` (the mutable login — a rename could otherwise mint a second key)
 * and NOT `sub` (the Supabase user UUID). `user_metadata` is end-user-mutable,
 * so it scopes queries server-side only and is never used as an RLS/auth claim.
 *
 * Uses `getUser()` (validates the token with Supabase), not `getSession()`.
 *
 * @returns {Promise<GithubIdentity | null>} null when unauthenticated.
 * @throws if a session exists but its GitHub metadata is missing/non-numeric.
 */
export async function getCurrentGithubIdentity() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  if (meta.provider_id == null || meta.user_name == null) {
    throw new Error(
      "GitHub identity missing provider_id/user_name in user_metadata",
    );
  }

  const githubUserId = String(meta.provider_id);
  // Assert numeric — guards against accidentally anchoring on the mutable login.
  if (!/^\d+$/.test(githubUserId)) {
    throw new Error(`Expected numeric GitHub provider_id, got: ${githubUserId}`);
  }

  return { githubUserId, githubUsername: String(meta.user_name) };
}
