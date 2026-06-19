import { getCurrentGithubIdentity } from "@/lib/auth/current-github-identity";
import { GenerateKeyPanel } from "@/components/generate-key-panel";
import { SignInWithGithubButton } from "@/components/sign-in-with-github-button";
import * as repo from "@/lib/keys/api-keys-repository";
import { keyMintingGateMessage } from "@/lib/project-status";

// Reads the session per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * Auth-gated dashboard. Unauthenticated → sign-in prompt. Authenticated →
 * generate / existing-key panel.
 */
export default async function DashboardPage() {
  const disabledReason = keyMintingGateMessage();
  const identity = await getCurrentGithubIdentity();

  if (!identity) {
    return (
      <main>
        <h1>Dashboard</h1>
        <div className="panel">
          <p>{disabledReason || "Sign in with GitHub to get your free key."}</p>
          {!disabledReason && <SignInWithGithubButton next="/dashboard" />}
        </div>
      </main>
    );
  }

  let existingKey = null;
  if (!disabledReason) {
    try {
      const row = await repo.findByGithubUserId(identity.githubUserId);
      if (row && row.status === "active") existingKey = row.openrouter_key;
    } catch {
      // DB not reachable (e.g. local without POSTGRES_URL) — show the panel; the
      // server action gates minting and reports a friendly error.
    }
  }

  const model = "minimax/minimax-m3";
  const repoUrl = "https://github.com/tiennm99/llmapikey";

  return (
    <main>
      <h1>Your key</h1>
      <p className="muted">Signed in as @{identity.githubUsername}.</p>
      <GenerateKeyPanel
        existingKey={existingKey}
        model={model}
        repoUrl={repoUrl}
        disabledReason={disabledReason}
      />
    </main>
  );
}
