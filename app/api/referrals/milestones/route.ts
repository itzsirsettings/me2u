import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

interface Milestone {
  type: string;
  referralCount: number;
  rewardAmount: number;
  badgeAwarded: string | null;
  achieved: boolean;
  achievedAt: string | null;
  rewardPaid: boolean;
  progress: number;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;

    // Get user's verified referral count
    const { rows: profileRows } = await auth.db.query<{
      verified_referral_count: number;
    }>(
      `SELECT verified_referral_count FROM profiles WHERE id = $1`,
      [userId],
    );

    const verifiedCount = profileRows[0]?.verified_referral_count || 0;

    // Get achieved milestones
    const { rows: achievedRows } = await auth.db.query<{
      milestone_type: string;
      referral_count: number;
      reward_amount: number;
      badge_awarded: string | null;
      achieved_at: string;
      reward_paid: boolean;
    }>(
      `SELECT 
         milestone_type,
         referral_count,
         reward_amount,
         badge_awarded,
         achieved_at,
         reward_paid
       FROM referral_milestones
       WHERE user_id = $1
       ORDER BY referral_count ASC`,
      [userId],
    );

    // Define all milestone tiers
    const allMilestones: Array<{
      type: string;
      count: number;
      reward: number;
      badge: string;
      description: string;
    }> = [
      {
        type: "10_refs",
        count: 10,
        reward: 10000,
        badge: "Network Builder Gold",
        description: "Refer 10 verified active users",
      },
      {
        type: "25_refs",
        count: 25,
        reward: 25000,
        badge: "Network Builder Platinum",
        description: "Refer 25 verified active users",
      },
      {
        type: "50_refs",
        count: 50,
        reward: 50000,
        badge: "Network Builder Diamond",
        description: "Refer 50 verified active users",
      },
      {
        type: "100_refs",
        count: 100,
        reward: 100000,
        badge: "Network Builder Legend",
        description: "Refer 100 verified active users",
      },
    ];

    // Build response with progress
    const milestones: Milestone[] = allMilestones.map((milestone) => {
      const achieved = achievedRows.find((a) => a.milestone_type === milestone.type);
      const progress = Math.min((verifiedCount / milestone.count) * 100, 100);

      return {
        type: milestone.type,
        referralCount: milestone.count,
        rewardAmount: milestone.reward,
        badgeAwarded: milestone.badge,
        achieved: !!achieved,
        achievedAt: achieved?.achieved_at || null,
        rewardPaid: achieved?.reward_paid || false,
        progress: Math.round(progress),
      };
    });

    // Calculate next milestone
    const nextMilestone = milestones.find((m) => !m.achieved);
    const totalRewardsEarned = achievedRows
      .filter((a) => a.reward_paid)
      .reduce((sum, a) => sum + Number(a.reward_amount), 0);

    return NextResponse.json({
      currentVerifiedCount: verifiedCount,
      milestones,
      nextMilestone: nextMilestone
        ? {
            type: nextMilestone.type,
            referralsNeeded: nextMilestone.referralCount - verifiedCount,
            rewardAmount: nextMilestone.rewardAmount,
            badge: nextMilestone.badgeAwarded,
            progress: nextMilestone.progress,
          }
        : null,
      stats: {
        totalMilestonesAchieved: achievedRows.length,
        totalRewardsEarned,
      },
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch referral milestones.");
  }
}
