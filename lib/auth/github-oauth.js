import "server-only";

import { GitHub } from "arctic";

/**
 * GitHub OAuth scopes. `read:user` is enough to read the public profile
 * (`id` + `login`) at the callback; no email scope, no token storage.
 */
export const GITHUB_SCOPES = ["read:user"];

/**
 * Build the Arctic GitHub OAuth client.
 *
 * Redirect URI is derived from the request `origin` (`${origin}/auth/callback`),
 * so no callback env is needed. GitHub validates this against the OAuth App's
 * registered callback, so requests reaching the app on a non-registered host
 * (e.g. a Vercel deployment-hash URL) will fail at GitHub — link only the
 * canonical domain. Login and callback MUST pass the same origin so the
 * `redirect_uri` matches across the authorize + token-exchange steps.
 *
 * @param {string} origin Request origin, e.g. `https://llmapikey.vercel.app`.
 * @returns {import('arctic').GitHub}
 */
export function getGithubOAuth(origin) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET",
    );
  }
  return new GitHub(clientId, clientSecret, `${origin}/auth/callback`);
}
