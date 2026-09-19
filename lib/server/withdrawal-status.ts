/**
 * Canonical withdrawal status vocabulary — single source of truth.
 *
 * These are exactly the values of the Postgres enum
 * `public.withdrawal_request_status` (see railway/migrations/002_complete_schema.sql
 * plus the `cancelled` addition in migrations/20260918000002_financial_unique_invariants.sql):
 *
 *   pending | approved | rejected | processing | success | failed | reversed | cancelled
 *
 * Any other literal in a query touching `withdrawal_requests.status` makes
 * Postgres raise SQLSTATE 22P02 ("invalid input value for enum"), which is how
 * the Paystack transfer webhooks used to fail on every delivery (`'initiated'`
 * and `'successful'` are NOT enum members). Never inline these literals again.
 */
export const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "processing",
  "success",
  "failed",
  "reversed",
  "cancelled",
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

/** Status written when a withdrawal is queued for the payout provider. */
export const WITHDRAWAL_QUEUED_STATUS = "pending" satisfies WithdrawalStatus;

/** Terminal status written when the provider confirms the payout. */
export const WITHDRAWAL_SUCCESS_STATUS = "success" satisfies WithdrawalStatus;

/** Terminal status written when the payout could not be completed. */
export const WITHDRAWAL_FAILED_STATUS = "failed" satisfies WithdrawalStatus;

/**
 * Deterministic Paystack transfer reference for a withdrawal request.
 *
 * Paystack echoes this value back on every transfer webhook, and it is
 * persisted before the transfer is created — so if the process dies between
 * the API call and the bookkeeping UPDATE, the reconciliation cron can still
 * ask Paystack what happened instead of blindly refunding a transfer that was
 * really sent. Shared (not duplicated) so the withdraw route and the
 * reconcile helper can never drift apart.
 */
export function withdrawalTransferReference(requestId: string): string {
  return `me2u-wdr-${requestId}`;
}

/**
 * Money has left the user's wallet but no terminal outcome is known yet.
 * `processing` is retained for rows written by older app versions; new writes
 * always queue as `pending` so the partial UNIQUE index
 * `idx_withdrawal_requests_one_pending_per_user` and the admin approval queue
 * both apply.
 */
export const WITHDRAWAL_IN_FLIGHT_STATUSES = ["pending", "processing"] as const;

/**
 * Ready-to-interpolate SQL list of in-flight statuses (e.g.
 * `AND status IN (${WITHDRAWAL_IN_FLIGHT_SQL})`). Values come from the frozen
 * tuple above, never from request input.
 */
export const WITHDRAWAL_IN_FLIGHT_SQL = WITHDRAWAL_IN_FLIGHT_STATUSES.map(
  (status) => `'${status}'`,
).join(", ");
