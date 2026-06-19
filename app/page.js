import Link from "next/link";

import { SignInWithGithubButton } from "@/components/sign-in-with-github-button";
import { isProjectLive, projectPendingMessage } from "@/lib/project-status";

export const dynamic = "force-dynamic";

/**
 * Landing page. Static copy + sign-in CTA. Star nudge and how-it-works are
 * inline (not separate components) per the "inline static copy" rule.
 */
export default function HomePage() {
  const repoUrl = "https://github.com/tiennm99/llmapikey";
  const model = "minimax/minimax-m3";
  const projectLive = isProjectLive();

  if (!projectLive) {
    return (
      <main>
        <h1>llmapikey is pending</h1>
        <p>
          The free OpenRouter key giveaway is paused while we look for a provider
          that can support this safely.
        </p>

        <div className="panel status-panel">
          <p className="warn">{projectPendingMessage()}</p>
          <p className="muted">
            OpenRouter BYOK remains useful for personal routing, but the current
            pass-through fee model makes a public free-key giveaway unsafe.
          </p>
        </div>

        <p>
          <Link href="/docs">Read the current status notes →</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Free OpenRouter API key</h1>
      <p>
        One free, daily-capped OpenRouter key per GitHub account. Sign in,
        generate, start building. No credit card.
      </p>

      <div className="panel">
        <SignInWithGithubButton next="/dashboard" label="Get my free key with GitHub" />
      </div>

      <h2>Available models</h2>
      <ul>
        <li>
          <code>{model}</code> — MiniMax M3
        </li>
        <li className="muted">More coming soon.</li>
      </ul>

      <h2>How it works</h2>
      <ol className="steps">
        <li>Sign in with GitHub — we read only your public profile.</li>
        <li>Generate your key — copy it now or anytime from your dashboard.</li>
        <li>Call OpenRouter with your key. Capped at $10/day; resets daily.</li>
      </ol>

      <p className="muted">
        ⭐ <a href={repoUrl}>Star the repo</a> if it helps you — totally optional,
        never required for access.
      </p>
      <p>
        <Link href="/docs">Read the usage docs →</Link>
      </p>
    </main>
  );
}
