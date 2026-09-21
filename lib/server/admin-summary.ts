import type { Pool } from "pg";

/** Totals cover the full ledger, independently of paginated dashboard detail lists. */
export async function getAdminSummary(db: Pick<Pool, "query">) {
  const { rows } = await db.query<Record<string, string | number>>(`WITH
    p AS (SELECT COUNT(*) AS users,
      COUNT(*) FILTER (WHERE kyc_verified) AS verified_users,
      COUNT(*) FILTER (WHERE role = 'admin') AS admins,
      COUNT(*) FILTER (WHERE partner_offer_consent_at IS NOT NULL) AS partner_leads FROM profiles),
    w AS (SELECT COALESCE(SUM(balance + locked), 0) AS wallet_liability FROM wallets),
    f AS (SELECT
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) AS approved_income,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved' AND type = 'registration_deposit'), 0) AS registration_income,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved' AND created_at >= date_trunc('month', NOW())), 0) AS month_approved_income,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved' AND type = 'registration_deposit' AND created_at >= date_trunc('month', NOW())), 0) AS month_registration_income,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND type = 'wallet_funding'), 0) AS pending_funding_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND type = 'registration_deposit'), 0) AS pending_registration_amount FROM payment_proofs),
    r AS (SELECT COALESCE(SUM(amount), 0) AS recorded_revenue,
      COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS month_recorded_revenue,
      COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal_fee'), 0) AS withdrawal_fee_revenue,
      COALESCE(SUM(amount) FILTER (WHERE type = 'marketplace_boost'), 0) AS marketplace_boost_revenue,
      COALESCE(SUM(amount) FILTER (WHERE type = 'partner_treasury_share'), 0) AS treasury_partner_revenue FROM revenue_events),
    a AS (SELECT COALESCE(SUM(amount), 0) AS affiliate_funding,
      COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS month_rewards FROM transactions WHERE type = 'affiliate_reward'),
    d AS (SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS paid_withdrawals,
      COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND created_at >= date_trunc('month', NOW())), 0) AS month_paid_withdrawals,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_withdrawal_amount,
      COALESCE(SUM(fee_amount) FILTER (WHERE status = 'pending'), 0) AS pending_withdrawal_fees FROM withdrawal_requests),
    l AS (SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) AS active_loan_exposure,
      COALESCE(SUM(amount) FILTER (WHERE status = 'active' AND lender_id IS NULL), 0) AS platform_loan_exposure,
      COALESCE(SUM(security_deposit) FILTER (WHERE status = 'active' AND lender_id IS NULL), 0) AS retained_float FROM loans),
    m AS (SELECT COUNT(*) FILTER (WHERE status = 'active') AS marketplace_active FROM marketplace_items),
    b AS (SELECT COUNT(*) AS total_bills_processed,
      COUNT(*) FILTER (WHERE status = 'successful') AS successful_bills,
      COUNT(*) FILTER (WHERE status IN ('failed', 'reversed', 'refunded')) AS failed_bills,
      COUNT(*) FILTER (WHERE status IN ('initiated', 'debited', 'pending')) AS pending_bills,
      COALESCE(SUM(profit) FILTER (WHERE status = 'successful'), 0) AS total_bill_profit FROM bill_transactions)
    SELECT p.*, w.*, l.*, m.*, b.*, a.affiliate_funding,
      f.pending_funding_amount, f.pending_registration_amount,
      d.pending_withdrawal_amount, d.pending_withdrawal_fees,
      r.withdrawal_fee_revenue, r.marketplace_boost_revenue, r.treasury_partner_revenue,
      f.registration_income + r.recorded_revenue AS revenue,
      f.approved_income + r.recorded_revenue AS income,
      d.paid_withdrawals + a.affiliate_funding AS expenses,
      f.month_registration_income + r.month_recorded_revenue AS month_revenue,
      f.month_approved_income + r.month_recorded_revenue AS month_income,
      d.month_paid_withdrawals + a.month_rewards AS month_expenses
    FROM p CROSS JOIN w CROSS JOIN f CROSS JOIN r CROSS JOIN a CROSS JOIN d CROSS JOIN l CROSS JOIN m CROSS JOIN b`);
  if (!rows[0]) throw new Error("Admin totals unavailable.");
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
  );
}
