import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "migrations/20260921000002_reclassify_legacy_registration_deposits.sql",
  "utf8",
);

test("legacy registration-deposit repair is narrowly scoped and preserves KYC security", () => {
  assert.match(migration, /pp\.type = 'wallet_funding'/);
  assert.match(migration, /pp\.status = 'approved'/);
  assert.match(migration, /pp\.amount = 2000/);
  assert.match(migration, /registration_proof\.type = 'registration_deposit'/);
  assert.match(migration, /SET type = 'registration_deposit'/);
  assert.match(migration, /registration_deposit_paid = TRUE/);
  assert.doesNotMatch(migration, /kyc_verified\s*=\s*TRUE/i);
  assert.doesNotMatch(migration, /account_locked\s*=\s*FALSE/i);
});
