import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const visibleFiles = [
  "app/dashboard/page.tsx",
  "app/wallet/page.tsx",
  "app/loans/page.tsx",
  "app/withdraw/page.tsx",
  "app/page.tsx",
  "components/landing/LandingHeader.tsx",
  "components/landing/HeroSection.tsx",
  "components/landing/FeaturesSection.tsx",
  "components/landing/AdvancedToolsSection.tsx",
  "components/landing/PublicProofSection.tsx",
  "components/landing/LandingCTA.tsx",
  "components/landing/LandingFooter.tsx",
  "app/admin/page.tsx",
  "app/kyc/page.tsx",
  "app/layout.tsx",
  "app/api/wallet/fund/route.ts",
  "lib/server/launch-readiness.ts",
];

const customerVisibleFiles = [
  "app/dashboard/page.tsx",
  "app/wallet/page.tsx",
  "app/loans/page.tsx",
  "app/marketplace/page.tsx",
  "app/profile/page.tsx",
  "app/withdraw/page.tsx",
  "app/kyc/page.tsx",
  "app/page.tsx",
  "components/landing/LandingHeader.tsx",
  "components/landing/HeroSection.tsx",
  "components/landing/FeaturesSection.tsx",
  "components/landing/AdvancedToolsSection.tsx",
  "components/landing/PublicProofSection.tsx",
  "components/landing/LandingCTA.tsx",
  "components/landing/LandingFooter.tsx",
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

test("admin dashboard uses overflow-safe grids and contained ledger scrolling", () => {
  const admin = read("app/admin/page.tsx");
  const globals = read("app/globals.css");

  assert.match(admin, /max-w-\[100vw\] overflow-x-hidden/);
  assert.match(admin, /xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(0,0\.85fr\)\]/);
  assert.match(admin, /xl:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\]/);
  assert.match(admin, /scroll-x-contained mt-4/);
  assert.match(admin, /max-w-full shrink-0 items-center justify-center/);
  assert.match(globals, /overflow-x: clip/);
  assert.match(globals, /:where\(main, section, article, aside, header, footer, nav, form, div\)/);
  assert.match(globals, /\.overflow-anywhere/);
});

test("authenticated routes keep long financial data inside their containers", () => {
  const globals = read("app/globals.css");
  const loadingButton = read("LoadingButton.jsx");
  const wallet = read("app/wallet/page.tsx");
  const withdraw = read("app/withdraw/page.tsx");
  const loans = read("app/loans/page.tsx");
  const profile = read("app/profile/page.tsx");
  const marketplace = read("app/marketplace/page.tsx");
  const kyc = read("app/kyc/page.tsx");
  const notifications = read("components/NotificationBell.tsx");

  assert.match(globals, /:where\(button, input, select, textarea\)/);
  assert.match(loadingButton, /maxWidth: "100%"/);
  assert.match(wallet, /overflow-anywhere min-w-0 text-right font-semibold/);
  assert.match(withdraw, /overflow-anywhere min-w-0 text-right font-mono font-semibold/);
  assert.match(loans, /md:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(loans, /overflow-anywhere text-2xl font-display/);
  assert.match(profile, /min-w-0 flex-1 truncate/);
  assert.match(marketplace, /overflow-anywhere mt-2 text-2xl font-display/);
  assert.match(kyc, /flex min-w-0 items-center justify-between gap-3/);
  assert.match(notifications, /overflow-anywhere .*notif\.title/);
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

test("licensed partner revenue model is backend-enforced", () => {
  const revenue = read("lib/revenue.ts");
  const withdrawal = read("app/api/wallet/withdraw/route.ts");
  const kyc = read("app/api/onboarding/kyc/route.ts");
  const marketplace = read("app/api/marketplace/create/route.ts");
  const migration = read("supabase/migrations/20260519152449_licensed_partner_revenue_model.sql");
  const adminOverview = read("app/api/admin/overview/route.ts");

  assert.match(revenue, /withdrawalFeeAmount = 100/);
  assert.match(withdrawal, /fee_amount: withdrawalFeeAmount/);
  assert.match(kyc, /me2u_unlock_welcome_bonus/);
  assert.match(marketplace, /p_boost: boost/);
  assert.match(migration, /create table if not exists public\.revenue_events/);
  assert.match(migration, /welcome_bonus_unlocked_at/);
  assert.match(migration, /boosted_until/);
  assert.match(migration, /partner_offer_consent_at/);
  assert.match(migration, /'withdrawal_fee'/);
  assert.match(migration, /'marketplace_boost'/);
  assert.match(adminOverview, /withdrawal_fee_revenue/);
  assert.match(adminOverview, /marketplace_boost_revenue/);
  assert.match(adminOverview, /retained_float/);
});

test("customer UI does not expose platform revenue or investor-side benefits", () => {
  const source = customerVisibleFiles.map(read).join("\n");
  const hiddenFromCustomers = [
    "partner-backed",
    "cooperative wallet",
    "Me2U balance sheet",
    "licensed partner",
    "licensed partners",
    "Retained Float",
    "Boost Revenue",
    "Partner Leads",
    "partner revenue",
    "retained float",
    "treasury",
    "Partner Offers",
  ];

  for (const phrase of hiddenFromCustomers) {
    assert.equal(source.includes(phrase), false, `Customer UI exposes platform-side copy: ${phrase}`);
  }
});
