import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;

    // Referral stats
    const { rows: statsRows } = await auth.db.query<{
      total_referrals: number;
      pending_withdrawal: number;
      pending_repayment: number;
      earned_withdrawal: number;
      earned_repayment: number;
      total_earned: number;
    }>(
      `SELECT
         COUNT(DISTINCT r.referee_id)::int                                          AS total_referrals,
         COUNT(*) FILTER (WHERE NOT r.first_withdrawal_rewarded)::int                AS pending_withdrawal,
         COUNT(*) FILTER (WHERE NOT r.first_repayment_rewarded)::int                 AS pending_repayment,
         COUNT(*) FILTER (WHERE r.first_withdrawal_rewarded)::int                    AS earned_withdrawal,
         COUNT(*) FILTER (WHERE r.first_repayment_rewarded)::int                     AS earned_repayment,
         COALESCE((SELECT SUM(amount) FROM referral_reward_events WHERE recipient_id = $1), 0)::numeric AS total_earned
       FROM referrals r
       WHERE r.referrer_id = $1`,
      [userId],
    );

    // Referral details
    const { rows: detailRows } = await auth.db.query(
      `SELECT
         p.id                                   AS referee_id,
         (p.first_name || ' ' || p.last_name)   AS referee_name,
         p.email                                AS referee_email,
         p.trust_score                          AS referee_trust_score,
         p.kyc_verified                         AS referee_kyc_verified,
         r.created_at                           AS signed_up_at,
         r.signup_rewarded,
         r.first_withdrawal_rewarded,
         r.first_repayment_rewarded,
         CASE
           WHEN NOT r.first_withdrawal_rewarded THEN 'Awaiting first withdrawal'
           WHEN NOT r.first_repayment_rewarded THEN 'Awaiting first repayment'
           ELSE 'Direct referral rewards complete'
         END                                    AS pending_rewards
       FROM referrals r
       JOIN profiles p ON p.id = r.referee_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId],
    );

    const stats = statsRows[0] || {
      total_referrals: 0,
      pending_withdrawal: 0,
      pending_repayment: 0,
      earned_withdrawal: 0,
      earned_repayment: 0,
      total_earned: 0,
    };

    return NextResponse.json(
      { stats: { ...stats, total_earned: Number(stats.total_earned) }, referrals: detailRows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "Failed to fetch referrals.");
  }
}
