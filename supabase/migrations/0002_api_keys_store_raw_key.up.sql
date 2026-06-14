-- Store the raw OpenRouter key so users can retrieve it later (no more
-- shown-once-only). The key still lives only in the unexposed `llmapikey`
-- schema (deny-all RLS, reached solely by the server-side direct connection).
-- `openrouter_key_hash` is retained — it is OpenRouter's delete handle for
-- revocation, not a hash of the key.
alter table llmapikey.api_keys add column if not exists openrouter_key text;
