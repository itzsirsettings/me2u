import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server/auth";
import { platformLoanRetainedDepositRate } from "@/lib/loans";

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
function sumBy<T>(rows: T[], fn: (r: T) => number) {
  return rows.reduce((s, r) => s + fn(r), 0);
}
function sameMonth(value: string) {
  const d = new Date(value);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}
function moneyValue(v: unknown) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Converts a stored file path ("<userId>/<fileId>-<safeName>") into the
 * first-party API URL that streams bytes from PostgreSQL.
 * Full HTTP URLs (legacy) are passed through unchanged.
 */
function fileApiUrl(path: string | null): string | null {
  if (!path) return null;
  if (isHttpUrl(path)) return path;

  // Path format: "<userId>/<fileId>-<safeName>"
  const segments = path.split("/");
  const fileSegment = segments[segments.length - 1] || "";
  const fileId = fileSegment.split("-")[0];

  if (!fileId || !/^[0-9a-f-]{36}$/.test(fileId)) return null;
  return `/api/uploads/file/${fileId}`;
}

function fullName(row: { first_name?: string; last_name?: string; email?: string } | null) {
  if (!row) return "Unknown user";
  const name = `${row.first_name || ""} ${row.last_name || ""}`.trim();
  return name || row.email || "Unknown";
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminUser(request);
    if ("response" in auth) return auth.response;

    const db = auth.db;

    const [
      profilesRes,
      walletsRes,
      txRes,
      loansRes,
      mktRes,
      proofsRes,
      rewardsRes,
      withdrawalsRes,
      revenueRes,
      billTxRes,
    ] = await Promise.all([
      db.query(`SELECT * FROM profiles ORDER BY created_at DESC LIMIT 500`),
      db.query(`SELECT * FROM wallets LIMIT 500`),
      db.query(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM loans ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM marketplace_items ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM payment_proofs ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM affiliate_rewards ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM revenue_events ORDER BY created_at DESC LIMIT 250`),
      db.query(`SELECT * FROM bill_transactions ORDER BY created_at DESC LIMIT 250`),
    ]);

    const profiles = profilesRes.rows;
    const wallets = walletsRes.rows;
    const transactions = txRes.rows;
    const loans = loansRes.rows;
    const marketplaceItems = mktRes.rows;
    const paymentProofs = proofsRes.rows;
    const affiliateRewards = rewardsRes.rows;
    const withdrawalRequests = withdrawalsRes.rows;
    const revenueEvents = revenueRes.rows;
    const billTransactions = billTxRes.rows;

    const profilesById = new Map(profiles.map((p: any) => [p.id, p]));
    const walletsByUserId = new Map(wallets.map((w: any) => [w.user_id, w]));

    const users = await Promise.all(
      profiles.map(async (p: any) => {
        const wallet = walletsByUserId.get(p.id) || null;
        const userTx = transactions.filter((t: any) => t.user_id === p.id);
        const userLoans = loans.filter((l: any) => l.borrower_id === p.id || l.lender_id === p.id);
        return {
          ...p,
          full_name: fullName(p),
          wallet,
          wallet_balance: moneyValue(wallet?.balance),
          wallet_locked: moneyValue(wallet?.locked),
          passport_signed_url: fileApiUrl(p.passport_photo_url),
          transaction_count: userTx.length,
          loan_count: userLoans.length,
          pending_payment_proofs: paymentProofs.filter(
            (pp: any) => pp.user_id === p.id && pp.status === "pending",
          ).length,
          pending_withdrawals: withdrawalRequests.filter(
            (w: any) => w.user_id === p.id && w.status === "pending",
          ).length,
        };
      }),
    );

    const enrichedPaymentProofs = await Promise.all(
      paymentProofs.map(async (proof: any) => {
        const profile = profilesById.get(proof.user_id);
        return {
          ...proof,
          user_name: fullName(profile as any),
          user_email: (profile as any)?.email || "",
          receipt_signed_url: fileApiUrl(proof.receipt_image_url),
        };
      }),
    );

    const enrichedWithdrawals = withdrawalRequests.map((w: any) => {
      const p = profilesById.get(w.user_id);
      return {
        ...w,
        user_name: fullName(p as any),
        user_email: (p as any)?.email || "",
        user_phone: (p as any)?.phone || "",
        wallet_balance: moneyValue(walletsByUserId.get(w.user_id)?.balance),
      };
    });

    const approvedProofs = paymentProofs.filter((p: any) => p.status === "approved");
    const pendingProofs = paymentProofs.filter((p: any) => p.status === "pending");
    const pendingWithdrawals = withdrawalRequests.filter((w: any) => w.status === "pending");
    const approvedWithdrawals = withdrawalRequests.filter((w: any) => w.status === "success");
    const activeLoans = loans.filter((l: any) => l.status === "active");
    const platformLoans = loans.filter((l: any) => l.lender_id === null);
    const revenueEventTotal = sumBy(revenueEvents, (e: any) => moneyValue(e.amount));
    const revenueEventsThisMonth = revenueEvents.filter((e: any) => sameMonth(e.created_at));

    const summary = {
      users: profiles.length,
      verified_users: profiles.filter((p: any) => p.kyc_verified).length,
      admins: profiles.filter((p: any) => p.role === "admin").length,
      wallet_liability: sumBy(wallets, (w: any) => moneyValue(w.balance) + moneyValue(w.locked)),
      revenue:
        sumBy(
          approvedProofs.filter((p: any) => p.type === "registration_deposit"),
          (p: any) => moneyValue(p.amount),
        ) + revenueEventTotal,
      income: sumBy(approvedProofs, (p: any) => moneyValue(p.amount)) + revenueEventTotal,
      expenses:
        sumBy(approvedWithdrawals, (w: any) => moneyValue(w.amount)) +
        sumBy(affiliateRewards, (r: any) => moneyValue(r.amount)),
      withdrawal_fee_revenue: sumBy(
        revenueEvents.filter((e: any) => e.type === "withdrawal_fee"),
        (e: any) => moneyValue(e.amount),
      ),
      marketplace_boost_revenue: sumBy(
        revenueEvents.filter((e: any) => e.type === "marketplace_boost"),
        (e: any) => moneyValue(e.amount),
      ),
      treasury_partner_revenue: sumBy(
        revenueEvents.filter((e: any) => e.type === "partner_treasury_share"),
        (e: any) => moneyValue(e.amount),
      ),
      partner_leads: profiles.filter((p: any) => Boolean(p.partner_offer_consent_at)).length,
      affiliate_funding: sumBy(affiliateRewards, (r: any) => moneyValue(r.amount)),
      pending_funding_amount: sumBy(
        pendingProofs.filter((p: any) => p.type === "wallet_funding"),
        (p: any) => moneyValue(p.amount),
      ),
      pending_registration_amount: sumBy(
        pendingProofs.filter((p: any) => p.type === "registration_deposit"),
        (p: any) => moneyValue(p.amount),
      ),
      pending_withdrawal_amount: sumBy(pendingWithdrawals, (w: any) => moneyValue(w.amount)),
      pending_withdrawal_fees: sumBy(pendingWithdrawals, (w: any) => moneyValue(w.fee_amount)),
      active_loan_exposure: sumBy(activeLoans, (l: any) => moneyValue(l.amount)),
      platform_loan_exposure: sumBy(
        platformLoans.filter((l: any) => l.status === "active"),
        (l: any) => moneyValue(l.amount),
      ),
      marketplace_active: marketplaceItems.filter((i: any) => i.status === "active").length,
      total_bills_processed: billTransactions.length,
      successful_bills: billTransactions.filter((t: any) => t.status === "successful").length,
      failed_bills: billTransactions.filter((t: any) =>
        ["failed", "reversed", "refunded"].includes(t.status),
      ).length,
      pending_bills: billTransactions.filter((t: any) =>
        ["initiated", "debited", "pending"].includes(t.status),
      ).length,
      total_bill_profit: sumBy(
        billTransactions.filter((t: any) => t.status === "successful"),
        (t: any) => moneyValue(t.profit),
      ),
      retained_float: sumBy(
        platformLoans.filter((l: any) => l.status === "active"),
        (l: any) => moneyValue(l.amount) * platformLoanRetainedDepositRate,
      ),
      month_revenue:
        sumBy(
          approvedProofs.filter(
            (p: any) => p.type === "registration_deposit" && sameMonth(p.created_at),
          ),
          (p: any) => moneyValue(p.amount),
        ) + sumBy(revenueEventsThisMonth, (e: any) => moneyValue(e.amount)),
      month_income:
        sumBy(
          approvedProofs.filter((p: any) => sameMonth(p.created_at)),
          (p: any) => moneyValue(p.amount),
        ) + sumBy(revenueEventsThisMonth, (e: any) => moneyValue(e.amount)),
      month_expenses:
        sumBy(
          approvedWithdrawals.filter((w: any) => sameMonth(w.created_at)),
          (w: any) => moneyValue(w.amount),
        ) +
        sumBy(
          affiliateRewards.filter((r: any) => sameMonth(r.created_at)),
          (r: any) => moneyValue(r.amount),
        ),
    };

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      summary,
      users,
      payment_proofs: enrichedPaymentProofs,
      withdrawal_requests: enrichedWithdrawals,
      transactions,
      loans,
      marketplace_items: marketplaceItems,
      affiliate_rewards: affiliateRewards,
      revenue_events: revenueEvents,
      bill_transactions: billTransactions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin overview.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
