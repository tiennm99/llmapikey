import { NextResponse } from "next/server";

import { clearSession } from "@/lib/auth/session";

/**
 * Sign out: clear the session cookie and redirect home. POST (the header uses a
 * `method="post"` form); 303 turns the POST into a GET on the redirect.
 *
 * @param {Request} request
 */
export async function POST(request) {
  await clearSession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
