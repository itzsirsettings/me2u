import { queryAsUser } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TrustMilestone = {
  milestoneScore: number;
  reachedAt: string;
  celebrated: boolean;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Fetch user's profile for current trust score
    const { rows: profileRows } = await queryAsUser<{
      trust_score: number;
      first_name: string;
    }>(
      auth.user.id,
      `SELECT trust_score, first_name FROM profiles WHERE id = $1`,
      [auth.user.id]
    );

    const profile = profileRows[0];
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Fetch user's trust milestones
    const { rows: milestones } = await queryAsUser<{
      milestone_score: number;
      reached_at: string;
      celebrated: boolean;
    }>(
      auth.user.id,
      `SELECT milestone_score, reached_at, celebrated 
       FROM trust_milestones 
       WHERE user_id = $1 
       ORDER BY milestone_score DESC`,
      [auth.user.id]
    );

    const allMilestones = [50, 60, 70, 80, 85, 90, 95, 100];
    const reachedMilestones = new Set(milestones.map((m) => m.milestone_score));

    const nextMilestone =
      allMilestones.find((m) => m > profile.trust_score) || 100;
    const currentMilestone =
      [...allMilestones].reverse().find((m) => m <= profile.trust_score) || 0;

    return NextResponse.json({
      ok: true,
      currentScore: profile.trust_score,
      currentMilestone,
      nextMilestone,
      milestones: milestones.map((m) => ({
        milestoneScore: m.milestone_score,
        reachedAt: m.reached_at,
        celebrated: m.celebrated,
      })),
      allMilestones: allMilestones.map((score) => ({
        score,
        reached: reachedMilestones.has(score),
        isCurrent: score === nextMilestone,
      })),
      firstName: profile.first_name,
    });
  } catch (error) {
    logApiError("trust-milestones", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
