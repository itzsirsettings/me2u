import { queryAsUser } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CircleReward = {
  id: string;
  rewardType: string;
  rewardPerMember: number;
  totalAmount: number;
  disbursed: boolean;
  earnedAt: string;
  disbursedAt?: string;
};

export async function GET(
  request: Request,
  { params }: { params: { circleId: string } }
) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { circleId } = params;

    // Verify user is a member of this circle
    const { rows: membership } = await queryAsUser<{ circle_id: string }>(
      auth.user.id,
      `SELECT circle_id FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
      [circleId, auth.user.id]
    );

    if (membership.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Not a member of this circle" },
        { status: 403 }
      );
    }

    // Fetch circle rewards
    const { rows: rewards } = await queryAsUser<{
      id: string;
      reward_type: string;
      reward_per_member: string;
      total_amount: string;
      disbursed: boolean;
      earned_at: string;
      disbursed_at: string | null;
    }>(
      auth.user.id,
      `SELECT * FROM circle_rewards WHERE circle_id = $1 ORDER BY earned_at DESC`,
      [circleId]
    );

    const rewardsList: CircleReward[] = rewards.map((r) => ({
      id: r.id,
      rewardType: r.reward_type,
      rewardPerMember: Number(r.reward_per_member),
      totalAmount: Number(r.total_amount),
      disbursed: r.disbursed,
      earnedAt: r.earned_at,
      disbursedAt: r.disbursed_at || undefined,
    }));

    const totalEarned = rewardsList.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalDisbursed = rewardsList
      .filter((r) => r.disbursed)
      .reduce((sum, r) => sum + r.totalAmount, 0);
    const pendingRewards = totalEarned - totalDisbursed;

    return NextResponse.json({
      ok: true,
      rewards: rewardsList,
      totalEarned,
      totalDisbursed,
      pendingRewards,
    });
  } catch (error) {
    logApiError("circle-rewards", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
