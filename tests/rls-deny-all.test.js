import assert from "node:assert/strict";
import { test } from "node:test";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Real-Supabase verification: the anon role must NOT be able to read api_keys.
 * Because `llmapikey` is unexposed to PostgREST, the anon client should get a
 * schema/permission error (or, defensively, zero rows) — never real data.
 *
 * Skips when Supabase env is absent so `npm test` passes in CI/local without
 * credentials. Run against a real project to actually exercise the invariant.
 */
test(
  "anon client cannot read llmapikey.api_keys",
  { skip: !url || !anonKey ? "Supabase env not set" : false },
  async () => {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase
      .schema("llmapikey")
      .from("api_keys")
      .select("id");

    // The schema is unexposed to PostgREST, so the anon client MUST get an
    // error (e.g. PGRST106). An empty array is NOT acceptable — that would mean
    // the schema became reachable, just with no rows visible.
    assert.notEqual(error, null, "anon must receive a hard error, not a result set");
    assert.equal(data, null, "anon must not receive any data array");
  },
);
