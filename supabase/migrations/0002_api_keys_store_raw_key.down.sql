-- Rollback for 0002. Drops the stored raw key (revocation still works via
-- openrouter_key_hash). Run manually against the same DB; Vercel rollback does
-- not revert the database.
alter table llmapikey.api_keys drop column if exists openrouter_key;
