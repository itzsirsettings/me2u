import { query } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlatformStats = {
  totalBorrowed: number;
  totalRepaid: number;
  activeCircles: number;
  totalUsers: number;
  successfulLoans: number;
  totalLent: number;
  activeLoans: number;
  trustScoreAvg: number;
};

export async function GET() {
  try {
    // Fetch all platform stats from database
    const { rows: stats } = await query<{ stat_key: string; stat_value: string }>(
      `SELECT stat_key, stat_value FROM platform_stats`
    );

    // Convert array to object
    const statsMap = stats.reduce((acc, { stat_key, stat_value }) => {
      acc[stat_key] = Number(stat_value);
      return acc;
    }, {} as Record<string, number>);

    const result: PlatformStats = {
      totalBorrowed: statsMap.total_borrowed || 0,
      totalRepaid: statsMap.total_repaid || 0,
      activeCircles: statsMap.active_circles || 0,
      totalUsers: statsMap.total_users || 0,
      successfulLoans: statsMap.successful_loans || 0,
      totalLent: statsMap.total_lent || 0,
      activeLoans: statsMap.active_loans || 0,
      trustScoreAvg: statsMap.trust_score_avg || 85,
    };

    return NextResponse.json(
      { ok: true, stats: result },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error) {
    logApiError("platform-stats", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
