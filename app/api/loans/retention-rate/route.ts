import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getTrustTier, getNextTierInfo, getSecurityDeposit, getMaxLoanDuration } from "@/lib/loans";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { data: profile, error } = await auth.supabase
      .from("profiles")
      .select("trust_score")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const trustScore = profile.trust_score ?? 50;
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
      { error: error instanceof Error ? error.message : "Failed to fetch retention rate." },
      { status: 500 },
    );
  }
}
