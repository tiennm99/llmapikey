import { SignJWT, jwtVerify } from "jose";

/**
 * Pure JWT sign/verify for the session token — no cookies, no `server-only`, so
 * it is unit-testable in node:test. `session.js` wraps these with the cookie
 * store. HS256 over the GitHub identity; subject = numeric `provider_id`.
 */

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Encode + validate the signing secret. Throws (config error) when missing or
 * shorter than 32 bytes.
 *
 * @param {string | undefined} raw
 * @returns {Uint8Array}
 */
export function encodeSecret(raw) {
  if (!raw || Buffer.byteLength(raw, "utf8") < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET must be set and at least 32 bytes long",
    );
  }
  return new TextEncoder().encode(raw);
}

/**
 * Sign the identity into a JWT.
 *
 * @param {{ githubUserId: string, githubUsername: string }} identity
 * @param {Uint8Array} secret
 * @returns {Promise<string>}
 */
export function signSessionToken({ githubUserId, githubUsername }, secret) {
  return new SignJWT({ login: githubUsername })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(githubUserId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify a JWT and extract the identity. Returns null on any token error
 * (missing/tampered/expired) or when the subject is not a numeric provider_id.
 *
 * @param {string | undefined | null} token
 * @param {Uint8Array} secret
 * @returns {Promise<{ githubUserId: string, githubUsername: string } | null>}
 */
export async function verifySessionToken(token, secret) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const githubUserId = String(payload.sub ?? "");
    // Re-assert the numeric provider_id invariant (defense in depth).
    if (!/^\d+$/.test(githubUserId)) return null;
    return { githubUserId, githubUsername: String(payload.login ?? "") };
  } catch {
    return null;
  }
}
