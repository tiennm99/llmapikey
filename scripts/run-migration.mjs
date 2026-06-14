// Minimal SQL migration runner. Reads POSTGRES_URL from the environment and
// executes the SQL file given as the first CLI arg. Used because the deploy
// box has no psql; reuses the project's `postgres` dependency.
//
// Usage:
//   node --env-file=.env.local scripts/run-migration.mjs <path-to.sql>
//
// The connecting role must own/bypass RLS on the llmapikey schema. Statements
// run in a single transaction so a partial failure rolls back cleanly.
import { readFileSync } from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node --env-file=.env.local scripts/run-migration.mjs <path.sql>");
  process.exit(1);
}
const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("Missing POSTGRES_URL (put it in .env.local).");
  process.exit(1);
}

const sqlText = readFileSync(file, "utf8");
// prepare:false — Supabase transaction pooler (port 6543) disallows prepared statements.
const sql = postgres(url, { prepare: false });

try {
  await sql.begin((tx) => [tx.unsafe(sqlText)]);
  console.log(`Applied: ${file}`);
} catch (err) {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
