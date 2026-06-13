# Phase 02 — Repository queries (list / count / find / delete)

**Context:** [plan.md](plan.md) · existing repo `lib/keys/api-keys-repository.js` · `getSql()` `lib/db/postgres-client.js`

## Overview
- **Priority:** P1 (blocks 03, 04)
- **Status:** pending
- **Description:** Add admin read/search/paginate + find/delete queries. Keep
  `api-keys-repository.js` <200 lines by putting search/admin queries in a new
  `lib/keys/admin-keys-queries.js`; add only `findById`/`deleteById` to the
  existing repo (they're generic key-by-id ops, fit the repo's existing role).

## Key Insights
- `api-keys-repository.js` is 85 lines; adding 4 functions would push it near the
  limit → split. **`findById` + `deleteById`** stay in `api-keys-repository.js`
  (sibling to `findByGithubUserId`/`deletePending`). **`listApiKeys` +
  `countApiKeys`** (filter/search composition) go in `admin-keys-queries.js`.
- The `postgres` tagged template (`sql\`...\``) parameterizes interpolated
  values — **never** string-concatenate user input. Dynamic WHERE built by
  composing `sql` fragments, not by splicing strings.
- Columns (migration `0001`): `id, github_user_id, github_username,
  openrouter_key_hash, key_hint, status, created_at`. **No `expires_at` /
  `updated_at`** — do not select columns that don't exist.
- `status` filter domain: `all | pending | active`. `all` ⇒ omit the status
  predicate (do not filter to a 3rd value).
- `q` searches `github_username` via `ILIKE '%q%'` AND exact-matches
  `github_user_id` (numeric id paste) → `OR`. Bound `limit` to avoid huge pages.

## Requirements
**Functional**
- `listApiKeys({ q, status, limit, offset })` → `ApiKeyRow[]`, `order by
  created_at desc`, `limit`/`offset` applied.
- `countApiKeys({ q, status })` → `number` (`count(*)::int`), same filters as list.
- `findById(id)` → `ApiKeyRow|null`.
- `deleteById(id)` → `void`.

**Non-functional**
- Both files <200 lines. Parameterized queries only. No logging of rows.

## Architecture
Shared filter composition (in `admin-keys-queries.js`):
```
buildFilters({ q, status }) → { whereStatus, whereSearch } as sql fragments
listApiKeys  = SELECT * ... WHERE <status?> AND <search?> ORDER BY created_at DESC LIMIT OFFSET
countApiKeys = SELECT count(*)::int ... WHERE <status?> AND <search?>
```
Compose with the `postgres` lib's fragment support so list and count share one
predicate builder (DRY) — both must apply identical filters or the paginator
header lies.

Predicate building (parameterized, no interpolation):
- status: `status === 'all'` → no predicate; else `sql`status = ${status}``.
- search: when `q` non-empty → `sql`(github_username ilike ${'%' + q + '%'} or github_user_id = ${q})``.
  Note `'%' + q + '%'` is a **bound parameter value**, not spliced SQL.
- Combine present predicates with `AND`; if none, `WHERE true` (or omit clause).

## Related Code Files
- **Create:** `lib/keys/admin-keys-queries.js` (listApiKeys, countApiKeys, shared filter builder)
- **Modify:** `lib/keys/api-keys-repository.js` (add `findById`, `deleteById`)
- **Read for pattern:** existing `findByGithubUserId`/`countLiveKeys` (`api-keys-repository.js:65-85`)
- **Delete:** none

## Implementation Steps
1. In `api-keys-repository.js` add `findById(id)`: `select * ... where id = ${id} limit 1` → row|null.
2. Add `deleteById(id)`: `delete from llmapikey.api_keys where id = ${id}`.
3. Create `admin-keys-queries.js` with `import "server-only";` + `getSql`.
4. Implement an internal `whereClause({ q, status })` returning a composed `sql`
   fragment using the lib's fragment API (e.g. `sql\`where \${cond}\``), guarding
   empty `q` and `status === 'all'`.
5. `listApiKeys` — clamp `limit` to `[1, 100]`, `offset` to `>= 0`; build query
   using the shared clause; `order by created_at desc limit ${limit} offset ${offset}`.
6. `countApiKeys` — same clause; `select count(*)::int as n`; return `rows[0].n`.
7. JSDoc with `@typedef` reuse note (rows are `ApiKeyRow` from the repo).

## Todo
- [ ] `findById` / `deleteById` in repo
- [ ] `admin-keys-queries.js` scaffold + `server-only`
- [ ] Shared `whereClause` (status + search, parameterized)
- [ ] `listApiKeys` with clamped limit/offset, desc order
- [ ] `countApiKeys` reusing the clause
- [ ] Verify both files <200 lines

## Success Criteria
- list + count return consistent filtered sets for every `status` value.
- `q` matching a username substring and `q` matching an exact id both return rows.
- No string interpolation of `q`/`status`/`id` into SQL (review the diff).
- `findById('nope')` → `null`; `deleteById` removes exactly one row.

## Security Considerations
- **Parameterized only** — SQL-injection safe; `q` flows as a bound value.
- `limit` clamp prevents resource-exhaustion via `?page` abuse.
- Functions return full rows incl. `openrouter_key_hash`; callers must never log
  or send the hash to the client (UI selects only safe columns to render).

## Next Steps
- Phase 03 `revokeKey` uses `findById`/`deleteById`; Phase 04 page uses
  `listApiKeys`/`countApiKeys`.

## Notes (verified)
- `postgres@^3.4.5` (porsager) supports embedding `sql` fragments inside a parent
  `sql\`...\`` template and dynamic-condition composition — fragment approach is
  valid. `prepare: false` (pooler) does not affect parameterization.
- If composing fragments proves awkward, the safe fallback is a small set of
  explicit query branches (status present/absent × q present/absent), each a
  static template with bound params — still zero interpolation.
