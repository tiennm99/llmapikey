/**
 * Pure request-body shaping for the OpenRouter create-key call. No I/O, no
 * `server-only` guard — so it is unit-testable under plain node.
 *
 * Fields are snake_case per the OpenRouter API ref (`limit_reset`,
 * `include_byok_in_limit`, `expires_at`).
 *
 * @param {{ name: string, limitUsd: number, resetPeriod: string, includeByok: boolean, expiresAt: string }} params
 * @returns {Record<string, unknown>}
 */
export function buildCreateKeyBody({ name, limitUsd, resetPeriod, includeByok, expiresAt }) {
  return {
    name,
    limit: limitUsd,
    limit_reset: resetPeriod,
    include_byok_in_limit: includeByok,
    expires_at: expiresAt,
  };
}
