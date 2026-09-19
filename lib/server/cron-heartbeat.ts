import { query } from "@/lib/railway/client";
import { logWarn } from "@/lib/server/logger";

/**
 * Non-blocking cron heartbeat helpers backed by the `cron_runs` table
 * (see migrations/migrations/20260919100000_g4_fee_transparency.sql).
 *
 * Heartbeat failures must NEVER break the cron itself — every write is
 * best-effort with swallowed (but logged) errors. Keep this an appendage,
 * not a blocker.
 */

export async function markCronStarted(jobName: string): Promise<void> {
  try {
    await query(
      `INSERT INTO cron_runs (job_name, last_started_at, last_status, last_error, total_runs)
       VALUES ($1, NOW(), 'running', NULL, 1)
       ON CONFLICT (job_name) DO UPDATE
         SET last_started_at = NOW(),
             last_status = 'running',
             last_error = NULL,
             total_runs = cron_runs.total_runs + 1,
             updated_at = NOW()`,
      [jobName],
    );
  } catch (error) {
    logWarn("cron_heartbeat_start_failed", { jobName, error: String(error) });
  }
}

export async function markCronFinished(
  jobName: string,
  status: "success" | "failed",
  runCount: number,
  error?: string | null,
): Promise<void> {
  try {
    await query(
      `UPDATE cron_runs
       SET last_finished_at = NOW(),
           last_status = $2,
           last_run_count = $3,
           last_error = $4,
           total_failures = total_failures + $5,
           updated_at = NOW()
       WHERE job_name = $1`,
      [
        jobName,
        status,
        Math.max(0, Math.round(runCount)),
        error ?? null,
        status === "failed" ? 1 : 0,
      ],
    );
  } catch (heartbeatError) {
    logWarn("cron_heartbeat_finish_failed", { jobName, error: String(heartbeatError) });
  }
}
