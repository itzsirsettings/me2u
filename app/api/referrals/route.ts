import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const supabase = getSupabaseAdminClient();

    const { data: stats, error: statsError } = await supabase.rpc(
      "me2u_get_referral_stats",
      { p_user_id: auth.user.id }
    );

    if (statsError) throw statsError;

    const { data: details, error: detailsError } = await supabase.rpc(
      "me2u_get_referral_details",
      { p_user_id: auth.user.id }
    );

    if (detailsError) throw detailsError;

    return NextResponse.json({
      stats: stats || {
        total_referrals: 0,
        pending_withdrawal: 0,
        pending_repayment: 0,
        earned_withdrawal: 0,
        earned_repayment: 0,
        total_earned: 0,
      },
      referrals: details || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}
