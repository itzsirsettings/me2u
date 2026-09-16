import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

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

    // Get unlock status breakdown
    const { rows: statusRows } = await auth.db.query<{
      unlock_status: string;
      count: string;
      avg_days_since_reg: string;
    }>(
      `SELECT 
         CASE 
           WHEN account_unlocked THEN 'unlocked'
           WHEN EXISTS (
             SELECT 1 FROM subscriptions s
             WHERE s.user_id = p.id 
               AND s.status IN ('active', 'trialing')
               AND s.plan IN ('plus_monthly', 'plus_annual', 'lender_pro_monthly', 'lender_pro_volume')
               AND s.current_period_end > NOW()
           ) THEN 'has_subscription'
           WHEN verified_referral_count >= 10 THEN 'eligible_via_referrals'
           WHEN EXISTS (
             SELECT 1 FROM account_unlock_payments aup
             WHERE aup.user_id = p.id 
               AND aup.status = 'success'
               AND aup.eligible_at <= NOW()
           ) THEN 'eligible_via_time'
           WHEN EXISTS (
             SELECT 1 FROM account_unlock_payments aup
             WHERE aup.user_id = p.id 
               AND aup.status = 'success'
               AND aup.eligible_at > NOW()
           ) THEN 'waiting_period'
           ELSE 'locked'
         END as unlock_status,
         COUNT(*) as count,
         AVG(EXTRACT(DAY FROM NOW() - p.created_at))::numeric(10,2) as avg_days_since_reg
       FROM profiles p
       GROUP BY unlock_status
       ORDER BY count DESC`
    );

    // Get unlock method breakdown (for unlocked users)
    const { rows: methodRows } = await auth.db.query<{
      unlock_method: string;
      count: string;
    }>(
      `SELECT 
         COALESCE(unlock_method, 'unknown') as unlock_method,
         COUNT(*) as count
       FROM profiles
       WHERE account_unlocked = true
       GROUP BY unlock_method
       ORDER BY count DESC`
    );

    // Get unlock payments over time
    const { rows: paymentsRows } = await auth.db.query<{
      date: string;
      successful_payments: string;
      total_revenue: string;
      avg_days_until_eligible: string;
    }>(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) FILTER (WHERE status = 'success') as successful_payments,
         SUM(amount) FILTER (WHERE status = 'success') as total_revenue,
         AVG(EXTRACT(DAY FROM eligible_at - created_at)) FILTER (WHERE status = 'success' AND eligible_at IS NOT NULL) as avg_days_until_eligible
       FROM account_unlock_payments
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`
    );

    // Get conversion funnel
    const { rows: funnelRows } = await auth.db.query<{
      total_users: string;
      kyc_verified: string;
      payment_made: string;
      waiting_period: string;
      unlocked_time: string;
      unlocked_referrals: string;
      unlocked_subscription: string;
    }>(
      `SELECT 
         COUNT(*) as total_users,
         COUNT(*) FILTER (WHERE kyc_verified = true) as kyc_verified,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM account_unlock_payments aup
           WHERE aup.user_id = profiles.id AND aup.status = 'success'
         )) as payment_made,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM account_unlock_payments aup
           WHERE aup.user_id = profiles.id 
             AND aup.status = 'success'
             AND aup.eligible_at > NOW()
         )) as waiting_period,
         COUNT(*) FILTER (WHERE account_unlocked = true AND unlock_method = 'time_based') as unlocked_time,
         COUNT(*) FILTER (WHERE account_unlocked = true AND unlock_method = 'referrals') as unlocked_referrals,
         COUNT(*) FILTER (WHERE account_unlocked = true AND unlock_method = 'subscription') as unlocked_subscription
       FROM profiles
       WHERE created_at >= NOW() - INTERVAL '90 days'`
    );

    // Get top referrers close to unlock
    const { rows: topReferrersRows } = await auth.db.query<{
      user_id: string;
      email: string;
      first_name: string;
      last_name: string;
      verified_referral_count: number;
      referrals_needed: number;
      created_at: string;
    }>(
      `SELECT 
         id as user_id,
         email,
         first_name,
         last_name,
         COALESCE(verified_referral_count, 0) as verified_referral_count,
         10 - COALESCE(verified_referral_count, 0) as referrals_needed,
         created_at
       FROM profiles
       WHERE account_unlocked = false
         AND verified_referral_count >= 5
         AND verified_referral_count < 10
       ORDER BY verified_referral_count DESC
       LIMIT 20`
    );

    // Get waiting period users (paid but not yet eligible)
    const { rows: waitingRows } = await auth.db.query<{
      user_id: string;
      email: string;
      first_name: string;
      last_name: string;
      payment_date: string;
      eligible_at: string;
      days_remaining: string;
    }>(
      `SELECT 
         p.id as user_id,
         p.email,
         p.first_name,
         p.last_name,
         aup.created_at as payment_date,
         aup.eligible_at,
         EXTRACT(DAY FROM aup.eligible_at - NOW())::integer as days_remaining
       FROM profiles p
       JOIN account_unlock_payments aup ON aup.user_id = p.id
       WHERE p.account_unlocked = false
         AND aup.status = 'success'
         AND aup.eligible_at > NOW()
       ORDER BY aup.eligible_at ASC
       LIMIT 50`
    );

    // Revenue metrics
    const { rows: revenueRows } = await auth.db.query<{
      total_unlock_revenue: string;
      payments_count: string;
      avg_payment: string;
      revenue_this_month: string;
      revenue_last_month: string;
    }>(
      `SELECT 
         SUM(amount) FILTER (WHERE status = 'success') as total_unlock_revenue,
         COUNT(*) FILTER (WHERE status = 'success') as payments_count,
         AVG(amount) FILTER (WHERE status = 'success') as avg_payment,
         SUM(amount) FILTER (WHERE status = 'success' AND created_at >= DATE_TRUNC('month', NOW())) as revenue_this_month,
         SUM(amount) FILTER (WHERE status = 'success' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW())) as revenue_last_month
       FROM account_unlock_payments`
    );

    return NextResponse.json({
      status_breakdown: statusRows.map(r => ({
        status: r.unlock_status,
        count: parseInt(r.count),
        avg_days_since_registration: parseFloat(r.avg_days_since_reg || "0"),
      })),
      
      unlock_methods: methodRows.map(r => ({
        method: r.unlock_method,
        count: parseInt(r.count),
      })),
      
      payments_over_time: paymentsRows.map(r => ({
        date: r.date,
        successful_payments: parseInt(r.successful_payments || "0"),
        total_revenue: parseFloat(r.total_revenue || "0"),
        avg_days_until_eligible: parseFloat(r.avg_days_until_eligible || "15"),
      })),
      
      conversion_funnel: funnelRows[0] ? {
        total_users: parseInt(funnelRows[0].total_users),
        kyc_verified: parseInt(funnelRows[0].kyc_verified),
        payment_made: parseInt(funnelRows[0].payment_made),
        waiting_period: parseInt(funnelRows[0].waiting_period),
        unlocked_time: parseInt(funnelRows[0].unlocked_time),
        unlocked_referrals: parseInt(funnelRows[0].unlocked_referrals),
        unlocked_subscription: parseInt(funnelRows[0].unlocked_subscription),
      } : null,
      
      top_referrers: topReferrersRows,
      waiting_period_users: waitingRows,
      
      revenue: revenueRows[0] ? {
        total_unlock_revenue: parseFloat(revenueRows[0].total_unlock_revenue || "0"),
        payments_count: parseInt(revenueRows[0].payments_count || "0"),
        avg_payment: parseFloat(revenueRows[0].avg_payment || "0"),
        revenue_this_month: parseFloat(revenueRows[0].revenue_this_month || "0"),
        revenue_last_month: parseFloat(revenueRows[0].revenue_last_month || "0"),
      } : null,
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch unlock analytics.");
  }
}
