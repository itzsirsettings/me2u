import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server/auth";
import { getAdminSummary } from "@/lib/server/admin-summary";
import { privateImageUrl } from "@/lib/private-images";

function moneyValue(v: unknown) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
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
      db.query(`SELECT id, first_name, last_name, email, phone, username,
        kyc_verified, trust_score, bank_name, account_number, role,
        registration_deposit_paid, registration_deposit_amount,
        registration_deposit_confirmed_at, passport_photo_url, affiliate_earnings,
        partner_offer_consent_at, created_at, updated_at
        FROM profiles ORDER BY created_at DESC LIMIT 500`),
      db.query(`SELECT w.* FROM wallets w JOIN
        (SELECT id FROM profiles ORDER BY created_at DESC LIMIT 500) p ON p.id = w.user_id`),
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
        const userLoans = loans.filter(
          (l: any) => l.borrower_id === p.id || l.lender_id === p.id,
        );
        return {
          ...p,
          full_name: fullName(p),
          wallet,
          wallet_balance: moneyValue(wallet?.balance),
          wallet_locked: moneyValue(wallet?.locked),
          passport_signed_url: privateImageUrl(p.passport_photo_url),
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
          receipt_signed_url: privateImageUrl(proof.receipt_image_url),
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

    const summary = await getAdminSummary(db);
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
