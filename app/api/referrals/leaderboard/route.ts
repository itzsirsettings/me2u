import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "current"; // 'current' or 'previous'
    if (period !== "current" && period !== "previous") {
      return NextResponse.json({ error: "Invalid leaderboard period." }, { status: 400 });
    }

    // Calculate month boundaries
    const now = new Date();
    let monthStart: Date;
    let monthEnd: Date;

    if (period === "previous") {
      monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    } else {
      monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    }

    // Get current month's live leaderboard (not finalized)
    if (period === "current") {
      const { rows: liveRows } = await auth.db.query<{
        user_id: string;
        username: string;
        referral_count: number;
        verified_referral_count: number;
        rank: number;
        is_current_user: boolean;
      }>(
        `WITH ranked_users AS (
           SELECT 
             r.referrer_id,
             p.username,
             COUNT(*) as referral_count,
             COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded = true) as verified_referral_count,
             ROW_NUMBER() OVER (
               ORDER BY COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded = true) DESC, r.referrer_id
             ) as rank
           FROM referrals r
           JOIN profiles p ON p.id = r.referrer_id
           WHERE r.created_at >= $1 AND r.created_at < $2
           GROUP BY r.referrer_id, p.username
           HAVING COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded = true) > 0
         )
         SELECT 
           referrer_id as user_id,
           username,
           referral_count::int,
           verified_referral_count::int,
           rank::int,
           (referrer_id = $3) as is_current_user
         FROM ranked_users
         WHERE rank <= 50
         ORDER BY rank ASC`,
        [monthStart.toISOString(), monthEnd.toISOString(), userId],
      );

      // Find current user's position if not in top 50
      let userPosition = liveRows.find((row) => row.is_current_user);

      if (!userPosition) {
        const { rows: userRows } = await auth.db.query<{
          user_id: string;
          username: string;
          referral_count: number;
          verified_referral_count: number;
          rank: number;
        }>(
          `WITH ranked_users AS (
             SELECT 
               r.referrer_id,
               p.username,
               COUNT(*) as referral_count,
               COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded = true) as verified_referral_count,
               ROW_NUMBER() OVER (
                 ORDER BY COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded = true) DESC, r.referrer_id
               ) as rank
             FROM referrals r
             JOIN profiles p ON p.id = r.referrer_id
             WHERE r.created_at >= $1 AND r.created_at < $2
             GROUP BY r.referrer_id, p.username
             HAVING COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded = true) > 0
           )
           SELECT 
             referrer_id as user_id,
             username,
             referral_count::int,
             verified_referral_count::int,
             rank::int
           FROM ranked_users
           WHERE referrer_id = $3`,
          [monthStart.toISOString(), monthEnd.toISOString(), userId],
        );

        userPosition = userRows[0] ? { ...userRows[0], is_current_user: true } : undefined;
      }

      // Prize structure for top 10
      const prizeStructure = [50000, 30000, 20000, 15000, 10000, 5000, 5000, 5000, 5000, 5000];

      const leaderboardWithPrizes = liveRows.map((row) => ({
        ...row,
        prizeAmount: row.rank <= 10 ? prizeStructure[row.rank - 1] : null,
      }));

      return NextResponse.json({
        period: "current",
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        leaderboard: leaderboardWithPrizes,
        userPosition: userPosition
          ? {
              ...userPosition,
              prizeAmount:
                userPosition.rank <= 10 ? prizeStructure[userPosition.rank - 1] : null,
            }
          : null,
        prizeStructure: prizeStructure.map((prize, index) => ({
          rank: index + 1,
          amount: prize,
        })),
      });
    }

    // Get previous month's finalized leaderboard
    const { rows: finalizedRows } = await auth.db.query<{
      user_id: string;
      username: string | null;
      referral_count: number;
      verified_referral_count: number;
      rank: number;
      prize_amount: number | null;
      prize_paid: boolean;
      is_current_user: boolean;
    }>(
      `SELECT 
         rl.user_id,
         p.username,
         rl.referral_count,
         rl.verified_referral_count,
         rl.rank,
         rl.prize_amount,
         rl.prize_paid,
         (rl.user_id = $2) as is_current_user
       FROM referral_leaderboard rl
       JOIN profiles p ON p.id = rl.user_id
       WHERE rl.month_start = $1::date
       ORDER BY rl.rank ASC
       LIMIT 50`,
      [monthStart.toISOString().split("T")[0], userId],
    );

    const userPosition = finalizedRows.find((row) => row.is_current_user);

    return NextResponse.json({
      period: "previous",
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      leaderboard: finalizedRows,
      userPosition: userPosition || null,
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch referral leaderboard.");
  }
}
