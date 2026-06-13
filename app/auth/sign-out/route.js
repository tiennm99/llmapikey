import { NextResponse } from "next/server";

import { createServerAuthClient } from "@/lib/supabase/server-client";

/**
 * Sign out: clear the Supabase session and redirect home.
 *
 * @param {Request} request
 */
export async function POST(request) {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
