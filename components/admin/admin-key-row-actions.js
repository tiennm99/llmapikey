"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { revokeKey } from "@/app/actions/admin-keys";

/**
 * Per-row revoke control. Calls the server action (which independently re-gates),
 * then refreshes the server component so the deleted row disappears.
 *
 * @param {{ id: string }} props
 */
export function AdminKeyRowActions({ id }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onRevoke() {
    if (!window.confirm("Revoke this key? Deletes the OpenRouter key and the record.")) {
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await revokeKey(id);
      if (res.status === "revoked") {
        router.refresh();
      } else {
        setError(res.message || "Failed to revoke.");
      }
    });
  }

  return (
    <span>
      <button className="btn secondary" onClick={onRevoke} disabled={pending}>
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {error && <span className="error"> {error}</span>}
    </span>
  );
}
