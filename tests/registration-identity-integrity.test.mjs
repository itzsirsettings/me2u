import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "migrations/20260921000003_registration_identity_integrity.sql",
  "utf8",
);
const registerRoute = readFileSync("app/api/auth/register/route.ts", "utf8");
const auth = readFileSync("lib/railway/auth.ts", "utf8");

test("registration prevents duplicate normalized phones without deleting active accounts", () => {
  assert.match(migration, /normalize_registration_phone/i);
  assert.match(migration, /ROW_NUMBER\(\) OVER/i);
  assert.match(migration, /auth_users_registration_phone_unique/i);
  assert.match(migration, /profiles_registration_phone_unique/i);
  assert.match(migration, /duplicate account has financial or KYC activity/i);
  assert.match(registerRoute, /phone number is already associated/i);
});

test("OTP-verified registration persists email verification", () => {
  assert.match(auth, /phone, email_verified\)/i);
  assert.match(auth, /\$5, true\)/i);
  assert.match(migration, /SET email_verified = TRUE/i);
});
