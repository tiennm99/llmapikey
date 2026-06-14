import Link from "next/link";

import { SignInWithGithubButton } from "@/components/sign-in-with-github-button";

/**
 * Landing page. Static copy + sign-in CTA. Star nudge and how-it-works are
 * inline (not separate components) per the "inline static copy" rule.
 */
export default function HomePage() {
  const repoUrl = "https://github.com/tiennm99/llmapikey";
  const model = "minimax/minimax-m3";

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
        <li>Generate your key — it&apos;s shown once, so copy it immediately.</li>
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
