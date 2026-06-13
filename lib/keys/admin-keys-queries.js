import "server-only";

import { getSql } from "@/lib/db/postgres-client";
import { buildFilterDescriptor, clampInt } from "@/lib/keys/admin-keys-filters";

/**
 * Admin read/search/paginate queries over `llmapikey.api_keys`. Kept separate
 * from `api-keys-repository.js` so that file stays small and focused. The pure
 * filter helpers live in `admin-keys-filters.js` (no `server-only`) for testing.
 *
 * Rows are the `ApiKeyRow` shape declared in `api-keys-repository.js`. All user
 * input flows as bound parameters via the `postgres` tagged template — there is
 * NEVER any string concatenation of `q`/`status` into SQL.
 */

/**
 * Build the parameterized WHERE fragment shared by list + count (so the
 * paginator header can never disagree with the rows it labels). Composes
 * `postgres` fragments — every value stays a bound parameter.
 *
 * @param {import('postgres').Sql} sql
 * @param {{ q?: string, status?: string }} filters
 * @returns {import('postgres').PendingQuery<any>} a `where ...` fragment, or empty.
 */
function buildWhere(sql, filters) {
  const { statusFilter, search } = buildFilterDescriptor(filters);
  const conds = [];
  if (statusFilter) conds.push(sql`status = ${statusFilter}`);
  if (search) {
    conds.push(
      sql`(github_username ilike ${"%" + search + "%"} or github_user_id = ${search})`,
    );
  }
  let where = sql``;
  conds.forEach((cond, i) => {
    where = i === 0 ? sql`where ${cond}` : sql`${where} and ${cond}`;
  });
  return where;
}

/**
 * List keys matching the filters, newest first, paginated. `limit` is clamped to
 * [1, 100] and `offset` to ≥ 0 to bound resource use from `?page` abuse.
 *
 * @param {{ q?: string, status?: string, limit?: number, offset?: number }} [params]
 * @returns {Promise<import('./api-keys-repository').ApiKeyRow[]>}
 */
export async function listApiKeys({ q, status, limit, offset } = {}) {
  const sql = getSql();
  const lim = clampInt(limit, 1, 100, 20);
  const off = clampInt(offset, 0, Number.MAX_SAFE_INTEGER, 0);
  const where = buildWhere(sql, { q, status });
  const rows = await sql`
    select * from llmapikey.api_keys
    ${where}
    order by created_at desc
    limit ${lim} offset ${off}`;
  return rows;
}

/**
 * Count keys matching the filters — identical predicate to `listApiKeys`.
 *
 * @param {{ q?: string, status?: string }} [params]
 * @returns {Promise<number>}
 */
export async function countApiKeys({ q, status } = {}) {
  const sql = getSql();
  const where = buildWhere(sql, { q, status });
  const rows = await sql`
    select count(*)::int as n from llmapikey.api_keys ${where}`;
  return rows[0].n;
}
