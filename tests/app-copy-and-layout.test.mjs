import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

function readAuthStore() {
  return read(existsSync("lib/store/auth.ts") ? "lib/store/auth.ts" : "lib/store.ts");
}

test("visible product copy uses the new loan language", () => {
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
    "welcome bonus",
    "Starts from ₦10,000",
    "Request 0% loans from ₦10,000",
    "not a loan and does not need repayment",
  ];

  for (const phrase of bannedCopy) {
    assert.equal(source.includes(phrase), false, `Unexpected old copy: ${phrase}`);
  }

  assert.match(source, /0% interest/);
  assert.match(read("lib/loans.ts"), /repeatPlatformLoanMinimum = 5000/);
});

// Account-surface overflow is exercised with actual long data at mobile and
// desktop viewports in tests/e2e/reference-pages.spec.ts.

test("admin dashboard uses overflow-safe grids and contained ledger scrolling", () => {
  const admin = read("app/admin/page.tsx");
  const globals = read("app/globals.css");

  assert.match(admin, /max-w-\[100vw\] overflow-x-hidden/);
  assert.match(admin, /xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(0,0\.85fr\)\]/);
  assert.match(admin, /xl:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\]/);
  assert.match(admin, /scroll-x-contained mt-4/);
  assert.match(admin, /max-w-full shrink-0 items-center justify-center/);
  assert.match(globals, /overflow-x: clip/);
  assert.match(
    globals,
    /:where\(main, section, article, aside, header, footer, nav, form, div\)/,
  );
  assert.match(globals, /\.overflow-anywhere/);
});

test("landing hero keeps the app phone mockup contained and full-bleed", () => {
  const hero = read("components/landing/HeroSection.tsx");
  const globals = read("app/globals.css");

  assert.match(hero, /\/Hero_final\.png/);
  assert.match(hero, /alt="Young woman using Me2U app on her smartphone"/);
  assert.match(hero, /sizes="100vw"/);
  assert.match(globals, /\.hero-section \{[^}]*overflow: hidden/s);
  assert.match(globals, /\.hero-bg-img \{[^}]*object-fit: cover/s);
  assert.doesNotMatch(globals, /100cqw/);
});

test("landing header uses the nav logo asset", () => {
  const landingHeader = read("components/landing/LandingHeader.tsx");

  assert.match(landingHeader, /src="\/me2u_nav_logo\.svg"/);
  assert.match(landingHeader, /aria-label="Me2U home"/);
});

