import "server-only";

import { getSql } from "@/lib/db/postgres-client";

/**
 * @typedef {Object} ApiKeyRow
 * @property {string} id
 * @property {string} github_user_id
 * @property {string} github_username
 * @property {string|null} openrouter_key_hash
 * @property {string|null} key_hint
 * @property {string} status            'pending' | 'active'
 * @property {string} created_at
 */

/**
 * Reserve a pending row. The unique constraint on github_user_id makes this the
 * concurrency guard: only the winning insert returns an id; a conflicting
 * concurrent submit gets null (ON CONFLICT DO NOTHING → 0 rows) and must NOT mint.
 *
 * @param {string} githubUserId
 * @param {string} githubUsername
 * @returns {Promise<string|null>} reserved row id, or null if a row already exists.
 */
export async function reserve(githubUserId, githubUsername) {
  const sql = getSql();
  const rows = await sql`
    insert into llmapikey.api_keys (github_user_id, github_username, status)
    values (${githubUserId}, ${githubUsername}, 'pending')
    on conflict (github_user_id) do nothing
    returning id`;
  return rows.length ? rows[0].id : null;
}

/**
 * Mark a reserved row active with its mint result.
 *
 * @param {string} id
 * @param {{ hash: string, hint: string }} mint
 * @returns {Promise<void>}
 */
export async function activate(id, { hash, hint }) {
  const sql = getSql();
  await sql`
    update llmapikey.api_keys
    set openrouter_key_hash = ${hash}, key_hint = ${hint}, status = 'active'
    where id = ${id}`;
}

/**
 * Delete a pending reservation (compensation when mint or persist fails).
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePending(id) {
  const sql = getSql();
  await sql`delete from llmapikey.api_keys where id = ${id} and status = 'pending'`;
}

/**
 * @param {string} githubUserId
 * @returns {Promise<ApiKeyRow|null>}
 */
export async function findByGithubUserId(githubUserId) {
  const sql = getSql();
  const rows = await sql`
    select * from llmapikey.api_keys where github_user_id = ${githubUserId} limit 1`;
  return rows.length ? rows[0] : null;
}

/**
 * Fetch a single key row by its primary key (admin revoke flow).
 *
 * @param {string} id
 * @returns {Promise<ApiKeyRow|null>}
 */
export async function findById(id) {
  const sql = getSql();
  const rows = await sql`
    select * from llmapikey.api_keys where id = ${id} limit 1`;
  return rows.length ? rows[0] : null;
}

/**
 * Delete a key row by id (admin revoke, after the upstream key is deleted).
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteById(id) {
  const sql = getSql();
  await sql`delete from llmapikey.api_keys where id = ${id}`;
}

/**
 * Count live keys (active + in-flight pending) — basis for the MAX_TOTAL_KEYS
 * Sybil kill-switch. Pending rows are counted so concurrent reservations cannot
 * collectively overshoot the ceiling before any of them activates.
 *
 * @returns {Promise<number>}
 */
export async function countLiveKeys() {
  const sql = getSql();
  const rows = await sql`
    select count(*)::int as n from llmapikey.api_keys
    where status in ('pending', 'active')`;
  return rows[0].n;
}
