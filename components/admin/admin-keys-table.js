import { AdminKeyRowActions } from "./admin-key-row-actions";

/**
 * Admin table: username, full key, status, created date. The full raw key is
 * shown here intentionally (admin-only, gated route). The delete handle
 * (`openrouter_key_hash`) is never rendered.
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
                <code>{row.openrouter_key ?? "—"}</code>
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
