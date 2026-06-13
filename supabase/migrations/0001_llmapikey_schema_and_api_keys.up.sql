-- Dedicated schema for the spending-key registry. Intentionally NOT added to
-- PostgREST's exposed schemas, so the REST API / anon role can never reach it.
-- All app access is via a direct Postgres connection (lib/db/postgres-client.js).
create schema if not exists llmapikey;

create table if not exists llmapikey.api_keys (
  id uuid primary key default gen_random_uuid(),
  -- Numeric, immutable GitHub id (provider_id). Unique constraint is the
  -- one-key-per-account invariant and the concurrency guard for reserve-then-mint.
  github_user_id text not null unique,
  github_username text not null,
  -- OpenRouter delete handle (response `data.hash`), NOT the raw key and NOT `data.id`.
  -- Nullable: a row is reserved (status 'pending') before the key is minted.
  openrouter_key_hash text,
  -- Last 4 chars of the raw key for masked display. Raw key is never stored.
  key_hint text,
  status text not null default 'pending'
    check (status in ('pending', 'active')),
  created_at timestamptz not null default now()
);

-- Defense in depth. The schema is unexposed (primary control), but enable RLS
-- with NO policies so that even if the schema were ever exposed, anon /
-- authenticated get zero rows. The direct PG owner connection bypasses RLS.
alter table llmapikey.api_keys enable row level security;

-- Belt-and-suspenders: strip any default grants from the API roles.
revoke all on schema llmapikey from anon, authenticated;
revoke all on all tables in schema llmapikey from anon, authenticated;
