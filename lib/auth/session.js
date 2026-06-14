import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_MAX_AGE_SECONDS,
  encodeSecret,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

/**
 * Stateless signed-cookie session. The app has no user table — identity is just
 * the GitHub `provider_id` (numeric, immutable) + login, carried in an HS256 JWT
 * inside an httpOnly cookie. No DB session row; on expiry the user re-logs in.
 * JWT logic lives in `session-token.js` (testable); this module wires cookies.
 */

const COOKIE_NAME = "llmapikey_session";

/**
 * Cookie attributes. SameSite=Lax (not Strict) so the cookie rides the
 * top-level GET redirect back from GitHub; Strict would drop it.
 */
const COOKIE_ATTRS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/** @returns {Uint8Array} */
function secret() {
  return encodeSecret(process.env.AUTH_SESSION_SECRET);
}

/**
 * Sign the identity into the session cookie.
 *
 * @param {{ githubUserId: string, githubUsername: string }} identity
 */
export async function createSession(identity) {
  const jwt = await signSessionToken(identity, secret());
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, COOKIE_ATTRS);
}

/**
 * Read + verify the session cookie. Token errors → null; config errors (bad
 * `AUTH_SESSION_SECRET`) propagate (intentional fail-fast).
 *
 * @returns {Promise<{ githubUserId: string, githubUsername: string } | null>}
 */
export async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySessionToken(token, secret());
}

/** Clear the session cookie (sign-out). */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
