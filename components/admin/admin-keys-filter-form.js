/**
 * Search + status filter. A native GET form → values become `?q=&status=` query
 * params (no client JS). Omitting a `page` field means a new filter resets to
 * page 1. The repo layer binds these as parameters; no SQL is built here.
 *
 * @param {{ q: string, status: string }} props
 */
export function AdminKeysFilterForm({ q, status }) {
  return (
    <form className="panel filters" method="get" action="/admin">
      <input
        type="text"
        name="q"
        defaultValue={q}
        placeholder="Search username or numeric id"
      />
      <select name="status" defaultValue={status}>
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="active">Active</option>
      </select>
      <button className="btn" type="submit">
        Filter
      </button>
    </form>
  );
}
