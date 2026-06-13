import Link from "next/link";

import { createServerAuthClient } from "@/lib/supabase/server-client";

/**
 * Session-aware header (server component). Shows Dashboard + sign-out when
 * authenticated; just Docs otherwise. Display only — `user_name` is fine here.
 */
export async function SiteHeader() {
  let username = null;
  try {
    const supabase = await createServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    username = user?.user_metadata?.user_name ?? null;
  } catch {
    username = null; // auth not configured (no env) — render signed-out header
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        llmapikey
      </Link>
      <nav className="site-nav">
        <Link href="/docs">Docs</Link>
        {username ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <span className="muted">@{username}</span>
            <form action="/auth/sign-out" method="post">
              <button className="btn secondary" type="submit">
                Sign out
              </button>
            </form>
          </>
        ) : null}
      </nav>
    </header>
  );
}
