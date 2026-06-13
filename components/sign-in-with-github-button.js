"use client";

import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

/**
 * GitHub sign-in button. Kicks off Supabase OAuth; minimal scope (read:user).
 *
 * @param {{ next?: string, label?: string }} props
 */
export function SignInWithGithubButton({ next = "/dashboard", label = "Sign in with GitHub" }) {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo, scopes: "read:user" },
    });
    if (error) setLoading(false); // on success the browser navigates away
  }

  return (
    <button className="btn" onClick={handleSignIn} disabled={loading}>
      {loading ? "Redirecting…" : label}
    </button>
  );
}
