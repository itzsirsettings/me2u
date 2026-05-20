import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { getPlatformLoanRetainedDeposit, repeatPlatformLoanMinimum } from "@/lib/loans";
import { withdrawalFeeAmount } from "@/lib/revenue";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";
import { verifyTransactionPin } from "@/lib/server/pin";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`wallet-withdraw-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`wallet-withdraw-user:${auth.user.id}`, 10, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const amount = readPositiveAmount(body.amount);
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("registration_deposit_paid, kyc_verified, bank_name, account_number, transaction_pin")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Profile not found.");
    if (!profile.registration_deposit_paid) {
      throw new Error("Confirm your registration deposit before withdrawal.");
    }
    if (!profile.kyc_verified) {
      throw new Error("Complete KYC before withdrawal.");
    }
    if (!profile.bank_name || !profile.account_number) {
      throw new Error("Complete your bank details before withdrawal.");
    }

    // Verify PIN
    if (!profile.transaction_pin) {
      throw new Error("Please set a transaction PIN in your security settings first.");
    }
    if (!verifyTransactionPin(profile.transaction_pin, auth.user.id, pin)) {
      throw new Error("Incorrect transaction PIN.");
    }

    const { data: securitySettings, error: securitySettingsError } = await auth.supabase
      .from("user_security_settings")
      .select("wallet_frozen")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (securitySettingsError) throw new Error(securitySettingsError.message);
    if (securitySettings?.wallet_frozen) {
      throw new Error("Your wallet is frozen. Unfreeze it from Security Center before requesting withdrawals.");
    }

    // Block if there are outstanding borrower loans (excluding onboarding credit of 2000)
    const { data: activeLoans, error: activeLoansError } = await auth.supabase
      .from("loans")
      .select("amount, lender_id")
      .eq("borrower_id", auth.user.id)
      .eq("status", "active");

    if (activeLoansError) throw new Error(activeLoansError.message);

    const hasOutstandingLoan = (activeLoans || []).some(
      (loan) => !(Number(loan.amount) === 2000 && loan.lender_id === null)
    );

    if (hasOutstandingLoan) {
      throw new Error("You must repay all outstanding loans before you can withdraw your capital.");
    }

    const { data: wallet, error: walletError } = await auth.supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (walletError) throw new Error(walletError.message);
    if (!wallet) throw new Error("Wallet not found.");

    const { data: platformLoans, error: platformLoansError } = await auth.supabase
      .from("loans")
      .select("amount")
      .eq("borrower_id", auth.user.id)
      .is("lender_id", null)
      .eq("status", "active")
      .gte("amount", repeatPlatformLoanMinimum);

    if (platformLoansError) throw new Error(platformLoansError.message);

    const platformLoanDeposit = (platformLoans || []).reduce(
      (total, loan) => total + getPlatformLoanRetainedDeposit(Number(loan.amount)),
      0,
    );
    const requiredBalance = getRequiredWithdrawalBalance(amount, platformLoanDeposit);
    const balance = Number(wallet.balance || 0);

    if (balance < requiredBalance) {
      const shortfall = Math.max(0, requiredBalance - balance);
      if (platformLoanDeposit > 0) {
        throw new Error(
          `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain in your wallet after withdrawal and the ₦${withdrawalFeeAmount.toLocaleString()} processing fee.`,
        );
      }

      throw new Error(`Insufficient balance for the withdrawal and ₦${withdrawalFeeAmount.toLocaleString()} processing fee.`);
    }

    const { data: pendingRequest, error: pendingRequestError } = await auth.supabase
      .from("withdrawal_requests")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pendingRequestError) throw new Error(pendingRequestError.message);
    if (pendingRequest) {
      throw new Error("You already have a pending withdrawal request.");
    }

    const { error } = await auth.supabase
      .from("withdrawal_requests")
      .insert({
        user_id: auth.user.id,
        amount,
        fee_amount: withdrawalFeeAmount,
        bank_name: profile.bank_name,
        account_number: profile.account_number,
        status: "pending",
      });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    return errorResponse(error, "Unable to withdraw funds.");
  }
}
