import { query, withTransaction } from "@/lib/railway/client";
import { logWarn } from "@/lib/server/logger";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";

const REGISTRATION_DEPOSIT_KOBO = 200_000;
const REGISTRATION_DEPOSIT_NGN = 2_000;

type JsonRecord = Record<string, unknown>;
type PendingRegistrationPayment = {
  id: string;
  user_id: string;
  reference: string;
  amount: number;
  status: string;
};

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function isVerifiedRegistrationDepositCharge(value: unknown, expectedReference: string) {
  const charge = record(value);
  return Boolean(
    charge &&
    charge.reference === expectedReference &&
    charge.status === "success" &&
    Number(charge.amount) === REGISTRATION_DEPOSIT_KOBO &&
    charge.currency === "NGN" &&
    charge.channel === "bank_transfer",
  );
}

/**
 * Claims and completes only a Paystack-confirmed registration transfer.
 * Returns true for all registration-deposit events, including mismatches, so
 * they can never fall through to the generic wallet funding webhook.
 */
export async function completeRegistrationDepositCharge(
  value: unknown,
  eventId: string,
): Promise<boolean> {
  const charge = record(value);
  const reference = typeof charge?.reference === "string" ? charge.reference : "";
  const metadata = record(charge?.metadata);
  const isRegistrationEvent = metadata?.type === "registration_deposit";

  const { rows: payments } = reference
    ? await query<PendingRegistrationPayment>(
        `SELECT id, user_id, reference, amount, status
           FROM registration_deposit_payments
          WHERE reference = $1
          LIMIT 1`,
        [reference],
      )
    : { rows: [] as PendingRegistrationPayment[] };

  const payment = payments[0];
  if (!payment && !isRegistrationEvent) return false;
  if (!payment) return true;

  if (
    !isVerifiedRegistrationDepositCharge(value, payment.reference) ||
    Number(payment.amount) !== REGISTRATION_DEPOSIT_NGN ||
    (typeof metadata?.user_id === "string" && metadata.user_id !== payment.user_id)
  ) {
    await query(
      `UPDATE registration_deposit_payments SET status = 'review', updated_at = NOW()
        WHERE id = $1 AND status IN ('initializing', 'pending')`,
      [payment.id],
    );
    logWarn("registration_paystack_charge_review_required", { reference: payment.reference });
    return true;
  }

  await withTransaction(async (client) => {
    const { rows: lockedRows } = await client.query<PendingRegistrationPayment>(
      `SELECT id, user_id, reference, amount, status
         FROM registration_deposit_payments
        WHERE id = $1
        FOR UPDATE`,
      [payment.id],
    );
    const lockedPayment = lockedRows[0];
    if (!lockedPayment || lockedPayment.status === "success") return;
    if (!isVerifiedRegistrationDepositCharge(value, lockedPayment.reference)) {
      await client.query(
        `UPDATE registration_deposit_payments SET status = 'review', updated_at = NOW() WHERE id = $1`,
        [lockedPayment.id],
      );
      return;
    }

    const { rows: proofRows } = await client.query<{ id: string }>(
      `INSERT INTO payment_proofs
         (user_id, amount, reference, type, receipt_image_url, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'registration_deposit', NULL, 'approved', NOW(), NOW())
       ON CONFLICT (user_id, reference) DO UPDATE
         SET amount = EXCLUDED.amount,
             receipt_image_url = NULL,
             status = 'approved',
             updated_at = NOW()
       WHERE payment_proofs.type = 'registration_deposit'
       RETURNING id`,
      [lockedPayment.user_id, REGISTRATION_DEPOSIT_NGN, lockedPayment.reference],
    );
    if (!proofRows[0]) {
      await client.query(
        `UPDATE registration_deposit_payments SET status = 'review', updated_at = NOW() WHERE id = $1`,
        [lockedPayment.id],
      );
      return;
    }

    await recordWalletMove(client, {
      userId: lockedPayment.user_id,
      txType: "credit",
      source: "deposit",
      reference: buildLedgerRef("regdep", lockedPayment.reference),
      description: `Registration deposit of ₦${REGISTRATION_DEPOSIT_NGN.toLocaleString()} confirmed via Paystack Transfer`,
      balanceDelta: REGISTRATION_DEPOSIT_NGN,
      metadata: { provider: "paystack", paymentReference: lockedPayment.reference, eventId },
    });
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, created_at)
       VALUES ($1, 'deposit', $2, $3, NOW())`,
      [
        lockedPayment.user_id,
        REGISTRATION_DEPOSIT_NGN,
        `Registration deposit of ₦${REGISTRATION_DEPOSIT_NGN.toLocaleString()} confirmed`,
      ],
    );

    const { rows: profiles } = await client.query<{ id: string }>(
      `UPDATE profiles
          SET registration_deposit_paid = true,
              registration_deposit_amount = $1,
              registration_deposit_confirmed_at = NOW(),
              account_unlocked = true,
              unlock_method = 'registration_deposit',
              account_unlock_paid_at = COALESCE(account_unlock_paid_at, NOW()),
              updated_at = NOW()
        WHERE id = $2
        RETURNING id`,
      [REGISTRATION_DEPOSIT_NGN, lockedPayment.user_id],
    );
    if (!profiles[0]) throw new Error("Registration deposit user profile is missing.");

    await client.query(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at)
       VALUES ($1, 'Payment Confirmed', $2, false, NOW())`,
      [
        lockedPayment.user_id,
        `Your ₦${REGISTRATION_DEPOSIT_NGN.toLocaleString()} registration deposit has been confirmed.`,
      ],
    );
    await client.query(
      `UPDATE registration_deposit_payments
          SET status = 'success', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [lockedPayment.id],
    );
  });

  return true;
}

export async function flagRejectedRegistrationDepositTransfer(
  value: unknown,
): Promise<boolean> {
  const event = record(value);
  const reference = typeof event?.reference === "string" ? event.reference : "";
  if (!reference) return false;
  const { rows } = await query<{ id: string }>(
    `UPDATE registration_deposit_payments
        SET status = 'review', updated_at = NOW()
      WHERE reference = $1 AND status IN ('initializing', 'pending')
      RETURNING id`,
    [reference],
  );
  if (rows.length > 0) {
    logWarn("registration_paystack_transfer_rejected", { reference });
  }
  return rows.length > 0;
}

export type RegistrationDepositTransferDetails = {
  reference: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  transactionReference: string;
  expiresAt: string;
  status: string;
};

export function readRegistrationDepositTransferDetails(
  value: unknown,
): RegistrationDepositTransferDetails | null {
  const row = record(value);
  if (
    typeof row?.reference !== "string" ||
    typeof row.account_name !== "string" ||
    typeof row.account_number !== "string" ||
    typeof row.bank_name !== "string" ||
    typeof row.transaction_reference !== "string" ||
    typeof row.expires_at !== "string" ||
    typeof row.status !== "string"
  ) {
    return null;
  }
  return {
    reference: row.reference,
    accountName: row.account_name,
    accountNumber: row.account_number,
    bankName: row.bank_name,
    transactionReference: row.transaction_reference,
    expiresAt: row.expires_at,
    status: row.status,
  };
}
