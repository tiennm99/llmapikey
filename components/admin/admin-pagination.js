/**
 * Build an `/admin` href preserving the active filter and setting the page.
 *
 * @param {number} page
 * @param {string} q
 * @param {string} status
 * @returns {string}
 */
function hrefFor(page, q, status) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "all") params.set("status", status);
  params.set("page", String(page));
  return `/admin?${params.toString()}`;
}

/**
 * Prev/Next links. Prev hidden on page 1; Next hidden when the current page is
 * the last. Renders nothing when there's only a single page.
 *
 * @param {{ page: number, pageSize: number, total: number, q: string, status: string }} props
 */
export function AdminPagination({ page, pageSize, total, q, status }) {
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;
  if (!hasPrev && !hasNext) return null;

  return (
    <div className="pager">
      {hasPrev ? (
        <a className="btn secondary" href={hrefFor(page - 1, q, status)}>
          ← Prev
        </a>
      ) : (
        <span />
      )}
      <span className="muted">Page {page}</span>
      {hasNext ? (
        <a className="btn secondary" href={hrefFor(page + 1, q, status)}>
          Next →
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
