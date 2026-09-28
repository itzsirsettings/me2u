import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const registrationDeposit = loadSource("lib/server/registration-deposit-paystack.ts", {
  "@/lib/railway/client": {
    query: async () => ({ rows: [] }),
    withTransaction: async (fn) => fn({ query: async () => ({ rows: [] }) }),
  },
  "@/lib/server/wallet-ledger": {
    buildLedgerRef: () => "ledger-ref",
    recordWalletMove: async () => ({}),
  },
  "@/lib/server/logger": { logWarn: () => {} },
});
const registrationTransferClient = loadSource("lib/paystack-registration.ts");

const successfulCharge = {
  reference: "regdep-reference",
  status: "success",
  amount: 200000,
  currency: "NGN",
  channel: "bank_transfer",
};

test("Paystack registration transfers require exact NGN amount, channel, and reference", () => {
  assert.equal(
    registrationDeposit.isVerifiedRegistrationDepositCharge(
      successfulCharge,
      "regdep-reference",
    ),
    true,
  );
  assert.equal(
    registrationDeposit.isVerifiedRegistrationDepositCharge(
      { ...successfulCharge, amount: 199999 },
      "regdep-reference",
    ),
    false,
  );
  assert.equal(
    registrationDeposit.isVerifiedRegistrationDepositCharge(
      { ...successfulCharge, channel: "card" },
      "regdep-reference",
    ),
    false,
  );
  assert.equal(
    registrationDeposit.isVerifiedRegistrationDepositCharge(
      { ...successfulCharge, reference: "another-reference" },
      "regdep-reference",
    ),
    false,
  );
});

test("Paystack Nigerian transfer response works without optional fields", () => {
  const payload = {
    status: true,
    message: "Charge attempted",
    data: {
      reference: "regdep-reference",
      status: "pending_bank_transfer",
      account_name: "TEST-MANAGED-ACCOUNT",
      account_number: "1260257501",
      bank: { slug: "test-bank", name: "Test Bank", id: 24 },
      account_expires_at: "2026-09-28T16:40:57.954Z",
    },
  };

  assert.deepEqual(
    registrationDeposit.readRegistrationTransferAccount(payload, "regdep-reference", 200000),
    {
      accountName: "TEST-MANAGED-ACCOUNT",
      accountNumber: "1260257501",
      bankName: "Test Bank",
      transactionReference: "regdep-reference",
    },
  );
  assert.equal(
    registrationDeposit.readRegistrationTransferAccount(
      { ...payload, data: { ...payload.data, amount: 199999 } },
      "regdep-reference",
      200000,
    ),
    null,
  );
  assert.equal(
    registrationDeposit.readRegistrationTransferAccount(payload, "another-reference", 200000),
    null,
  );
  assert.equal(
    registrationDeposit.readRegistrationTransferAccount(
      { ...payload, data: { ...payload.data, account_number: "1234" } },
      "regdep-reference",
      200000,
    ),
    null,
  );
  assert.equal(
    registrationDeposit.readRegistrationTransferAccount(
      { ...payload, data: { ...payload.data, status: "failed" } },
      "regdep-reference",
      200000,
    ),
    null,
  );
  assert.equal(
    registrationDeposit.readRegistrationTransferAccount(
      {
        ...payload,
        data: {
          ...payload.data,
          account_name: "  TEST-MANAGED-ACCOUNT ",
          bank: { ...payload.data.bank, name: " Test Bank " },
          amount: 200000,
          currency: "NGN",
          transaction_reference: "bank-ref",
        },
      },
      "regdep-reference",
      200000,
    )?.transactionReference,
    "bank-ref",
  );
});

test("Paystack transfer recovery messages preserve server guidance for successful HTTP responses", () => {
  const recovery = registrationTransferClient.readPaystackRegistrationTransferError(
    {
      error: "Paystack started this transfer, but its details could not be saved.",
      reference: "regdep-recovery-reference",
      status: "review",
    },
    202,
  );
  assert.match(recovery, /details could not be saved/);
  assert.match(recovery, /regdep-recovery-reference/);
  assert.doesNotMatch(recovery, /Try again/);
  assert.match(
    registrationTransferClient.readPaystackRegistrationTransferError({}, 202),
    /Refresh this page before trying again/,
  );
  assert.equal(
    registrationTransferClient.readPaystackRegistrationTransferReference({
      reference: "regdep-12345678-1234-1234-1234-123456789abc",
    }),
    "regdep-12345678-1234-1234-1234-123456789abc",
  );
  assert.equal(
    registrationTransferClient.readPaystackRegistrationTransferReference({
      reference: "arbitrary-reference",
    }),
    null,
  );
});

test("Paystack ambiguous creation outcomes are held for reconciliation", () => {
  assert.equal(
    registrationDeposit.registrationTransferFailureStatus(null, false, false),
    "review",
  );
  assert.equal(
    registrationDeposit.registrationTransferFailureStatus(503, false, false),
    "review",
  );
  assert.equal(
    registrationDeposit.registrationTransferFailureStatus(200, true, false),
    "review",
  );
  assert.equal(
    registrationDeposit.registrationTransferFailureStatus(400, false, false),
    "failed",
  );
  assert.equal(
    registrationDeposit.registrationTransferFailureStatus(400, false, true),
    "review",
  );
});

