/**
 * Registry summary header. `total`/`active`/`pending` are global counts (not
 * scoped to the current search) so the header stays a stable overview while the
 * table below reflects the active filter.
 *
 * @param {{ total: number, active: number, pending: number }} props
 */
export function AdminStatsHeader({ total, active, pending }) {
  return (
    <div className="panel stats">
      <span>
        <strong>{total}</strong> total
      </span>
      <span>
        <strong>{active}</strong> active
      </span>
      <span>
        <strong>{pending}</strong> pending
      </span>
    </div>
  );
}
