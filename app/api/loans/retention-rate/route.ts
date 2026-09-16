import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getTrustTier, getNextTierInfo } from "@/lib/loans";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query<{ trust_score: number }>(
      `SELECT trust_score FROM profiles WHERE id = $1`,
      [auth.user.id],
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const trustScore = rows[0].trust_score ?? 50;
    const tier = getTrustTier(trustScore);
    const nextTier = getNextTierInfo(trustScore);

    return NextResponse.json({
      trustScore,
      tierLabel: tier.label,
      depositRate: tier.rate,
      maxDuration: tier.maxDays,
      nextTier: nextTier
        ? { label: nextTier.label, minScore: nextTier.minScore, rate: nextTier.rate, maxDays: nextTier.maxDays }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tier info." },
      { status: 500 },
    );
  }
}
