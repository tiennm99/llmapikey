import "server-only";

import postgres from "postgres";

/**
 * Direct Postgres client for the unexposed `llmapikey` schema.
 *
 * Why direct PG (not supabase-js): the `llmapikey` schema is intentionally NOT
 * added to PostgREST's exposed schemas, so the REST API (and therefore the anon
 * role) cannot reach `api_keys` at all. supabase-js cannot query an unexposed
 * schema. A direct Postgres connection sidesteps PostgREST entirely.
 *
 * This module is `server-only`; POSTGRES_URL must never reach the client bundle.
 *
 * Connection: use Supabase's pooler connection string. In transaction-pooling
 * mode (port 6543) prepared statements are unsupported, so `prepare: false`.
 *
 * @type {import('postgres').Sql}
 */
let sql;

/**
 * Lazily create the singleton sql client. Lazy so importing this module never
 * throws at build time when POSTGRES_URL is absent (e.g. CI without secrets).
 *
 * @returns {import('postgres').Sql}
 */
export function getSql() {
  if (sql) return sql;
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Missing required environment variable: POSTGRES_URL");
  }
  sql = postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return sql;
}
