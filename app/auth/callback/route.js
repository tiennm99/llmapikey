import { NextResponse } from "next/server";

import { createServerAuthClient } from "@/lib/supabase/server-client";

/**
 * OAuth callback: exchange the GitHub auth code for a Supabase session cookie,
 * then redirect to `next` (default /dashboard).
 *
 * @param {Request} request
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createServerAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}

/**
 * Only allow same-origin relative paths to avoid open-redirect.
 *
 * @param {string | null} next
 * @returns {string}
 */
function sanitizeNext(next) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}
