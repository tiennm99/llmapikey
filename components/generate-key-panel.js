"use client";

import { useState } from "react";

import { generateKey } from "@/app/actions/generate-key";
import { maskFromHint } from "@/lib/keys/key-format";
import { KeyDisplay } from "./key-display";

/**
 * Generate / existing-key panel. Calls the server action; renders the one-time
 * key on success, the masked hint if a key already exists.
 *
 * @param {{ existingHint: string|null, model: string, repoUrl: string }} props
 */
export function GenerateKeyPanel({ existingHint, model, repoUrl }) {
  const [state, setState] = useState(
    existingHint
      ? { status: "exists", keyHint: existingHint }
      : { status: "idle" },
  );
  const [loading, setLoading] = useState(false);

  async function onGenerate() {
    setLoading(true);
    const result = await generateKey();
    setState(result);
    setLoading(false);
  }

  if (state.status === "created") {
    return <KeyDisplay rawKey={state.rawKey} model={model} />;
  }

  if (state.status === "exists") {
    return (
      <div className="panel">
        <p>
          Your key (masked): <code>{maskFromHint(state.keyHint)}</code>
        </p>
        <p className="muted">
          The full key is shown only once at creation. Lost it? That&apos;s okay —
          it&apos;s free; a regenerate flow may come later.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <button className="btn" onClick={onGenerate} disabled={loading}>
        {loading ? "Generating…" : "Generate my key"}
      </button>
      {state.status === "error" && <p className="error">{state.message}</p>}
      <p className="muted">
        ⭐ <a href={repoUrl}>Star the repo</a> if it helps you — optional, never
        required.
      </p>
    </div>
  );
}
