"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — anon key only.
 *
 * SCOPE: auth UI only (sign-in / sign-out / session). This client MUST NEVER be
 * used to read or write `llmapikey.api_keys`; that table is server-only and the
 * anon role is denied by RLS. See lib/supabase/server-client.js.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(url, anonKey);
}
