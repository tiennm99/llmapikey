-- Rollback for 0001. Vercel rollback does NOT revert the database — run this
-- manually against the same DB if the migration must be undone.
drop table if exists llmapikey.api_keys;
drop schema if exists llmapikey;
