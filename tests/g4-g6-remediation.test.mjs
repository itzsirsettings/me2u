import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("G4: withdrawal processor cost is booked as a revenue event", () => {
  const withdraw = read("app/api/wallet/withdraw/route.ts");
  const migration = read("migrations/migrations/20260919100000_g4_fee_transparency.sql");
  const railwayMigration = read("railway/migrations/013_g4_fee_transparency.sql");

  assert.match(withdraw, /'withdrawal_fee'/);
  assert.match(withdraw, /'withdrawal_processor_cost'/);
  assert.match(withdraw, /Paystack withdrawal processor cost/);
  assert.match(migration, /add value if not exists 'withdrawal_processor_cost'/);
  assert.match(railwayMigration, /add value if not exists 'withdrawal_processor_cost'/);
  // Fee model decision matrix is documented at the single source of truth
  assert.match(read("lib/revenue.ts"), /ABSORBED by the Me2U/);
  assert.match(read("lib/revenue.ts"), /0% interest, 0% origination/);
});

test("G4: bills margin booked as convenience fee on success paths only", () => {
  const bills = read("server/src/modules/bills/bills.service.ts");

  assert.match(bills, /bills_convenience_fee/);
  assert.match(bills, /recordConvenienceFee/);
  // Both fulfil and requery paths book it, guarded against double-booking
  assert.match(bills, /status === "successful" && String\(bill\.status\) !== "successful"/);
  assert.ok(
    (bills.match(/recordConvenienceFee\(bill\)/g) || []).length >= 2,
    "expected convenience fee booking on both fulfil and requeryNow paths",
  );
});

