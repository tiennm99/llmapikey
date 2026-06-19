"use client";

import { useState } from "react";

import { generateKey } from "@/app/actions/generate-key";
import { KeyDisplay } from "./key-display";

/**
 * Generate / existing-key panel. Calls the server action; renders the full key
 * (retrievable) whether it was just created or already existed.
 *
 * @param {{ existingKey: string|null, model: string, repoUrl: string, disabledReason?: string|null }} props
 */
export function GenerateKeyPanel({ existingKey, model, repoUrl, disabledReason = null }) {
  const [state, setState] = useState(
    existingKey
      ? { status: "exists", rawKey: existingKey }
      : { status: "idle" },
  );
  const [loading, setLoading] = useState(false);

  async function onGenerate() {
    setLoading(true);
    const result = await generateKey();
    setState(result);
    setLoading(false);
  }

  // Both freshly created and previously existing keys render the full value.
  if (state.status === "created" || state.status === "exists") {
    return <KeyDisplay rawKey={state.rawKey} model={model} />;
  }

  if (disabledReason) {
    return (
      <div className="panel">
        <button className="btn" disabled>
          Project pending
        </button>
        <p className="warn">{disabledReason}</p>
        <p className="muted">
          ⭐ <a href={repoUrl}>Star the repo</a> if you want to follow progress.
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
