/**
 * Reconcile OpenRouter provisioned keys against the DB registry.
 *
 * Reports:
 *  - Orphaned OpenRouter keys: minted by this app (name `llmapikey:*`) but with
 *    no matching DB row → a billable cost leak to revoke.
 *  - Dangling DB rows: an active row whose key was deleted out-of-band.
 *  - Stale pending rows: a reservation from an interrupted mint (>10 min old)
 *    that still has no key — would block that user until reclaimed.
 *
 * Run (loads server-only secrets from .env.local):
 *   node --env-file=.env.local scripts/reconcile-keys.js
 */
import { getSql } from "../lib/db/postgres-client.js";
import { listKeys } from "../lib/openrouter/provisioning-client.js";

async function main() {
  const sql = getSql();
  const [orKeys, dbRows] = await Promise.all([
    listKeys(),
    sql`select github_user_id, openrouter_delete_hash, status, created_at from llmapikey.api_keys`,
  ]);

  const dbHashes = new Set(dbRows.map((r) => r.openrouter_delete_hash).filter(Boolean));
  const orHashes = new Set(orKeys.map((k) => k.hash));

  const appKeys = orKeys.filter((k) => typeof k.name === "string" && k.name.startsWith("llmapikey:"));
  const orphans = appKeys.filter((k) => !dbHashes.has(k.hash));
  const dangling = dbRows.filter((r) => r.openrouter_delete_hash && !orHashes.has(r.openrouter_delete_hash));

  // Conservative window: the generate-key action self-reclaims at 2 min; report
  // only rows older than that so genuinely in-flight reservations aren't flagged.
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  const stalePending = dbRows.filter(
    (r) => r.status === "pending" && new Date(r.created_at).getTime() < tenMinAgo,
  );

  console.log(`OpenRouter app keys: ${appKeys.length} | DB rows: ${dbRows.length}`);
  console.log(`Orphaned OpenRouter keys (no DB row → cost leak): ${orphans.length}`);
  for (const k of orphans) console.log(`  orphan  hash=${k.hash} name=${k.name}`);
  console.log(`Dangling DB rows (key deleted out-of-band): ${dangling.length}`);
  for (const r of dangling) console.log(`  dangling github_user_id=${r.github_user_id} hash=${r.openrouter_delete_hash}`);
  console.log(`Stale pending rows (interrupted mint, blocks user): ${stalePending.length}`);
  for (const r of stalePending) console.log(`  stale-pending github_user_id=${r.github_user_id} created_at=${r.created_at}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
