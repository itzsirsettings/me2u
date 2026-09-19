/**
 * Withdrawal reconciliation helpers (shared by the cron route + tests).
 * Safety: NEVER refund unless Paystack positively reports failure/404.
 * Transport errors and unknown states leave the row for the next sweep.
 */
import { query, withTransaction } from "@/lib/railway/client";
import { logApiError } from "@/lib/server/logger";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";
import {
  WITHDRAWAL_FAILED_STATUS,
  WITHDRAWAL_IN_FLIGHT_SQL,
  WITHDRAWAL_SUCCESS_STATUS,
} from "@/lib/server/withdrawal-status";

export const RECONCILE_BATCH_LIMIT = Math.max(
  1,
  Number(process.env.WITHDRAWAL_RECONCILE_BATCH_LIMIT ?? 50) || 50,
);
export const RECONCILE_AFTER_MINUTES = Math.max(
  1,
  Number(process.env.WITHDRAWAL_RECONCILE_AFTER_MINUTES ?? 15) || 15,
);

export type InFlightWithdrawal = {
  id: string;
  user_id: string;
  amount: string | number;
  fee_amount: string | number;
  fee: string | number;
  status: string;
  paystack_transfer_code: string | null;
  paystack_reference: string | null;
  created_at: string;
};

export function withdrawalTransferReference(requestId: string): string {
  return `me2u-wdr-${requestId}`;
}

export type VerifyOutcome =
  | { kind: "success" }
  | { kind: "failed"; detail: string }
  | { kind: "pending" }
  | { kind: "unknown"; detail: string };

export function classifyPaystackStatus(raw: unknown): VerifyOutcome {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return {
      kind: "unknown",
      detail: "unrecognised paystack status: (empty)",
    };
  }
  const status = String(raw).toLowerCase();
  if (status === "success") return { kind: "success" };
  if (status === "failed" || status === "reversed" || status === "abandoned") {
    return { kind: "failed", detail: `paystack status: ${status}` };
  }
  if (status === "pending" || status === "processing" || status === "otp" || status === "") {
    return { kind: "pending" };
  }
  return { kind: "unknown", detail: `unrecognised paystack status: ${status}` };
}

type PaystackVerifyBody = {
  status?: unknown;
  message?: unknown;
  data?: { status?: unknown } | null;
};

export async function verifyTransferWithPaystack(
  reference: string,
  secret: string = process.env.PAYSTACK_SECRET_KEY || "",
): Promise<VerifyOutcome> {
  if (!secret) return { kind: "unknown", detail: "PAYSTACK_SECRET_KEY not configured" };
  let res: Response;
  try {
    res = await fetch(
      `https://api.paystack.co/transfer/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { kind: "unknown", detail: `verify request failed: ${msg}` };
  }
  let data: PaystackVerifyBody | null = null;
  try {
    data = (await res.json()) as PaystackVerifyBody;
  } catch {
    return { kind: "unknown", detail: `verify returned HTTP ${res.status} (unparseable body)` };
  }
  if (res.status === 404) {
    return { kind: "failed", detail: "transfer reference not found on Paystack" };
  }
  if (!res.ok || data?.status !== true) {
    const message =
      typeof data?.message === "string" ? data.message : `verify returned HTTP ${res.status}`;
    return {
      kind: "unknown",
      detail: message,
    };
  }
  return classifyPaystackStatus(data?.data?.status);
}

export async function markWithdrawalSuccess(
  withdrawalId: string,
  reference: string,
): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `UPDATE withdrawal_requests
        SET status = '${WITHDRAWAL_SUCCESS_STATUS}',
            paystack_reference = COALESCE($1, paystack_reference),
            updated_at = NOW()
      WHERE id = $2
        AND status IN (${WITHDRAWAL_IN_FLIGHT_SQL})
      RETURNING id`,
    [reference, withdrawalId],
  );
  return rows.length > 0;
}

export async function refundWithdrawal(
  withdrawal: InFlightWithdrawal,
  reason: string,
): Promise<boolean> {
  const amount = Number(withdrawal.amount ?? 0);
  const feeAmount = Number(withdrawal.fee_amount ?? withdrawal.fee ?? 0);
  const refundTotal = Math.round((amount + feeAmount) * 100) / 100;
  let refunded = false;
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `UPDATE withdrawal_requests
          SET status = '${WITHDRAWAL_FAILED_STATUS}',
              admin_note = $1,
              updated_at = NOW()
        WHERE id = $2
          AND status IN (${WITHDRAWAL_IN_FLIGHT_SQL})
        RETURNING id`,
      [`Reconciled as failed: ${reason}`, withdrawal.id],
    );
    if (rows.length === 0) return;
    await recordWalletMove(client, {
      userId: withdrawal.user_id,
      txType: "reversal",
      source: "withdrawal",
      reference: buildLedgerRef("wdr-rev", withdrawal.id),
      description: `Withdrawal reversal (reconciled): ${reason}`,
      balanceDelta: refundTotal,
      sourceDetail: withdrawal.id,
      metadata: { reason: "reconcile_failed", detail: reason },
    });
    refunded = true;
  });
  return refunded;
}

export function resolveWithdrawalReference(withdrawal: InFlightWithdrawal): string {
  const stored =
    withdrawal.paystack_reference?.trim() || withdrawal.paystack_transfer_code?.trim() || "";
  if (stored) return stored;
  return withdrawalTransferReference(withdrawal.id);
}

export async function reconcileOneWithdrawal(
  withdrawal: InFlightWithdrawal,
): Promise<"reconciled" | "pending" | "skipped"> {
  const reference = resolveWithdrawalReference(withdrawal);
  const outcome = await verifyTransferWithPaystack(reference);
  if (outcome.kind === "success") {
    const claimed = await markWithdrawalSuccess(withdrawal.id, reference);
    return claimed ? "reconciled" : "skipped";
  }
  if (outcome.kind === "failed") {
    const claimed = await refundWithdrawal(withdrawal, outcome.detail);
    return claimed ? "reconciled" : "skipped";
  }
  if (outcome.kind === "pending") return "pending";
  logApiError("withdrawal-reconcile:verify-unknown", {
    withdrawalId: withdrawal.id,
    reference,
    detail: outcome.detail,
  });
  return "skipped";
}