test("Paystack transfer-account expiry stays below the provider's documented 25-minute limit", () => {
  const start = new Date("2026-09-28T12:00:00Z");
  const expiresAt = registrationDeposit.registrationTransferExpiresAt(start);
  assert.equal(expiresAt.toISOString(), "2026-09-28T12:24:00.000Z");
  assert.ok(expiresAt.getTime() - start.getTime() < 25 * 60 * 1000);
});

test("Paystack registration transfer details expose only the expected fields", () => {
  assert.deepEqual(
    registrationDeposit.readRegistrationDepositTransferDetails({
      reference: "regdep-reference",
      account_name: "Me2U Payments",
      account_number: "1234567890",
      bank_name: "Test Bank",
      transaction_reference: "narration",
      expires_at: "2026-09-27T20:00:00.000Z",
      status: "pending",
      raw_payload: { secret: "never returned" },
    }),
    {
      reference: "regdep-reference",
      accountName: "Me2U Payments",
      accountNumber: "1234567890",
      bankName: "Test Bank",
      transactionReference: "narration",
      expiresAt: "2026-09-27T20:00:00.000Z",
      status: "pending",
    },
  );
  assert.equal(registrationDeposit.readRegistrationDepositTransferDetails(null), null);
});

test("verified Paystack transfers credit and unlock once in a single transaction", async () => {
  let walletCredits = 0;
  const statements = [];
  const pendingPayment = {
    id: "payment-id",
    user_id: "user-id",
    reference: "regdep-reference",
    amount: 2000,
    status: "pending",
  };
  const settlement = loadSource("lib/server/registration-deposit-paystack.ts", {
    "@/lib/railway/client": {
      query: async () => ({ rows: [pendingPayment] }),
      withTransaction: async (run) =>
        run({
          query: async (sql) => {
            statements.push(sql);
            if (sql.includes("FOR UPDATE")) return { rows: [pendingPayment] };
            if (sql.includes("INSERT INTO payment_proofs"))
              return { rows: [{ id: "proof-id" }] };
            if (sql.includes("UPDATE profiles")) return { rows: [{ id: "user-id" }] };
            return { rows: [] };
          },
        }),
    },
    "@/lib/server/wallet-ledger": {
      buildLedgerRef: () => "ledger-ref",
      recordWalletMove: async () => {
        walletCredits += 1;
        return { balance: 2000, locked: 0, walletId: "wallet-id" };
      },
    },
    "@/lib/server/logger": { logWarn: () => {} },
  });

  assert.equal(
    await settlement.completeRegistrationDepositCharge(successfulCharge, "event-id"),
    true,
  );
  assert.equal(walletCredits, 1);
  assert.ok(statements.some((sql) => sql.includes("UPDATE profiles")));
  assert.ok(statements.some((sql) => sql.includes("UPDATE registration_deposit_payments")));
});

test("wrong-amount Paystack transfers are held for review and never credited", async () => {
  let walletCredits = 0;
  let reviewStatusSet = false;
  const settlement = loadSource("lib/server/registration-deposit-paystack.ts", {
    "@/lib/railway/client": {
      query: async (sql) => {
        if (sql.includes("SELECT id, user_id, reference, amount, status")) {
          return {
            rows: [
              {
                id: "payment-id",
                user_id: "user-id",
                reference: "regdep-reference",
                amount: 2000,
                status: "pending",
              },
            ],
          };
        }
        if (sql.includes("SET status = 'review'")) reviewStatusSet = true;
        return { rows: [] };
      },
      withTransaction: async (run) => run({ query: async () => ({ rows: [] }) }),
    },
    "@/lib/server/wallet-ledger": {
      buildLedgerRef: () => "ledger-ref",
      recordWalletMove: async () => {
        walletCredits += 1;
        return { balance: 2000, locked: 0, walletId: "wallet-id" };
      },
    },
    "@/lib/server/logger": { logWarn: () => {} },
  });

  assert.equal(
    await settlement.completeRegistrationDepositCharge(
      { ...successfulCharge, amount: 199999 },
      "event-id",
    ),
    true,
  );
  assert.equal(reviewStatusSet, true);
  assert.equal(walletCredits, 0);
});

test("Paystack registration deposits settle separately from generic wallet funding", async () => {
  const webhook = await import("node:fs/promises").then((fs) =>
    fs.readFile("app/api/webhooks/paystack/route.ts", "utf8"),
  );
  const route = await import("node:fs/promises").then((fs) =>
    fs.readFile("app/api/onboarding/registration-deposit/paystack/route.ts", "utf8"),
  );
  const migration = await import("node:fs/promises").then((fs) =>
    fs.readFile("railway/migrations/023_registration_deposit_paystack_transfer.sql", "utf8"),
  );
  const runner = await import("node:fs/promises").then((fs) =>
    fs.readFile("run-all-migrations.py", "utf8"),
  );

  assert.match(webhook, /completeRegistrationDepositCharge\(data, eventId\)/);
  assert.match(route, /https:\/\/api\.paystack\.co\/charge/);
  assert.match(route, /bank_transfer: \{ account_expires_at: expiresAt \}/);
  assert.match(route, /readRegistrationTransferAccount\(/);
  assert.match(route, /completeRegistrationDepositCharge\(transaction/);
  assert.match(migration, /registration_deposit_one_active_per_user/);
  assert.match(migration, /ALTER COLUMN receipt_image_url DROP NOT NULL/);
  assert.match(runner, /023_registration_deposit_paystack_transfer\.sql/);
});
