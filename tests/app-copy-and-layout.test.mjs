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

test("landing phone mockup uses measured responsive scaling", () => {
  const phoneHero = read("components/landing/PhoneHero.tsx");

  assert.match(phoneHero, /ResizeObserver/);
  assert.match(phoneHero, /Math\.min\(1, frame\.clientWidth \/ PHONE_WIDTH\)/);
  assert.match(phoneHero, /aspect-\[423\/878\]/);
  assert.doesNotMatch(phoneHero, /100cqw/);
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

test("auth and identity flows avoid release-blocking shortcuts", () => {
  const otp = read("lib/server/otp.ts");
  const resetPassword = read("app/api/auth/reset-password/route.ts");
  const register = read("app/api/auth/register/route.ts");
  const store = read("lib/store.ts");
  const securityPin = read("app/api/security/pin/route.ts");
  const kyc = read("app/api/onboarding/kyc/route.ts");
  const adminActions = read("app/api/admin/actions/route.ts");
  const source = [otp, resetPassword, register, store, securityPin, kyc, adminActions].join("\n");

  assert.match(otp, /randomInt\(100000, 1000000\)/);
  assert.match(otp, /timingSafeEqual/);
  assert.match(resetPassword, /mode === "verify_code"/);
  assert.match(resetPassword, /resetToken/);
  assert.match(register, /step === "verify_code"/);
  assert.match(register, /registrationToken/);
  assert.match(kyc, /kyc_verified: false/);
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
  const migration = read("supabase/migrations/20260523110905_harden_auth_and_atomic_bill_payments.sql");
  const billsMigration = read("supabase/migrations/20260526170504_me2u_bills_architecture.sql");

  assert.match(payBill, /Legacy wallet bill debit is retired/);
  assert.match(migration, /create or replace function private\.me2u_pay_bill/);
  assert.match(billsMigration, /create table if not exists public\.bill_transactions/);
  assert.match(billsMigration, /create or replace function private\.me2u_create_bill_debit/);
  assert.match(billsMigration, /create or replace function private\.me2u_refund_bill_transaction/);
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
  const migration = read("supabase/migrations/20260527001749_wema_primary_banking_rails.sql");
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
  const migration = read("supabase/migrations/20260519152449_licensed_partner_revenue_model.sql");
  const adminOverview = read("app/api/admin/overview/route.ts");

  assert.match(revenue, /withdrawalFeeAmount = 100/);
  assert.match(withdrawal, /fee_amount: withdrawalFeeAmount/);
  assert.match(marketplace, /p_boost: boost/);
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
    assert.equal(source.includes(phrase), false, `Customer UI exposes platform-side copy: ${phrase}`);
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
  assert.match(route, /gpt-5\.2/);

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
