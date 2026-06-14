-- Rollback for 0003. Run manually against the same DB.
alter table llmapikey.api_keys rename column openrouter_delete_hash to openrouter_key_hash;
