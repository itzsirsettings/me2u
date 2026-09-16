import { NextResponse } from "next/server";
import { query } from "@/lib/railway/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [
      txResult,
      repaymentResult,
      activeUserResult,
      rewardResult,
      totalUsersResult,
      verifiedUsersResult,
      completedLoansResult,
    ] = await Promise.all([
      query<{ amount: number }>(`SELECT amount FROM transactions`),
      query<{ id: string }>(`SELECT id FROM transactions WHERE type = 'loan_repayment'`),
      query<{ user_id: string }>(
        `SELECT DISTINCT user_id FROM transactions WHERE created_at >= $1`,
        [since],
      ),
      query<{ referrer_id: string }>(`SELECT referrer_id FROM affiliate_rewards`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM profiles`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM profiles WHERE kyc_verified = true`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM loans WHERE status = 'completed'`),
    ]);

    const processedAmount = txResult.rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const activeUsers = new Set(activeUserResult.rows.map((r) => r.user_id)).size;
    const referralsPaid = rewardResult.rows.length;
    const usersRewarded = new Set(rewardResult.rows.map((r) => r.referrer_id)).size;

    return NextResponse.json({
      ok: true,
      metrics: {
        processedAmount,
        totalUsers: parseInt(totalUsersResult.rows[0]?.count || "0", 10),
        activeUsers,
        verifiedWallets: parseInt(verifiedUsersResult.rows[0]?.count || "0", 10),
        completedLoans: parseInt(completedLoansResult.rows[0]?.count || "0", 10),
        usersRewarded,
        referralsPaid,
        successfulRepayments: repaymentResult.rows.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load platform metrics.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
