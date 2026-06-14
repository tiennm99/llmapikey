import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState } from "arctic";

import { getGithubOAuth, GITHUB_SCOPES } from "@/lib/auth/github-oauth";
import { sanitizeNext } from "@/lib/auth/sanitize-next";

/**
 * Start GitHub OAuth: create CSRF `state`, stash it + the sanitized `next` in
 * short-lived httpOnly cookies, then 302 to GitHub's authorize URL.
 *
 * @param {Request} request
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const next = sanitizeNext(searchParams.get("next"));

  const state = generateState();
  const oauth = getGithubOAuth(origin);
  const url = oauth.createAuthorizationURL(state, GITHUB_SCOPES);

  // 10-min, single-use CSRF state + the post-login destination. Lax so they
  // survive the top-level redirect back from GitHub. Cookies set via the
  // cookies() store attach to the redirect response in route handlers.
  const attrs = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  };
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, attrs);
  cookieStore.set("oauth_next", next, attrs);

  return NextResponse.redirect(url);
}
