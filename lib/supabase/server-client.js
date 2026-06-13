import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie-based Supabase client (anon key) for reading/refreshing the auth
 * session on the server. Use this to know WHO the request is (Phase 3 identity),
 * never to touch `api_keys` — that table lives in the unexposed `llmapikey`
 * schema and is reached only via the direct Postgres client (lib/db).
 *
 * In Server Components cookie writes throw; we swallow that — session refresh
 * still works in route handlers / server actions where writes are allowed.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function createServerAuthClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // Safe to ignore: middleware/route handlers refresh the session.
        }
      },
    },
  });
}

/**
 * @param {string} name
 * @returns {string}
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