test("G5: cron heartbeat table + best-effort instrumentation", () => {
  const migration = read("migrations/migrations/20260919100000_g4_fee_transparency.sql");
  const heartbeat = read("lib/server/cron-heartbeat.ts");
  const unlockCron = read("app/api/cron/unlock-eligible-users/route.ts");
  const cleanupCron = read("app/api/cron/cleanup-otp/route.ts");

  assert.match(migration, /create table if not exists public\.cron_runs/);
  assert.match(heartbeat, /export async function markCronStarted/);
  assert.match(heartbeat, /export async function markCronFinished/);
  // Heartbeat must never block cron success
  assert.match(heartbeat, /catch \(error\) \{[\s\S]*?logWarn\("cron_heartbeat_start_failed"/);
  assert.match(unlockCron, /markCronStarted\(CRON_JOB_NAME\)/);
  assert.match(unlockCron, /markCronFinished\(CRON_JOB_NAME/);
  assert.match(cleanupCron, /markCronStarted\(CRON_JOB_NAME\)/);
  assert.match(cleanupCron, /markCronFinished\(CRON_JOB_NAME/);
});

test("G5: unlock cron uses withTransaction instead of raw BEGIN/COMMIT", () => {
  const unlockCron = read("app/api/cron/unlock-eligible-users/route.ts");
  assert.match(unlockCron, /db\.withTransaction\(async \(client\) =>/);
  assert.doesNotMatch(unlockCron, /db\.query\("(BEGIN|COMMIT|ROLLBACK)"\)/);
});

test("G5: KYC submissions are rate limited per IP and per user", () => {
  const kyc = read("app/api/onboarding/kyc/route.ts");
  assert.match(kyc, /isRateLimited\(`kyc-ip:\$\{clientIp\}`/);
  assert.match(kyc, /isRateLimited\(`kyc-user:\$\{auth\.user\.id\}`/);
  assert.match(kyc, /tooManyRequestsResponse\(/);
});

test("G5: 429 responses can carry a Retry-After header", () => {
  const auth = read("lib/server/auth.ts");
  assert.match(auth, /Retry-After/);
  assert.match(auth, /retryAfterSeconds\?: number/);
});

test.skip("G5 legacy: skipped features were labelled Coming Soon (NIN + bill idempotency)", () => {
  const kyc = read("app/kyc/page.tsx");
  const bills = read("app/bills/page.tsx");
  const checklist = read("FINAL_PRODUCTION_CHECKLIST.md");

  assert.match(kyc, /NIN verification — coming\s+soon/);
  assert.match(bills, /VTPass bill-service idempotency audit — coming\s+soon/);
  assert.match(checklist, /Coming Soon \/ Post-launch/);
  assert.match(checklist, /NIN automated verification hardening/);
  assert.match(checklist, /VTPass bill-service idempotency audit/);
  // Railway cron setup documented with schedules + heartbeat verification
  assert.match(checklist, /api\/cron\/unlock-eligible-users/);
  assert.match(checklist, /0 \* \* \* \*/);
  assert.match(checklist, /FROM cron_runs/);
});

test.skip("G5 legacy: bill payments were labelled Coming Soon and purchases disabled", () => {
  const bills = read("app/bills/page.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const wallet = read("app/wallet/page.tsx");
  const checklist = read("FINAL_PRODUCTION_CHECKLIST.md");

  // Single launch flag gates the entire bills surface
  assert.match(bills, /const BILLS_COMING_SOON = true;/);
  assert.match(bills, /Bill payments — coming\s+soon/);
  assert.match(bills, /BILLS_COMING_SOON \|\| submitting/);
  assert.match(bills, /\? "Coming Soon"/);
  // Entry points advertise the same state
  assert.match(dashboard, /comingSoon: true/);
  assert.match(dashboard, /Coming soon/);
  assert.match(wallet, /Bill payments are coming soon/);
  assert.match(checklist, /Bill payments \(airtime\/data\/electricity\/cable\)/);
});

test("G5: bill-payment UI is retired", () => {
  const bills = read("app/bills/page.tsx");
  const receipt = read("app/bills/transactions/[reference]/page.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const bottomNav = read("components/BottomNav.tsx");

  assert.match(bills, /redirect\("\/dashboard"\)/);
  assert.match(receipt, /redirect\("\/dashboard"\)/);
  assert.doesNotMatch(dashboard, /Pay Bills|\/bills/);
  assert.doesNotMatch(bottomNav, /label: "Bills"|href="\/bills"/);
});

test("G6: lint script does not use removed `next lint` command", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.lint, "eslint . --max-warnings 0");
  assert.ok(!pkg.scripts.lint.includes("next lint"));
});

test("G7: withdrawal reconciliation cron is safe by construction", () => {
  const helper = read("lib/server/withdrawal-reconcile.ts");
  const cron = read("app/api/cron/reconcile-withdrawals/route.ts");
  const vercel = JSON.parse(read("vercel.json"));

  // Deterministic reference lives in the shared helper both sides import
  assert.match(helper, /me2u-wdr-/);
  assert.match(read("lib/server/withdrawal-status.ts"), /me2u-wdr-/);
  assert.match(
    read("app/api/wallet/withdraw/route.ts"),
    /withdrawalTransferReference,\s*\n?\s*\} from "@\/lib\/server\/withdrawal-status"/,
  );
  // Only positive failure signals refund: 404 / failed / reversed / abandoned
  assert.match(helper, /res\.status === 404/);
  assert.match(helper, /"reversed"/);
  // Ambiguity never refunds — unknown maps to skip, pending stays pending
  assert.match(helper, /kind: "unknown"/);
  assert.match(helper, /return "skipped"/);
  // Terminal writes reuse the webhook idempotency guards
  assert.match(helper, /AND status IN \(\$\{WITHDRAWAL_IN_FLIGHT_SQL\}\)/);
  assert.match(helper, /buildLedgerRef\("wdr-rev", withdrawal\.id\)/);
  // Cron: auth-gated, heartbeat-instrumented, grace window before sweeping
  assert.match(cron, /Bearer \$\{cronSecret\}/);
  assert.match(cron, /markCronStarted\(CRON_JOB_NAME\)/);
  assert.match(cron, /markCronFinished\(/);
  assert.match(cron, /RECONCILE_AFTER_MINUTES/);
  assert.ok(
    vercel.crons.some(
      (c) => c.path === "/api/cron/reconcile-withdrawals" && c.schedule === "*/15 * * * *",
    ),
    "expected reconcile-withdrawals on a */15 schedule in vercel.json",
  );
});
