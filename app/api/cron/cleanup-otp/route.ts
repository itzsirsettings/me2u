import { NextResponse } from "next/server";
import { cleanupExpiredOtps } from "@/lib/server/in-app-otp";
import { markCronFinished, markCronStarted } from "@/lib/server/cron-heartbeat";

/**
 * Cron job to cleanup expired OTP codes
 * Schedule: Run daily
 * Vercel Cron: declared in vercel.json ("0 2 * * *")
 * Railway: Dashboard → Project → Settings → Cron Jobs →
 *   GET /api/cron/cleanup-otp with header `Authorization: Bearer $CRON_SECRET`
 *
 * Heartbeat: each run upserts into `cron_runs` (job_name = 'cleanup-otp'),
 * best-effort only — never blocks or fails the cron itself.
 */
const CRON_JOB_NAME = "cleanup-otp";

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.AUTH_TOKEN_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markCronStarted(CRON_JOB_NAME);

    const deletedCount = await cleanupExpiredOtps();
    await markCronFinished(CRON_JOB_NAME, "success", deletedCount, null);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired OTP code(s)`,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cleanup OTP codes";
    await markCronFinished(CRON_JOB_NAME, "failed", 0, message);
    console.error("OTP cleanup cron job error:", error);
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

// Allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
