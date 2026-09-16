import { query, queryAsUser } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CircleLeaderboard = {
  id: string;
  name: string;
  memberCount: number;
  totalVolume: number;
  onTimeRepaymentRate: number;
  performanceScore: number;
  totalLoansIssued: number;
  totalLoansRepaid: number;
  rank: number;
  isUserMember?: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Fetch circles with performance data
    const { rows: circles } = await queryAsUser<{
      id: string;
      name: string;
      total_loans_issued: number;
      total_loans_repaid: number;
      on_time_repayment_rate: string;
      total_volume: string;
      member_count: number;
      performance_score: number;
    }>(
      auth.user.id,
      `SELECT 
        c.id,
        c.name,
        COALESCE(cp.total_loans_issued, 0) as total_loans_issued,
        COALESCE(cp.total_loans_repaid, 0) as total_loans_repaid,
        COALESCE(cp.on_time_repayment_rate, 100) as on_time_repayment_rate,
        COALESCE(cp.total_volume, 0) as total_volume,
        COALESCE(cp.member_count, 0) as member_count,
        COALESCE(cp.performance_score, 0) as performance_score
       FROM circles c
       LEFT JOIN circle_performance cp ON cp.circle_id = c.id
       ORDER BY cp.performance_score DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );

    // Transform and sort by performance score
    const leaderboard: CircleLeaderboard[] = circles
      .map((circle, index) => ({
        id: circle.id,
        name: circle.name,
        memberCount: circle.member_count || 0,
        totalVolume: Number(circle.total_volume || 0),
        onTimeRepaymentRate: Number(circle.on_time_repayment_rate || 100),
        performanceScore: circle.performance_score || 0,
        totalLoansIssued: circle.total_loans_issued || 0,
        totalLoansRepaid: circle.total_loans_repaid || 0,
        rank: index + 1,
      }))
      .slice(0, limit);

    // Check if user is in any of these circles
    const circleIds = leaderboard.map((c) => c.id);
    if (circleIds.length > 0) {
      const placeholders = circleIds.map((_, i) => `$${i + 2}`).join(",");
      const { rows: userCircles } = await queryAsUser<{ circle_id: string }>(
        auth.user.id,
        `SELECT circle_id FROM circle_members WHERE user_id = $1 AND circle_id IN (${placeholders})`,
        [auth.user.id, ...circleIds]
      );

      const userCircleIds = new Set(userCircles.map((uc) => uc.circle_id));

      leaderboard.forEach((circle) => {
        circle.isUserMember = userCircleIds.has(circle.id);
      });
    }

    return NextResponse.json({
      ok: true,
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    logApiError("circle-leaderboard", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
