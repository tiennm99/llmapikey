import { getCurrentGithubIdentity } from "@/lib/auth/current-github-identity";
import { GenerateKeyPanel } from "@/components/generate-key-panel";
import { SignInWithGithubButton } from "@/components/sign-in-with-github-button";
import * as repo from "@/lib/keys/api-keys-repository";

// Reads the session per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * Auth-gated dashboard. Unauthenticated → sign-in prompt. Authenticated →
 * generate / existing-key panel.
 */
export default async function DashboardPage() {
  const identity = await getCurrentGithubIdentity();

  if (!identity) {
    return (
      <main>
        <h1>Dashboard</h1>
        <div className="panel">
          <p>Sign in with GitHub to get your free key.</p>
          <SignInWithGithubButton next="/dashboard" />
        </div>
      </main>
    );
  }

  let existingHint = null;
  try {
    const row = await repo.findByGithubUserId(identity.githubUserId);
    if (row && row.status === "active") existingHint = row.key_hint;
  } catch {
    // DB not reachable (e.g. local without DATABASE_URL) — show the panel; the
    // server action gates minting and reports a friendly error.
  }

  const model = process.env.NEXT_PUBLIC_OPENROUTER_MODEL ?? "minimax/minimax-m3";
  const repoUrl = process.env.NEXT_PUBLIC_REPO_URL ?? "#";

  return (
    <main>
      <h1>Your key</h1>
      <p className="muted">Signed in as @{identity.githubUsername}.</p>
      <GenerateKeyPanel existingHint={existingHint} model={model} repoUrl={repoUrl} />
    </main>
  );
}
