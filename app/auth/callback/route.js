import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getGithubOAuth } from "@/lib/auth/github-oauth";
import { createSession } from "@/lib/auth/session";
import { sanitizeNext } from "@/lib/auth/sanitize-next";

/**
 * GitHub OAuth callback. Verify CSRF state, exchange the code, read the public
 * profile once (`id` + `login`), mint the session cookie, then redirect to the
 * stashed `next`. The access token is never stored.
 *
 * @param {Request} request
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const next = sanitizeNext(cookieStore.get("oauth_next")?.value);

  // Clear the transient cookies regardless of outcome.
  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_next");

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${origin}/?auth_error=1`);
  }

  try {
    const oauth = getGithubOAuth(origin);
    const tokens = await oauth.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "llmapikey",
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return NextResponse.redirect(`${origin}/?auth_error=1`);

    const profile = await res.json();
    const githubUserId = String(profile.id);
    // Anchor on the numeric provider_id, never the mutable login.
    if (!/^\d+$/.test(githubUserId)) {
      return NextResponse.redirect(`${origin}/?auth_error=1`);
    }

    await createSession({ githubUserId, githubUsername: String(profile.login) });
    return NextResponse.redirect(`${origin}${next}`);
  } catch {
    return NextResponse.redirect(`${origin}/?auth_error=1`);
  }
}