test("authenticated routes keep long financial data inside their containers", () => {
  const globals = read("app/globals.css");
  const loadingButton = read("LoadingButton.jsx");
  const wallet = read("app/wallet/page.tsx");
  const withdraw = read("app/withdraw/page.tsx");
  const loans = read("app/loans/page.tsx");
  const marketplace = read("app/marketplace/page.tsx");
  const kyc = read("app/kyc/page.tsx");
  const notifications = read("components/NotificationBell.tsx");

  assert.match(globals, /:where\(button, input, select, textarea\)/);
  assert.match(loadingButton, /maxWidth: "100%"/);
  assert.match(wallet, /overflow-anywhere min-w-0 text-right font-semibold/);
  assert.match(withdraw, /overflow-anywhere min-w-0 text-right font-mono font-semibold/);
  assert.match(loans, /md:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(loans, /overflow-anywhere text-2xl font-display/);
  assert.match(marketplace, /overflow-anywhere mt-2 text-2xl font-display/);
  assert.match(kyc, /flex min-w-0 items-center justify-between gap-3/);
  assert.match(notifications, /className="overflow-anywhere[^"]*">\s*\{notif\.title\}/);
});

test("username login and the new loan minimum are wired", () => {
  const login = read("app/login/page.tsx");
  const store = readAuthStore();
  const loans = read("lib/loans.ts");
  const resolver = read("app/api/auth/resolve-username/route.ts");
  const migration = read(
    "migrations/migrations/20260518204542_loan_minimum_5000_copy_cleanup.sql",
  );

  assert.match(login, /Email or username/);
  assert.match(store, /\/api\/auth\/resolve-username/);
  assert.match(resolver, /query.*profiles.*username/s);
  assert.match(loans, /repeatPlatformLoanMinimum = 5000/);
  assert.match(migration, /Loans start from NGN 5,000/);
  assert.match(migration, /amount >= 5000\.00/);
});

test("cookie-backed sessions load after login and registration", () => {
  const store = readAuthStore();
  const token = read("lib/railway/token.ts");
  const uploads = read("lib/uploads.ts");

  assert.match(
    store,
    /initialize: async \(\) => \{[\s\S]*?await get\(\)\.loadCurrentUser\(\);/,
  );
  assert.doesNotMatch(
    store,
    /loadCurrentUser: async \(\) => \{\s*if \(!hasToken\(\)\)/,
    "cookie-backed sessions must not be rejected because no legacy token is stored",
  );
  assert.match(token, /process\.env\.NODE_ENV === "development"/);
  assert.match(token, /if \(legacyTokenFallbackEnabled\(\)\)/);
  assert.match(uploads, /authorizedFetch\("\/api\/uploads\/private-image"/);
  assert.doesNotMatch(uploads, /getToken\(\)|Authorization: `Bearer/);
});

test("registration payment details are disclosed only from the authenticated deposit step", () => {
  const wallet = read("app/wallet/page.tsx");
  const depositRoute = read("app/api/onboarding/registration-deposit/route.ts");
  const virtualAccountRoute = read("app/api/wallet/virtual-account/route.ts");
  const referrals = read("app/api/referrals/route.ts");

  assert.match(wallet, /View payment account details/);
  assert.match(wallet, /authorizedFetch\("\/api\/onboarding\/registration-deposit"\)/);
  assert.doesNotMatch(wallet, /NEXT_PUBLIC_PLATFORM_ACCOUNT/);
  assert.match(virtualAccountRoute, /requireAuthenticatedUser/);
  assert.match(virtualAccountRoute, /WHERE user_id = \$1 AND provider = 'wema'/);
  assert.match(depositRoute, /export async function GET/);
  assert.match(depositRoute, /auth\.user\.registrationDepositPaid/);
  assert.match(referrals, /r\.first_withdrawal_rewarded/);
  assert.match(referrals, /r\.first_repayment_rewarded/);
  assert.doesNotMatch(referrals, /registration_deposit_paid/);
});

test("registration deposit replaces manual wallet funding and provisions the dedicated account", () => {
  const wallet = read("app/wallet/page.tsx");
  const fundingRoute = read("app/api/wallet/fund/route.ts");
  const adminActions = read("app/api/admin/actions/route.ts");

  assert.doesNotMatch(wallet, /Fund Wallet/);
  assert.doesNotMatch(wallet, /Submit Funding Proof/);
  assert.doesNotMatch(wallet, /PaystackFundingAccount/);
  assert.match(fundingRoute, /Manual wallet funding is no longer available/);
  assert.match(adminActions, /registrationDepositUserId/);
  assert.match(adminActions, /Dedicated wallet account request failed after deposit approval/);
});

test("referrals remain available before registration deposit and KYC approval", () => {
  const onboarding = read("components/ProtectedOnboarding.tsx");
  const depositGuard = onboarding.match(/const depositRequiredPrefixes = \[([\s\S]*?)\];/);
  const kycGuard = onboarding.match(/const kycRequiredPrefixes = \[([\s\S]*?)\];/);

  assert.ok(depositGuard, "registration-deposit route guard must exist");
  assert.ok(kycGuard, "KYC route guard must exist");
  assert.doesNotMatch(depositGuard[1], /"\/referrals"/);
  assert.doesNotMatch(kycGuard[1], /"\/referrals"/);
});

test("referral rewards follow the four-stage NGN 2,500 lifecycle", () => {
  const page = read("app/referrals/page.tsx");
  const route = read("app/api/referrals/route.ts");
  const migration = read("migrations/migrations/20260920000004_referral_reward_lifecycle.sql");
  const adminActions = read("app/api/admin/actions/route.ts");

  assert.match(page, /You earn ₦1,500 referral bonus and they earn ₦500/);
  assert.match(page, /Friend refers a friend/);
  assert.match(page, /₦2,500 for you/);
  assert.match(page, /pendingMilestones = stats/);
  assert.doesNotMatch(page, /total_referrals \* 2500/);
  assert.match(route, /referral_reward_events/);
  assert.match(migration, /'direct_signup', 1500/);
  assert.match(migration, /'new_member_signup', 500/);
  assert.match(migration, /'first_withdrawal', 250/);
  assert.match(migration, /'first_repayment', 250/);
  assert.match(migration, /'indirect_signup', 500/);
  assert.match(migration, /UNIQUE \(recipient_id, source_user_id, reward_type\)/);
  assert.doesNotMatch(adminActions, /Welcome Bonus Unlocked/);
});

test("auth and identity flows avoid release-blocking shortcuts", () => {
  const otp = read("lib/server/otp.ts");
  const resetPassword = read("app/api/auth/reset-password/route.ts");
  const register = read("app/api/auth/register/route.ts");
  const store = read("lib/store.ts");
  const securityPin = read("app/api/security/pin/route.ts");
  const railwayAuth = read("lib/railway/auth.ts");
  const kyc = read("app/api/onboarding/kyc/route.ts");
  const adminActions = read("app/api/admin/actions/route.ts");
  const source = [otp, resetPassword, register, store, securityPin, kyc, adminActions].join(
    "\n",
  );

  assert.match(otp, /randomInt\(100000, 1000000\)/);
  assert.match(otp, /timingSafeEqual/);
  assert.match(resetPassword, /mode === "verify_code"/);
  assert.match(resetPassword, /resetToken/);
  assert.match(register, /step === "verify_code"/);
  assert.match(register, /registrationToken/);
  assert.match(kyc, /kyc_verified: false/);
  assert.match(railwayAuth, /p\.transaction_pin\s+AS "transactionPin"/);
  assert.match(securityPin, /logoutAllSessions \? undefined : auth\.jwtPayload\.jti/);
  assert.match(securityPin, /logoutAllSessions/);
  assert.match(securityPin, /loggedOut: logoutAllSessions/);
  assert.match(adminActions, /approve_kyc/);
  assert.doesNotMatch(source, /fallback_secret_for_dev_only/);
  assert.doesNotMatch(source, /verify_only_123/);
  assert.doesNotMatch(source, /me2u_session_password/);
  assert.doesNotMatch(source, /getGoogleUserPassword/);
});

test("bill payments and withdrawals use hardened financial paths", () => {
  const payBill = read("app/api/wallet/pay-bill/route.ts");
  const withdrawal = read("app/api/wallet/withdraw/route.ts");
  const withdrawPage = read("app/withdraw/page.tsx");
  const revenue = read("lib/revenue.ts");
  const migration = read(
    "migrations/migrations/20260523110905_harden_auth_and_atomic_bill_payments.sql",
  );
  const billsMigration = read(
    "migrations/migrations/20260526170504_me2u_bills_architecture.sql",
  );

  assert.match(payBill, /Legacy wallet bill debit is retired/);
  assert.match(migration, /create or replace function private\.me2u_pay_bill/);
  assert.match(billsMigration, /create table if not exists public\.bill_transactions/);
  assert.match(billsMigration, /create or replace function private\.me2u_create_bill_debit/);
  assert.match(
    billsMigration,
    /create or replace function private\.me2u_refund_bill_transaction/,
  );
  assert.match(migration, /revoke execute on function public\.me2u_pay_bill/);
  assert.match(migration, /revoke insert, update on public\.referrals from authenticated/);
  assert.match(migration, /You can only read your own referral stats/);
  assert.match(withdrawal, /account_number/);
  assert.match(withdrawal, /getWithdrawalProcessorFee/);
  assert.match(withdrawPage, /PinInput/);
  assert.match(withdrawPage, /pin: transactionPin/);
  assert.match(revenue, /withdrawalProcessorFeeRate = 0\.015/);
});

test("Wema banking rails are adapter-backed and ledger-first", () => {
  const migration = read("migrations/migrations/20260527001749_wema_primary_banking_rails.sql");
  const bankingProvider = read("server/src/modules/banking/banking-provider.interface.ts");
  const wemaProvider = read("server/src/modules/banking/wema.provider.ts");
  const bankingService = read("server/src/modules/banking/banking.service.ts");
  const walletController = read("server/src/modules/wallet/wallet.controller.ts");
  const webhooks = read("server/src/modules/webhooks/webhooks.controller.ts");
  const env = read(".env.example");

  assert.match(migration, /create table if not exists public\.virtual_accounts/);
  assert.match(migration, /create table if not exists public\.wallet_inflows/);
  assert.match(migration, /create table if not exists public\.bank_transfers/);
  assert.match(migration, /create or replace function private\.me2u_credit_wallet_inflow/);
  assert.match(migration, /'bank_transfer'/);
  assert.match(bankingProvider, /export interface BankingProvider/);
  assert.match(wemaProvider, /WEMA_ENABLED/);
  assert.match(wemaProvider, /WEMA_WEBHOOK_SECRET/);
  assert.match(bankingService, /me2u_credit_wallet_inflow/);
  assert.match(walletController, /@Get\("virtual-account"\)/);
  assert.match(walletController, /@Post\("requery-inflow"\)/);
  assert.match(webhooks, /@Post\("wema\/inflow"\)/);
  assert.match(env, /WEMA_ENABLED=false/);
  assert.match(env, /WEMA_TRANSFERS_ENABLED=false/);
});

test("Wema DVA creation starts after admin KYC approval while Paystack DVA is fallback-gated", () => {
  const adminActions = read("app/api/admin/actions/route.ts");
  const register = read("app/api/auth/register/route.ts");
  const wemaHelper = read("lib/server/wema-virtual-account.ts");
  const backfill = read("scripts/backfill-wema-virtual-accounts.mjs");

  assert.match(adminActions, /requestWemaVirtualAccountForKycUser/);
  assert.match(adminActions, /action === "approve_kyc"/);
  assert.match(register, /PAYSTACK_DVA_ENABLED === "true"/);
  assert.match(wemaHelper, /WEMA_VIRTUAL_ACCOUNT_PATH/);
  assert.match(backfill, /kyc_verified/);
  assert.match(backfill, /nin_last4/);
  assert.match(backfill, /--dry-run/);
});

test("licensed partner revenue model is backend-enforced", () => {
  const revenue = read("lib/revenue.ts");
  const withdrawal = read("app/api/wallet/withdraw/route.ts");
  const marketplace = read("app/api/marketplace/create/route.ts");
  const migration = read(
    "migrations/migrations/20260519152449_licensed_partner_revenue_model.sql",
  );
  const adminOverview =
    read("app/api/admin/overview/route.ts") + "\n" + read("lib/server/admin-summary.ts");

  assert.match(revenue, /withdrawalFeeAmount = 100/);
  assert.match(withdrawal, /feeAmount: withdrawalFeeAmount/);
  assert.match(marketplace, /'marketplace_boost'/);
  assert.match(migration, /create table if not exists public\.revenue_events/);
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
    assert.equal(
      source.includes(phrase),
      false,
      `Customer UI exposes platform-side copy: ${phrase}`,
    );
  }
});

test("Me2U Guide assistant is citation-bound and globally mounted", () => {
  const route = read("app/api/assistant/chat/route.ts");
  const knowledge = read("lib/assistant/knowledge.ts");
  const safety = read("lib/assistant/safety.ts");
  const accountContext = read("lib/assistant/account-context.ts");
  const widget = read("components/Me2UAssistantWidget.tsx");
  const layout = read("app/layout.tsx");
  const readiness = read("lib/server/launch-readiness.ts");
  const env = read(".env.example");

  assert.match(route, /\/v1\/responses/);
  assert.match(route, /json_schema/);
  assert.match(route, /max_output_tokens/);
  assert.match(route, /buildExtractiveFallbackAnswer/);
  assert.match(route, /conversationalFallbackAnswer/);
  assert.match(route, /sanitizeAssistantAnswer/);
  assert.match(route, /text\/event-stream/);
  assert.match(route, /function sse\(event: "delta" \| "metadata" \| "error"/);
  assert.match(route, /sse\("delta"/);
  assert.match(route, /sse\("metadata"/);
  assert.match(route, /OPENAI_MODEL/);
  assert.match(route, /gpt-4o-mini/);

  assert.match(knowledge, /PRODUCT\.md/);
  assert.match(knowledge, /design\.md/);
  assert.match(knowledge, /legalDocuments/);
  assert.match(knowledge, /supportDocuments/);
  assert.match(knowledge, /growthFeatureModules/);
  assert.match(knowledge, /visibleSecurityFeatures/);
  assert.match(knowledge, /Withdrawal requirements/);
  assert.match(knowledge, /Loan requirements/);

  assert.match(safety, /I do not have enough verified Me2U information to answer that/);
  assert.match(safety, /isConversationalMessage/);
  assert.match(safety, /otp/);
  assert.match(safety, /password/);
  assert.match(safety, /pin/);
  assert.match(safety, /handoffNeeded/);

  assert.match(accountContext, /Sensitive fields redacted/);
  assert.match(accountContext, /maskEmail/);
  assert.match(accountContext, /maskPhone/);
  assert.doesNotMatch(accountContext, /account_number[^\\n]+summary/);

  assert.match(widget, /Me2U Guide/);
  assert.match(widget, /Open Me2U Guide/);
  assert.match(widget, /Type any question in your own words/);
  assert.match(widget, /Ask in your own words/);
  assert.match(widget, /Optional examples/);
  assert.match(widget, /Ask anything or pick a suggestion/);
  assert.match(widget, /<textarea/);
  assert.match(widget, /placeholder="Type your own question\.\.\."/);
  assert.match(widget, /onKeyDown=\{handleComposerKeyDown\}/);
  assert.match(widget, /event\.key !== "Enter"/);
  assert.match(widget, /event\.shiftKey/);
  assert.match(widget, /sendMessage\(input\)/);
  assert.match(widget, /Create support request/);
  assert.match(widget, /Why can't I withdraw yet\?/);
  assert.match(widget, /html|dark|light|theme|var\(--color-bg-card\)/);
  assert.match(layout, /<Me2UAssistantWidget \/>/);
  assert.match(readiness, /OPENAI_API_KEY/);

  assert.match(env, /OPENAI_API_KEY/);
  assert.doesNotMatch(env, /sk-proj-[A-Za-z0-9_-]{32,}/);
  assert.match(env, /OPENAI_TIMEOUT_MS/);
  assert.match(env, /OPENAI_MAX_OUTPUT_TOKENS/);
  assert.match(env, /ASSISTANT_MAX_CONTEXT_SNIPPETS/);
});
