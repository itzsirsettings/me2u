import { NextResponse } from "next/server";

import { query } from "@/lib/railway/client";
import { markCronFinished, markCronStarted } from "@/lib/server/cron-heartbeat";
import { logApiError, logInfo } from "@/lib/server/logger";
import {
  reconcileOneWithdrawal,
  RECONCILE_AFTER_MINUTES,
  RECONCILE_BATCH_LIMIT,
  type InFlightWithdrawal,
} from "@/lib/server/withdrawal-reconcile";
import { WITHDRAWAL_IN_FLIGHT_SQL } from "@/lib/server/withdrawal-status";

export const dynamic = "force-dynamic";

const CRON_JOB_NAME = "reconcile-withdrawals";

/**
 * Withdrawal reconciliation cron.
 *
 * Closes the money-path crash window where funds are debited but the terminal
 * Paystack outcome is unknown (process died between transfer call and
 * bookkeeping UPDATE, or transfer webhooks never arrived). Each sweep asks
 * Paystack for the authoritative transfer state and replays the outcome
 * through the SAME terminal statements the webhooks use, so a webhook that
 * lands mid-sweep simply wins the conditional UPDATE and the loser becomes a
 * no-op instead of a double-spend.
 *
 * Schedule: every 15 minutes.
 * Vercel Cron: declared in vercel.json ("*\/15 * * * *").
 * Railway: Dashboard -> Project -> Settings -> Cron Jobs ->
 *   GET /api/cron/reconcile-withdrawals with header `Authorization: Bearer $CRON_SECRET`
 *
 * Heartbeat: each run upserts into `cron_runs`
 * (job_name = 'reconcile-withdrawals'), best-effort only.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.AUTH_TOKEN_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await markCronStarted(CRON_JOB_NAME);
  try {
    const { rows: inFlight } = await query<InFlightWithdrawal>(
      `SELECT id, user_id, amount, fee_amount, fee, status,
              paystack_transfer_code, paystack_reference, created_at
         FROM withdrawal_requests
        WHERE status IN (${WITHDRAWAL_IN_FLIGHT_SQL})
          AND created_at < NOW() - ($1 || ' minutes')::interval
        ORDER BY created_at ASC
        LIMIT $2`,
      [String(RECONCILE_AFTER_MINUTES), RECONCILE_BATCH_LIMIT],
    );
    let reconciled = 0;
    let stillPending = 0;
    let skipped = 0;
    const errors: Array<{ withdrawal_id: string; error: string }> = [];
    for (const withdrawal of inFlight) {
      try {
        const result = await reconcileOneWithdrawal(withdrawal);
        if (result === "reconciled") reconciled += 1;
        else if (result === "pending") stillPending += 1;
        else skipped += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ withdrawal_id: withdrawal.id, error: message });
        logApiError("withdrawal-reconcile:row-failed", {
          withdrawalId: withdrawal.id,
          error: message,
        });
      }
    }
    logInfo("withdrawal-reconcile:finished", {
      scanned: inFlight.length,
      reconciled,
      stillPending,
      skipped,
      errorCount: errors.length,
    });
    await markCronFinished(
      CRON_JOB_NAME,
      errors.length === 0 ? "success" : "failed",
      reconciled,
      errors.length > 0 ? `${errors.length} withdrawal(s) errored: ${errors[0].error}` : null,
    );
    return NextResponse.json({
      success: true,
      scanned: inFlight.length,
      reconciled,
      still_pending: stillPending,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reconcile withdrawals";
    await markCronFinished(CRON_JOB_NAME, "failed", 0, message);
    logApiError("withdrawal-reconcile:failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
