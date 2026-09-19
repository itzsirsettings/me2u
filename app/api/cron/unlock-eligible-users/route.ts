import { NextResponse } from "next/server";
import * as db from "@/lib/railway/client";
import { markCronFinished, markCronStarted } from "@/lib/server/cron-heartbeat";

/**
 * Cron job to auto-unlock users who have reached their 15-day eligibility
 *
 * Schedule: Run every hour
 * Vercel Cron: declared in vercel.json ("0 * * * *")
 * Railway: Dashboard → Project → Settings → Cron Jobs →
 *   GET /api/cron/unlock-eligible-users with header `Authorization: Bearer $CRON_SECRET`
 *
 * Heartbeat: each run upserts into `cron_runs` (job_name = 'unlock-eligible-users')
 * so operators can detect silent cron failures. Heartbeat writes are
 * best-effort and never block or fail the cron itself.
 */

const CRON_JOB_NAME = "unlock-eligible-users";

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.AUTH_TOKEN_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markCronStarted(CRON_JOB_NAME);

    // Find users eligible for time-based unlock
    const { rows: eligibleUsers } = await db.query<{
      user_id: string;
      email: string;
      first_name: string;
      unlock_eligible_at: string;
      payment_date: string;
    }>(
      `SELECT
         p.id as user_id,
         p.email,
         p.first_name,
         p.unlock_eligible_at,
         aup.created_at as payment_date
       FROM profiles p
       JOIN account_unlock_payments aup ON aup.user_id = p.id
       WHERE p.account_unlocked = false
         AND p.unlock_eligible_at IS NOT NULL
         AND p.unlock_eligible_at <= NOW()
         AND aup.status = 'success'
         AND aup.amount >= 2000
       ORDER BY p.unlock_eligible_at ASC
       LIMIT 100`,
    );

    if (eligibleUsers.length === 0) {
      await markCronFinished(CRON_JOB_NAME, "success", 0, null);
      return NextResponse.json({
        success: true,
        message: "No users eligible for unlock at this time.",
        unlocked_count: 0,
      });
    }

    // Unlock each user. Each iteration runs in its own transaction via the
    // project-standard withTransaction helper (commit/rollback handled by
    // the pool client wrapper) so one failing user cannot poison the batch.
    let unlockedCount = 0;
    let errors: Array<{ user_id: string; error: string }> = [];

    for (const user of eligibleUsers) {
      try {
        await db.withTransaction(async (client) => {
          // Unlock account
          await client.query(
            `UPDATE profiles
             SET account_unlocked = true,
                 unlock_method = 'time_based',
                 account_unlock_paid_at = NOW()
             WHERE id = $1`,
            [user.user_id],
          );

          // Send notification
          await client.query(
            `INSERT INTO notifications (user_id, title, message, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [
              user.user_id,
              "🎉 Account Unlocked!",
              "Your 15-day waiting period is complete! You can now withdraw funds anytime.",
            ],
          );

          // Log event
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, description, created_at)
             VALUES ($1, 'deposit', 0, 'Account automatically unlocked after 15-day waiting period', NOW())`,
            [user.user_id],
          );
        });
        unlockedCount++;

        console.log(`✅ Unlocked account for user ${user.user_id} (${user.email})`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({ user_id: user.user_id, error: errorMsg });
        console.error(`❌ Failed to unlock user ${user.user_id}:`, errorMsg);
      }
    }

    await markCronFinished(
      CRON_JOB_NAME,
      errors.length === 0 ? "success" : "failed",
      unlockedCount,
      errors.length > 0 ? `${errors.length} user(s) failed: ${errors[0].error}` : null,
    );

    return NextResponse.json({
      success: true,
      message: `Auto-unlocked ${unlockedCount} user(s)`,
      unlocked_count: unlockedCount,
      eligible_found: eligibleUsers.length,
      errors: errors.length > 0 ? errors : undefined,
      users_unlocked: eligibleUsers.slice(0, unlockedCount).map((u) => ({
        user_id: u.user_id,
        email: u.email,
        name: u.first_name,
        unlock_eligible_at: u.unlock_eligible_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run unlock cron job";
    await markCronFinished(CRON_JOB_NAME, "failed", 0, message);
    console.error("Cron job error:", error);
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
