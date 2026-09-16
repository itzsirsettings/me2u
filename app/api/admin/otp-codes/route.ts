import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";
import { getOtpStats } from "@/lib/server/in-app-otp";

/**
 * Admin endpoint to view OTP codes and statistics
 * GET /api/admin/otp-codes
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Check admin role
    const { rows: roleRows } = await auth.db.query<{ role: string }>(
      `SELECT role FROM profiles WHERE id = $1`,
      [auth.user.id]
    );
    
    if (!roleRows[0] || roleRows[0].role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    // Get statistics
    const stats = await getOtpStats();

    // Get recent OTP codes (last 50)
    const { rows: recentCodes } = await auth.db.query<{
      id: string;
      identifier: string;
      code: string;
      purpose: string;
      expires_at: string;
      verified: boolean;
      attempts: number;
      created_at: string;
    }>(
      `SELECT 
         id,
         identifier,
         code,
         purpose,
         expires_at,
         verified,
         attempts,
         created_at
       FROM otp_codes
       ORDER BY created_at DESC
       LIMIT 50`
    );

    // Get active (unexpired) codes
    const { rows: activeCodes } = await auth.db.query<{
      identifier: string;
      code: string;
      purpose: string;
      expires_at: string;
      minutes_remaining: string;
    }>(
      `SELECT 
         identifier,
         code,
         purpose,
         expires_at,
         EXTRACT(EPOCH FROM (expires_at - NOW()))::integer / 60 as minutes_remaining
       FROM otp_codes
       WHERE verified = false 
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 20`
    );

    // Get verification rate by purpose
    const { rows: purposeStats } = await auth.db.query<{
      purpose: string;
      total_sent: string;
      total_verified: string;
      verification_rate: string;
    }>(
      `SELECT 
         purpose::text,
         COUNT(*) as total_sent,
         COUNT(*) FILTER (WHERE verified = true) as total_verified,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE verified = true) / NULLIF(COUNT(*), 0),
           2
         ) as verification_rate
       FROM otp_codes
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY purpose
       ORDER BY total_sent DESC`
    );

    return NextResponse.json({
      stats,
      recent_codes: recentCodes.map(code => ({
        ...code,
        minutes_until_expiry: Math.max(
          0,
          Math.floor((new Date(code.expires_at).getTime() - Date.now()) / 60000)
        ),
        is_expired: new Date(code.expires_at) < new Date(),
      })),
      active_codes: activeCodes.map(code => ({
        ...code,
        minutes_remaining: parseInt(code.minutes_remaining),
      })),
      purpose_stats: purposeStats.map(stat => ({
        purpose: stat.purpose,
        total_sent: parseInt(stat.total_sent),
        total_verified: parseInt(stat.total_verified),
        verification_rate: parseFloat(stat.verification_rate),
      })),
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch OTP codes.");
  }
}
