/**
 * Open-redirect guard. Only same-origin relative paths are allowed; anything
 * else (absolute URLs, protocol-relative `//host`, missing) falls back to
 * `/dashboard`. Shared by `/auth/login` and `/auth/callback`.
 *
 * @param {string | null | undefined} next
 * @returns {string}
 */
export function sanitizeNext(next) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}
