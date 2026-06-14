-- Rename openrouter_key_hash -> openrouter_delete_hash. The column holds
-- OpenRouter's delete handle (response `data.hash`) used to revoke the key, NOT
-- a hash of the key. The old name was misleading now that the raw key is stored
-- alongside it.
alter table llmapikey.api_keys rename column openrouter_key_hash to openrouter_delete_hash;
