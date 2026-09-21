import { NextResponse } from "next/server";
import { query } from "@/lib/railway/client";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await query<Record<string, string>>(`SELECT
      COALESCE(SUM(amount), 0)::text AS "processedAmount",
      COUNT(*) FILTER (WHERE type = 'loan_repayment')::text AS "successfulRepayments",
      COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS "activeUsers",
      (SELECT COUNT(*)::text FROM profiles) AS "totalUsers",
      (SELECT COUNT(*)::text FROM profiles WHERE kyc_verified = true) AS "verifiedWallets",
      (SELECT COUNT(*)::text FROM loans WHERE status = 'completed') AS "completedLoans",
      COUNT(DISTINCT user_id) FILTER (WHERE type = 'affiliate_reward')::text AS "usersRewarded",
      COUNT(*) FILTER (WHERE type = 'affiliate_reward')::text AS "referralsPaid"
    FROM transactions`);
    if (!rows[0]) throw new Error("Platform metrics query returned no result.");

    const metrics = Object.fromEntries(
      Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
    );
    return NextResponse.json(
      { ok: true, metrics },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logApiError("platform-metrics", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load platform metrics." },
      { status: 500 },
    );
  }
}
