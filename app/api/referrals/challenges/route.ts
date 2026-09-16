import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;

    // Get current week's challenge using database function
    const { rows: challengeRows } = await auth.db.query<{
      active: boolean;
      target: number;
      current: number;
      reward: number;
      completed: boolean;
      week_end: string;
    }>(
      `SELECT (public.me2u_get_current_week_challenge($1)::jsonb)::json as challenge`,
      [userId],
    );

    const challengeData = challengeRows[0]?.challenge || {
      active: false,
      target: 3,
      current: 0,
      reward: 4500,
      completed: false,
    };

    // Get all past challenges
    const { rows: historyRows } = await auth.db.query<{
      id: string;
      challenge_type: string;
      target_count: number;
      current_count: number;
      reward_amount: number;
      week_start: string;
      week_end: string;
      completed: boolean;
      completed_at: string | null;
      reward_paid: boolean;
    }>(
      `SELECT 
         id,
         challenge_type,
         target_count,
         current_count,
         reward_amount,
         week_start,
         week_end,
         completed,
         completed_at,
         reward_paid
       FROM referral_challenges
       WHERE user_id = $1
       ORDER BY week_start DESC
       LIMIT 10`,
      [userId],
    );

    // Calculate stats
    const totalChallengesCompleted = historyRows.filter((h) => h.completed).length;
    const totalRewardsEarned = historyRows
      .filter((h) => h.reward_paid)
      .reduce((sum, h) => sum + Number(h.reward_amount), 0);

    return NextResponse.json({
      current: challengeData,
      history: historyRows,
      stats: {
        totalChallengesCompleted,
        totalRewardsEarned,
        currentStreak: calculateStreak(historyRows),
      },
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch referral challenges.");
  }
}

// Calculate consecutive weeks of completed challenges
function calculateStreak(
  history: Array<{ completed: boolean; week_start: string }>,
): number {
  if (history.length === 0) return 0;

  let streak = 0;
  const sorted = [...history].sort(
    (a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime(),
  );

  for (const challenge of sorted) {
    if (challenge.completed) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
