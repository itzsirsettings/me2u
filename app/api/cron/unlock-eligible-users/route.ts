import { NextResponse } from "next/server";
import * as db from "@/lib/railway/client";

/**
 * Cron job to auto-unlock users who have reached their 15-day eligibility
 * 
 * Schedule: Run every hour
 * Vercel Cron: Add to vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/unlock-eligible-users",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.AUTH_TOKEN_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
       LIMIT 100`
    );

    if (eligibleUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users eligible for unlock at this time.",
        unlocked_count: 0,
      });
    }

    // Unlock each user
    let unlockedCount = 0;
    let errors: Array<{ user_id: string; error: string }> = [];

    for (const user of eligibleUsers) {
      try {
        await db.query("BEGIN");

        // Unlock account
        await db.query(
          `UPDATE profiles
           SET account_unlocked = true,
               unlock_method = 'time_based',
               account_unlock_paid_at = NOW()
           WHERE id = $1`,
          [user.user_id]
        );

        // Send notification
        await db.query(
          `INSERT INTO notifications (user_id, title, message, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [
            user.user_id,
            "🎉 Account Unlocked!",
            "Your 15-day waiting period is complete! You can now withdraw funds anytime."
          ]
        );

        // Log event
        await db.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'deposit', 0, 'Account automatically unlocked after 15-day waiting period', NOW())`,
          [user.user_id]
        );

        await db.query("COMMIT");
        unlockedCount++;

        console.log(`✅ Unlocked account for user ${user.user_id} (${user.email})`);
      } catch (error) {
        await db.query("ROLLBACK");
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({ user_id: user.user_id, error: errorMsg });
        console.error(`❌ Failed to unlock user ${user.user_id}:`, errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-unlocked ${unlockedCount} user(s)`,
      unlocked_count: unlockedCount,
      eligible_found: eligibleUsers.length,
      errors: errors.length > 0 ? errors : undefined,
      users_unlocked: eligibleUsers.slice(0, unlockedCount).map(u => ({
        user_id: u.user_id,
        email: u.email,
        name: u.first_name,
        unlock_eligible_at: u.unlock_eligible_at,
      })),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run unlock cron job",
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
