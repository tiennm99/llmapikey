import "server-only";

import { buildCreateKeyBody } from "./create-key-request-body";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/api/v1/keys";

/**
 * @typedef {Object} CreateKeyResult
 * @property {string} key  Raw key (sk-or-v1-…). Shown ONCE. Never persist or log it.
 * @property {string} hash Delete handle (response `data.hash`) for DELETE /keys/:hash.
 */

/** Error carrying the OpenRouter HTTP status (e.g. 429) for diagnostics/logging. */
export class ProvisioningError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message);
    this.name = "ProvisioningError";
    this.status = status;
  }
}

/**
 * Mint a new provisioned key. Request fields are snake_case per the OpenRouter
 * API ref (`limit_reset`, `include_byok_in_limit`).
 *
 * @param {{ name: string, limitUsd: number, resetPeriod: string, includeByok: boolean, expiresAt: string }} params
 * @returns {Promise<CreateKeyResult>}
 */
export async function createKey({ name, limitUsd, resetPeriod, includeByok, expiresAt }) {
  const res = await fetch(OPENROUTER_KEYS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireProvisioningKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildCreateKeyBody({ name, limitUsd, resetPeriod, includeByok, expiresAt })),
  });

  if (!res.ok) {
    // Do NOT include the response body — it may echo the raw key.
    throw new ProvisioningError(`OpenRouter create key failed (${res.status})`, res.status);
  }

  const json = await res.json();
  const key = json?.key;
  const hash = json?.data?.hash;
  if (!key || !hash) {
    throw new ProvisioningError("Unexpected create-key response shape (missing key/data.hash)", res.status);
  }
  return { key, hash };
}

/**
 * Delete (revoke) a key by its hash. 404 is treated as success (idempotent).
 *
 * @param {string} hash
 * @returns {Promise<void>}
 */
export async function deleteKey(hash) {
  const res = await fetch(`${OPENROUTER_KEYS_URL}/${encodeURIComponent(hash)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${requireProvisioningKey()}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new ProvisioningError(`OpenRouter delete key failed (${res.status})`, res.status);
  }
}

/**
 * List provisioned keys (reconcile script).
 *
 * @returns {Promise<Array<{ hash: string, name?: string, disabled?: boolean }>>}
 */
export async function listKeys() {
  const res = await fetch(OPENROUTER_KEYS_URL, {
    headers: { Authorization: `Bearer ${requireProvisioningKey()}` },
  });
  if (!res.ok) {
    throw new ProvisioningError(`OpenRouter list keys failed (${res.status})`, res.status);
  }
  const json = await res.json();
  return json?.data ?? [];
}

/**
 * @returns {string}
 */
function requireProvisioningKey() {
  const key = process.env.OPENROUTER_MANAGEMENT_KEY;
  if (!key) throw new ProvisioningError("Missing OPENROUTER_MANAGEMENT_KEY", 0);
  return key;
}
