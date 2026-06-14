import Link from "next/link";

import { getCurrentGithubIdentity } from "@/lib/auth/current-github-identity";

/**
 * Session-aware header (server component). Shows Dashboard + sign-out when
 * authenticated; just Docs otherwise. Display only — the login is fine here.
 */
export async function SiteHeader() {
  let username = null;
  try {
    const identity = await getCurrentGithubIdentity();
    username = identity?.githubUsername ?? null;
  } catch {
    username = null; // auth not configured (no secret) — render signed-out header
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
