"use client";

import { useState } from "react";

/**
 * Raw key display with a copy button. The key is stored and retrievable on the
 * dashboard, so this renders both at creation and on return visits.
 *
 * @param {{ rawKey: string, model: string }} props
 */
export function KeyDisplay({ rawKey, model }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel">
      <p className="warn">
        ⚠ Keep this key secret — treat it like a password. You can always copy it
        again here on your dashboard.
      </p>
      <div className="key-box">
        <code>{rawKey}</code>
        <button className="btn" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="muted">
        Use it as a Bearer token against <code>https://openrouter.ai/api/v1</code>{" "}
        with model <code>{model}</code>. See <a href="/docs">the docs</a>.
      </p>
    </div>
  );
}
