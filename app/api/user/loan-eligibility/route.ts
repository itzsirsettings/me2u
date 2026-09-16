import { queryAsUser } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Trust score tiers for loan amounts
const TRUST_TIERS = [
  { minScore: 0, maxAmount: 5000, maxDuration: 7, securityDeposit: 50 },
  { minScore: 60, maxAmount: 10000, maxDuration: 10, securityDeposit: 50 },
  { minScore: 70, maxAmount: 25000, maxDuration: 14, securityDeposit: 40 },
  { minScore: 80, maxAmount: 50000, maxDuration: 14, securityDeposit: 30 },
  { minScore: 90, maxAmount: 100000, maxDuration: 14, securityDeposit: 20 },
  { minScore: 95, maxAmount: 250000, maxDuration: 14, securityDeposit: 10 },
];

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Fetch user profile
    const { rows: profileRows } = await queryAsUser<{
      trust_score: number;
      kyc_verified: boolean;
      registration_deposit_paid: boolean;
      first_name: string;
    }>(
      auth.user.id,
      `SELECT trust_score, kyc_verified, registration_deposit_paid, first_name 
       FROM profiles 
       WHERE id = $1`,
      [auth.user.id]
    );

    const profile = profileRows[0];
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check for active loans
    const { rows: activeLoans } = await queryAsUser<{ id: string }>(
      auth.user.id,
      `SELECT id FROM loans WHERE borrower_id = $1 AND status = 'active'`,
      [auth.user.id]
    );

    const hasActiveLoan = activeLoans.length > 0;

    // Determine tier based on trust score
    const trustScore = profile.trust_score || 0;
    const currentTier =
      [...TRUST_TIERS].reverse().find((tier) => trustScore >= tier.minScore) ||
      TRUST_TIERS[0];

    const nextTier = TRUST_TIERS.find((tier) => tier.minScore > trustScore);

    // Determine eligibility
    const requiresDeposit = !profile.registration_deposit_paid;
    const requiresKyc = !profile.kyc_verified;
    const eligible =
      !requiresDeposit && !requiresKyc && !hasActiveLoan && trustScore >= 0;

    return NextResponse.json({
      ok: true,
      eligible,
      maxAmount: currentTier.maxAmount,
      maxDuration: currentTier.maxDuration,
      trustScore,
      securityDepositPercent: currentTier.securityDeposit,
      requiresDeposit,
      requiresKyc,
      hasActiveLoan,
      nextUnlockAmount: nextTier?.maxAmount,
      nextUnlockTrustScore: nextTier?.minScore,
      firstName: profile.first_name,
    });
  } catch (error) {
    logApiError("loan-eligibility", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
