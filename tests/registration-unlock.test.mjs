import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("registration deposits fully unlock the user when approved by admin", () => {
  const route = read("app/api/admin/actions/route.ts");

  assert.match(
    route,
    /UPDATE profiles\s*SET\s*registration_deposit_paid = true,[\s\S]*?account_unlocked = true/i,
  );
  assert.match(
    route,
    /registration_deposit.*unlock_method.*registration_deposit|unlock_method.*registration_deposit/i,
  );
  assert.match(route, /account_unlock_paid_at = NOW\(\)/i);
  assert.match(route, /RETURNING id/i);
  assert.match(route, /user profile is missing/i);
});

test("registration-deposit migration permits the approval workflow's unlock method", () => {
  const migration = readFileSync(
    "migrations/20260921000001_registration_deposit_unlock_invariant.sql",
    "utf8",
  );
  assert.match(migration, /DROP CONSTRAINT IF EXISTS profiles_unlock_method_check/i);
  assert.match(migration, /'registration_deposit'/i);
});
