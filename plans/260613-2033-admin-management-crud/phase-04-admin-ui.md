# Phase 04 — Admin UI (`/admin` page + components)

**Context:** [plan.md](plan.md) · [phase-03](phase-03-admin-server-actions.md) · pattern `app/dashboard/page.js`, `components/generate-key-panel.js`

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** `app/admin/page.js` server component (`force-dynamic`):
  resolve+gate → `notFound()` for non-admins → render stats header, search/status
  filter form, keys table with revoke, prev/next pagination. Small components
  under `components/admin/`.

## Key Insights
- Mirror `dashboard/page.js`: `export const dynamic = "force-dynamic"` (reads
  session per request, never prerender).
- Gate with `requireAdminIdentity()`; on `null` call `notFound()` (Next
  `next/navigation`) — renders 404, **does not redirect** (a redirect to /login
  would confirm the route exists to a probing non-admin).
- `searchParams` is async in Next 15 server components → `await searchParams`
  (or accept the promise) before reading `q`/`status`/`page`.
- The table must render only safe columns: `github_username`,
  `maskFromHint(key_hint)`, `status`, `created_at`. **Never** render or embed
  `openrouter_key_hash`.
- Revoke is a mutation → must be a client component form invoking the server
  action, then `router.refresh()` (or `revalidatePath('/admin')` in the action)
  so the list reflects the deletion.

## Requirements
**Functional**
- Parse `searchParams`: `q` (string, default ""), `status` (`all|pending|active`,
  default `all`, validated/clamped), `page` (int ≥ 1, default 1).
- `limit = 20`; `offset = (page-1)*limit`.
- Concurrently `listApiKeys({q,status,limit,offset})` and `countApiKeys({q,status})`.
- Stats header: total (count of current filter) + active + pending. Active/pending
  counts via two `countApiKeys` calls (`status:'active'`, `status:'pending'`) —
  ignoring `q` for the global stats, or scoped; **decision: global (ignore q)**
  so the header is a stable registry summary, table is the filtered view.
- Filter form: GET form (`method` defaults to GET) → `?q=&status=` query params
  (no JS needed; native form submit). Preserve current values.
- Table: one row per key; revoke button per row.
- Pagination: Prev (page>1) / Next (offset+limit < total) as links preserving
  `q`/`status`.
- DB unreachable (no `DATABASE_URL` locally) → catch and show an empty-state
  panel (mirror dashboard's try/catch tolerance), not a crash.

**Non-functional**
- Each component file <200 lines (all small). Reuse `panel`/`muted`/`btn`/`error`
  classes; add minimal table CSS to `globals.css` only if needed.

## Architecture
```
/admin (server)               components/admin/
  requireAdminIdentity()        admin-keys-filter-form.js  (server, GET form)
   └ null → notFound()          admin-keys-table.js        (server, maps rows)
  parse searchParams             └ admin-key-row-actions.js (client: revoke form)
  list + count (Promise.all)    admin-stats-header.js      (server, counts)
  render stats/form/table/pager  admin-pagination.js       (server, prev/next links)
```
Data flow: searchParams → validated query → repo (phase 02) → rows → table.
Mutation flow: row button → `admin-key-row-actions` (client) → `revokeKey(id)`
action → `router.refresh()`.

## Related Code Files
- **Create:** `app/admin/page.js`, `components/admin/admin-stats-header.js`,
  `components/admin/admin-keys-filter-form.js`,
  `components/admin/admin-keys-table.js`,
  `components/admin/admin-key-row-actions.js` (client),
  `components/admin/admin-pagination.js`
- **Modify:** `app/globals.css` (minimal `.table`/`th`/`td` rules — only if needed)
- **Read for pattern:** `app/dashboard/page.js`, `components/generate-key-panel.js`
- **Delete:** none

## Implementation Steps
1. `app/admin/page.js`: `force-dynamic`; `const identity = await
   requireAdminIdentity(); if (!identity) notFound();`.
2. `const sp = await searchParams;` parse+validate `q/status/page` (helper to
   clamp status to the allowed set, page to ≥1).
3. `Promise.all([listApiKeys, countApiKeys, countActive, countPending])` inside
   try/catch; on error render empty-state panel.
4. Render `<AdminStatsHeader>`, `<AdminKeysFilterForm q status>`,
   `<AdminKeysTable rows>`, `<AdminPagination page limit total q status>`.
5. `admin-keys-filter-form.js`: plain `<form>` (GET) with text input `name="q"`
   and a `<select name="status">`; submit reloads with query params.
6. `admin-keys-table.js`: table headers (Username, Key, Status, Created); map
   rows; mask hint via `maskFromHint`; embed `<AdminKeyRowActions id>` per row.
7. `admin-key-row-actions.js` (`"use client"`): button → `await revokeKey(id)` →
   on success `router.refresh()`; disable while pending; show inline error.
8. `admin-pagination.js`: build prev/next hrefs from current params; hide Prev on
   page 1, Next when no more rows.
9. (Optional) manual-create form component calling `adminCreateKey` — include
   only if it stays small; otherwise defer (YAGNI for v1 if scope tight). Scope
   says Create is in — include a minimal create form panel using `adminCreateKey`.

## Todo
- [ ] `app/admin/page.js` with gate → `notFound()` + `force-dynamic`
- [ ] searchParams parse/validate (q/status/page)
- [ ] stats header (total/active/pending)
- [ ] filter form (GET)
- [ ] keys table (safe columns only)
- [ ] row revoke client action + refresh
- [ ] pagination links preserving filters
- [ ] manual create form (adminCreateKey)
- [ ] minimal table CSS if needed

## Success Criteria
- Non-admin / signed-out → 404 (no redirect, no data).
- Search by username substring and by exact id filters the table.
- Status filter and pagination preserve each other in the URL.
- Revoke removes the row and the list updates without manual reload.
- `openrouter_key_hash` never appears in rendered HTML (inspect output).

## Security Considerations
- `notFound()` not redirect — avoids confirming route existence to non-admins.
- Page gate is convenience; **actions self-gate** (phase 03) — a leaked action
  call still rejects.
- Render only masked hint; raw hash never serialized to the client.
- GET filter form → values are query params (parameterized at the repo layer);
  no SQL built in the component.

## Next Steps
- Phase 05 adds env doc + tests covering the gate and query shapes.
