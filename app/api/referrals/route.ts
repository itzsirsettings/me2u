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
         COUNT(*) FILTER (WHERE ar.id IS NULL AND NOT p.registration_deposit_paid)::int  AS pending_withdrawal,
         COUNT(*) FILTER (WHERE ar2.id IS NULL AND p.kyc_verified
                          AND NOT EXISTS (
                            SELECT 1 FROM loans l
                            WHERE l.borrower_id = p.id AND l.status = 'completed'
                          ))::int                                                    AS pending_repayment,
         COUNT(DISTINCT ar.id)::int                                                  AS earned_withdrawal,
         COUNT(DISTINCT ar2.id)::int                                                 AS earned_repayment,
         COALESCE(SUM(ar_all.amount), 0)                                             AS total_earned
       FROM referrals r
       JOIN profiles p ON p.id = r.referee_id
       LEFT JOIN affiliate_rewards ar
              ON ar.referrer_id = $1 AND ar.referred_user_id = r.referee_id
             AND ar.amount = 250
       LEFT JOIN affiliate_rewards ar2
              ON ar2.referrer_id = $1 AND ar2.referred_user_id = r.referee_id
             AND ar2.amount = 250
       LEFT JOIN affiliate_rewards ar_all ON ar_all.referrer_id = $1
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
         EXISTS (
           SELECT 1 FROM affiliate_rewards ar
           WHERE ar.referrer_id = $1
             AND ar.referred_user_id = p.id
             AND ar.amount = 250
           LIMIT 1
         )                                      AS first_withdrawal_rewarded,
         EXISTS (
           SELECT 1 FROM affiliate_rewards ar2
           WHERE ar2.referrer_id = $1
             AND ar2.referred_user_id = p.id
             AND ar2.amount = 250
           LIMIT 1
         )                                      AS first_repayment_rewarded,
         CASE
           WHEN NOT p.kyc_verified THEN 'Awaiting KYC'
           WHEN NOT p.registration_deposit_paid THEN 'Awaiting first withdrawal'
           ELSE 'Awaiting first repayment'
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

    return NextResponse.json({ stats, referrals: detailRows });
  } catch (error) {
    return errorResponse(error, "Failed to fetch referrals.");
  }
}
