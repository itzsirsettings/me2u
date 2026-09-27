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
  assert.match(route, /completeRegistrationDepositCharge\(transaction/);
  assert.match(migration, /registration_deposit_one_active_per_user/);
  assert.match(migration, /ALTER COLUMN receipt_image_url DROP NOT NULL/);
  assert.match(runner, /023_registration_deposit_paystack_transfer\.sql/);
});
