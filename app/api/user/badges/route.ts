import { queryAsUser } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Badge = {
  id: string;
  badgeType: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  rewardAmount: number;
  earnedAt?: string;
  earned: boolean;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Fetch all available badges
    const { rows: allBadges } = await queryAsUser<{
      id: string;
      badge_type: string;
      name: string;
      description: string;
      category: string;
      icon: string;
      rarity: string;
      reward_amount: string;
    }>(
      auth.user.id,
      `SELECT * FROM badges ORDER BY category, name`
    );

    // Fetch user's earned badges
    const { rows: earnedBadges } = await queryAsUser<{
      badge_type: string;
      earned_at: string;
    }>(
      auth.user.id,
      `SELECT badge_type, earned_at FROM user_badges WHERE user_id = $1`,
      [auth.user.id]
    );

    const earnedMap = new Map(
      earnedBadges.map((eb) => [eb.badge_type, eb.earned_at])
    );

    const badges: Badge[] = allBadges.map((badge) => ({
      id: badge.id,
      badgeType: badge.badge_type,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      icon: badge.icon,
      rarity: badge.rarity,
      rewardAmount: Number(badge.reward_amount),
      earned: earnedMap.has(badge.badge_type),
      earnedAt: earnedMap.get(badge.badge_type),
    }));

    const earnedCount = badges.filter((b) => b.earned).length;
    const totalCount = badges.length;

    return NextResponse.json({
      ok: true,
      badges,
      earnedCount,
      totalCount,
      progress: totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    logApiError("user-badges", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
