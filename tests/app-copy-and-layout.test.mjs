import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const visibleFiles = [
  "app/dashboard/page.tsx",
  "app/wallet/page.tsx",
  "app/loans/page.tsx",
  "app/withdraw/page.tsx",
  "app/page.tsx",
  "components/LandingPageV2Interactions.tsx",
  "app/admin/page.tsx",
  "app/kyc/page.tsx",
  "app/layout.tsx",
  "app/api/wallet/fund/route.ts",
  "lib/server/launch-readiness.ts",
];

function read(path) {
  return readFileSync(path, "utf8");
}

test("visible product copy uses the new welcome bonus and loan language", () => {
  const source = visibleFiles.map(read).join("\n");
  const bannedCopy = [
    "Platform Credit",
    "Platform Loan",
    "Platform support details",
    "platform account",
    "platform approval",
    "platform exposure",
    "platform loans",
    "platform loan",
    "onboarding credit",
    "Starts from ₦10,000",
    "Request 0% loans from ₦10,000",
    "not a loan and does not need repayment",
  ];

  for (const phrase of bannedCopy) {
    assert.equal(source.includes(phrase), false, `Unexpected old copy: ${phrase}`);
  }

  assert.match(source, /welcome bonus is waiting/);
  assert.match(source, /0% interest loan from ₦5,000/);
});

test("home recent activity rows cannot force horizontal overflow", () => {
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(dashboard, /flex min-w-0 items-center justify-between gap-2 overflow-hidden/);
  assert.match(dashboard, /min-w-0 flex-1 overflow-hidden/);
  assert.match(dashboard, /max-w-\[36%\] shrink-0 truncate/);
});

test("username login and the new loan minimum are wired", () => {
  const login = read("app/login/page.tsx");
  const store = read("lib/store.ts");
  const loans = read("lib/loans.ts");
  const resolver = read("app/api/auth/resolve-username/route.ts");
  const migration = read("supabase/migrations/20260518204542_loan_minimum_5000_copy_cleanup.sql");

  assert.match(login, /Email or username/);
  assert.match(store, /\/api\/auth\/resolve-username/);
  assert.match(resolver, /getSupabaseAdminClient/);
  assert.match(loans, /repeatPlatformLoanMinimum = 5000/);
  assert.match(migration, /Loans start from NGN 5,000/);
  assert.match(migration, /amount >= 5000\.00/);
});
