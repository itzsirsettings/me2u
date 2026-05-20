import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function countRows(table: "profiles" | "loans" | "affiliate_rewards", filter?: (query: any) => any) {
  const supabase = getSupabaseAdminClient();
  const query = supabase.from(table).select("*", { count: "exact", head: true });
  const { count, error } = await (filter ? filter(query) : query);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [
      processedResponse,
      repaymentResponse,
      activeUserResponse,
      rewardsResponse,
      totalUsers,
      verifiedWallets,
      completedLoans,
    ] = await Promise.all([
      supabase.from("transactions").select("amount"),
      supabase.from("transactions").select("id").eq("type", "loan_repayment"),
      supabase.from("transactions").select("user_id").gte("created_at", since),
      supabase.from("affiliate_rewards").select("referrer_id"),
      countRows("profiles"),
      countRows("profiles", (query) => query.eq("kyc_verified", true)),
      countRows("loans", (query) => query.eq("status", "completed")),
    ]);

    if (processedResponse.error) throw new Error(processedResponse.error.message);
    if (repaymentResponse.error) throw new Error(repaymentResponse.error.message);
    if (activeUserResponse.error) throw new Error(activeUserResponse.error.message);
    if (rewardsResponse.error) throw new Error(rewardsResponse.error.message);

    const processedAmount = (processedResponse.data || []).reduce(
      (total, row) => total + Number(row.amount || 0),
      0,
    );
    const activeUsers = new Set((activeUserResponse.data || []).map((row) => row.user_id)).size;
    const referralsPaid = rewardsResponse.data?.length || 0;
    const usersRewarded = new Set((rewardsResponse.data || []).map((row) => row.referrer_id)).size;

    return NextResponse.json({
      ok: true,
      metrics: {
        processedAmount,
        totalUsers,
        activeUsers,
        verifiedWallets,
        completedLoans,
        usersRewarded,
        referralsPaid,
        successfulRepayments: repaymentResponse.data?.length || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load platform metrics.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
