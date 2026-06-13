import { maskFromHint } from "@/lib/keys/key-format";
import { AdminKeyRowActions } from "./admin-key-row-actions";

/**
 * Renders only safe columns: username, masked key hint, status, created date.
 * The `openrouter_key_hash` is NEVER rendered or serialized to the client.
 *
 * @param {{ rows: import('@/lib/keys/api-keys-repository').ApiKeyRow[] }} props
 */
export function AdminKeysTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="panel">
        <p className="muted">No keys match.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <table className="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Key</th>
            <th>Status</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>@{row.github_username}</td>
              <td>
                <code>{maskFromHint(row.key_hint)}</code>
              </td>
              <td>{row.status}</td>
              <td className="muted">
                {new Date(row.created_at).toISOString().slice(0, 10)}
              </td>
              <td>
                <AdminKeyRowActions id={row.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
