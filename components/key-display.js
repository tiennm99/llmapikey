"use client";

import { useState } from "react";

/**
 * One-time raw key display with a copy button and a prominent "shown once"
 * warning. After this render the key is gone (never re-fetchable) — v1 has no
 * recovery path, which is acceptable for a free key.
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
        ⚠ Copy this key now — it is shown only once and cannot be recovered.
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
