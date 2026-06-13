"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { adminCreateKey } from "@/app/actions/admin-keys";
import { maskFromHint } from "@/lib/keys/key-format";

/**
 * Manual mint form (admin override). Submits the numeric GitHub provider_id and
 * optional username to the server action; the raw key is never returned here, so
 * only a masked hint is shown on success.
 */
export function AdminCreateKeyForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(/** @type {any} */ (null));

  function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const githubUserId = form.githubUserId.value;
    const githubUsername = form.githubUsername.value;
    startTransition(async () => {
      const res = await adminCreateKey({ githubUserId, githubUsername });
      setResult(res);
      if (res.status === "created" || res.status === "exists") {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="panel">
      <h2>Manually mint a key</h2>
      <form className="filters" onSubmit={onSubmit}>
        <input
          type="text"
          name="githubUserId"
          placeholder="GitHub provider_id (numeric)"
          required
        />
        <input type="text" name="githubUsername" placeholder="GitHub username (optional)" />
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Minting…" : "Mint key"}
        </button>
      </form>
      {result?.status === "created" && (
        <p className="muted">
          Created — masked: <code>{maskFromHint(result.keyHint)}</code>
        </p>
      )}
      {result?.status === "exists" && <p className="muted">User already has a key.</p>}
      {result?.status === "error" && <p className="error">{result.message}</p>}
    </div>
  );
}
