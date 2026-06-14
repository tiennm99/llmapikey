/**
 * Pure request-body shaping for the OpenRouter create-key call. No I/O, no
 * `server-only` guard — so it is unit-testable under plain node.
 *
 * Fields are snake_case per the OpenRouter API ref (`limit_reset`,
 * `include_byok_in_limit`, `expires_at`, `workspace_id`).
 *
 * @param {{ name: string, limitUsd: number, resetPeriod: string, includeByok: boolean, expiresAt: string, workspaceId?: string }} params
 * @returns {Record<string, unknown>}
 */
export function buildCreateKeyBody({ name, limitUsd, resetPeriod, includeByok, expiresAt, workspaceId }) {
  const body = {
    name,
    limit: limitUsd,
    limit_reset: resetPeriod,
    include_byok_in_limit: includeByok,
    expires_at: expiresAt,
  };
  // Place the key in a specific workspace; omitted → OpenRouter uses the
  // management key's default workspace.
  if (workspaceId) body.workspace_id = workspaceId;
  return body;
}
