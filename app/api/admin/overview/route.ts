import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AffiliateRewardRow,
  LoanRow,
  MarketplaceRow,
  PaymentProofRow,
  ProfileRow,
  RevenueEventRow,
  TransactionRow,
  WalletRow,
  WithdrawalRequestRow,
} from "@/lib/supabase/types";
import { platformLoanRetainedDepositRate } from "@/lib/loans";

const signedImageTtlSeconds = 10 * 60;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function sumBy<T>(rows: T[], getAmount: (row: T) => number) {
  return rows.reduce((total, row) => total + getAmount(row), 0);
}

function sameMonth(value: string) {
  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function moneyValue(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

async function createSignedPrivateUrl(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  bucket: "receipts" | "kyc-documents",
  path: string | null,
) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, signedImageTtlSeconds);

  if (error) {
    console.warn(`Unable to sign ${bucket} asset.`, error.message);
    return null;
  }

  return data.signedUrl || null;
}

function fullName(profile?: Pick<ProfileRow, "first_name" | "last_name" | "email"> | null) {
  if (!profile) return "Unknown user";
  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return name || profile.email;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminUser(request);
    if ("response" in auth) return auth.response;

    const supabase = auth.supabase;
    const [
      profilesResponse,
      walletsResponse,
      transactionsResponse,
      loansResponse,
      marketplaceResponse,
      paymentProofsResponse,
      affiliateRewardsResponse,
      withdrawalRequestsResponse,
      revenueEventsResponse,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("wallets").select("*").limit(500),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("loans").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("marketplace_items").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("payment_proofs").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("affiliate_rewards").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("revenue_events").select("*").order("created_at", { ascending: false }).limit(250),
    ]);

    const error =
      profilesResponse.error ||
      walletsResponse.error ||
      transactionsResponse.error ||
      loansResponse.error ||
      marketplaceResponse.error ||
      paymentProofsResponse.error ||
      affiliateRewardsResponse.error ||
      withdrawalRequestsResponse.error ||
      revenueEventsResponse.error;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const profiles = (profilesResponse.data || []) as ProfileRow[];
    const wallets = (walletsResponse.data || []) as WalletRow[];
    const transactions = (transactionsResponse.data || []) as TransactionRow[];
    const loans = (loansResponse.data || []) as LoanRow[];
    const marketplaceItems = (marketplaceResponse.data || []) as MarketplaceRow[];
    const paymentProofs = (paymentProofsResponse.data || []) as PaymentProofRow[];
    const affiliateRewards = (affiliateRewardsResponse.data || []) as AffiliateRewardRow[];
    const withdrawalRequests = (withdrawalRequestsResponse.data || []) as WithdrawalRequestRow[];
    const revenueEvents = (revenueEventsResponse.data || []) as RevenueEventRow[];
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const walletsByUserId = new Map(wallets.map((wallet) => [wallet.user_id, wallet]));

    const users = await Promise.all(
      profiles.map(async (profile) => {
        const wallet = walletsByUserId.get(profile.id) || null;
        const userTransactions = transactions.filter((transaction) => transaction.user_id === profile.id);
        const userLoans = loans.filter(
          (loan) => loan.borrower_id === profile.id || loan.lender_id === profile.id,
        );

        return {
          ...profile,
          full_name: fullName(profile),
          wallet,
          wallet_balance: moneyValue(wallet?.balance),
          wallet_locked: moneyValue(wallet?.locked),
          passport_signed_url: await createSignedPrivateUrl(
            supabase,
            "kyc-documents",
            profile.passport_photo_url,
          ),
          transaction_count: userTransactions.length,
          loan_count: userLoans.length,
          pending_payment_proofs: paymentProofs.filter(
            (proof) => proof.user_id === profile.id && proof.status === "pending",
          ).length,
          pending_withdrawals: withdrawalRequests.filter(
            (withdrawal) => withdrawal.user_id === profile.id && withdrawal.status === "pending",
          ).length,
        };
      }),
    );

    const enrichedPaymentProofs = await Promise.all(
      paymentProofs.map(async (proof) => {
        const profile = profilesById.get(proof.user_id);

        return {
          ...proof,
          user_name: fullName(profile),
          user_email: profile?.email || "",
          receipt_signed_url: await createSignedPrivateUrl(supabase, "receipts", proof.receipt_image_url),
        };
      }),
    );

    const enrichedWithdrawalRequests = withdrawalRequests.map((withdrawal) => {
      const profile = profilesById.get(withdrawal.user_id);

      return {
        ...withdrawal,
        user_name: fullName(profile),
        user_email: profile?.email || "",
        user_phone: profile?.phone || "",
        wallet_balance: moneyValue(walletsByUserId.get(withdrawal.user_id)?.balance),
      };
    });

    const approvedProofs = paymentProofs.filter((proof) => proof.status === "approved");
    const pendingProofs = paymentProofs.filter((proof) => proof.status === "pending");
    const pendingWithdrawals = withdrawalRequests.filter((requestRow) => requestRow.status === "pending");
    const approvedWithdrawals = withdrawalRequests.filter((requestRow) => requestRow.status === "success");
    const activeLoans = loans.filter((loan) => loan.status === "active");
    const platformLoans = loans.filter((loan) => loan.lender_id === null);
    const retainedFloat = sumBy(
      platformLoans.filter((loan) => loan.status === "active"),
      (loan) => moneyValue(loan.amount) * platformLoanRetainedDepositRate,
    );
    const revenueEventTotal = sumBy(revenueEvents, (event) => moneyValue(event.amount));
    const revenueEventsThisMonth = revenueEvents.filter((event) => sameMonth(event.created_at));
    const withdrawalFeeRevenue = sumBy(
      revenueEvents.filter((event) => event.type === "withdrawal_fee"),
      (event) => moneyValue(event.amount),
    );
    const marketplaceBoostRevenue = sumBy(
      revenueEvents.filter((event) => event.type === "marketplace_boost"),
      (event) => moneyValue(event.amount),
    );
    const treasuryPartnerRevenue = sumBy(
      revenueEvents.filter((event) => event.type === "partner_treasury_share"),
      (event) => moneyValue(event.amount),
    );
    const onboardingCredits = transactions.filter(
      (transaction) =>
        transaction.type === "deposit" &&
        /welcome bonus|onboarding credit|reversal of old onboarding credit/i.test(transaction.description),
    );

    const summary = {
      users: profiles.length,
      verified_users: profiles.filter((profile) => profile.kyc_verified).length,
      admins: profiles.filter((profile) => profile.role === "admin").length,
      wallet_liability: sumBy(wallets, (wallet) => moneyValue(wallet.balance) + moneyValue(wallet.locked)),
      revenue:
        sumBy(
          approvedProofs.filter((proof) => proof.type === "registration_deposit"),
          (proof) => moneyValue(proof.amount),
        ) + revenueEventTotal,
      income: sumBy(approvedProofs, (proof) => moneyValue(proof.amount)) + revenueEventTotal,
      expenses:
        sumBy(approvedWithdrawals, (requestRow) => moneyValue(requestRow.amount)) +
        sumBy(affiliateRewards, (reward) => moneyValue(reward.amount)) +
        sumBy(onboardingCredits, (transaction) => moneyValue(transaction.amount)),
      withdrawal_fee_revenue: withdrawalFeeRevenue,
      marketplace_boost_revenue: marketplaceBoostRevenue,
      treasury_partner_revenue: treasuryPartnerRevenue,
      partner_leads: profiles.filter((profile) => Boolean(profile.partner_offer_consent_at)).length,
      affiliate_funding: sumBy(affiliateRewards, (reward) => moneyValue(reward.amount)),
      pending_funding_amount: sumBy(
        pendingProofs.filter((proof) => proof.type === "wallet_funding"),
        (proof) => moneyValue(proof.amount),
      ),
      pending_registration_amount: sumBy(
        pendingProofs.filter((proof) => proof.type === "registration_deposit"),
        (proof) => moneyValue(proof.amount),
      ),
      pending_withdrawal_amount: sumBy(pendingWithdrawals, (requestRow) => moneyValue(requestRow.amount)),
      pending_withdrawal_fees: sumBy(pendingWithdrawals, (requestRow) => moneyValue(requestRow.fee_amount)),
      active_loan_exposure: sumBy(activeLoans, (loan) => moneyValue(loan.amount)),
      platform_loan_exposure: sumBy(
        platformLoans.filter((loan) => loan.status === "active"),
        (loan) => moneyValue(loan.amount),
      ),
      marketplace_active: marketplaceItems.filter((item) => item.status === "active").length,
      retained_float: retainedFloat,
      month_revenue: sumBy(
        approvedProofs.filter((proof) => proof.type === "registration_deposit" && sameMonth(proof.created_at)),
        (proof) => moneyValue(proof.amount),
      ) + sumBy(revenueEventsThisMonth, (event) => moneyValue(event.amount)),
      month_income: sumBy(
        approvedProofs.filter((proof) => sameMonth(proof.created_at)),
        (proof) => moneyValue(proof.amount),
      ) + sumBy(revenueEventsThisMonth, (event) => moneyValue(event.amount)),
      month_expenses:
        sumBy(
          approvedWithdrawals.filter((requestRow) => sameMonth(requestRow.created_at)),
          (requestRow) => moneyValue(requestRow.amount),
        ) +
        sumBy(
          affiliateRewards.filter((reward) => sameMonth(reward.created_at)),
          (reward) => moneyValue(reward.amount),
        ) +
        sumBy(
          onboardingCredits.filter((transaction) => sameMonth(transaction.created_at)),
          (transaction) => moneyValue(transaction.amount),
        ),
    };

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      summary,
      users,
      payment_proofs: enrichedPaymentProofs,
      withdrawal_requests: enrichedWithdrawalRequests,
      transactions,
      loans,
      marketplace_items: marketplaceItems,
      affiliate_rewards: affiliateRewards,
      revenue_events: revenueEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin overview.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
