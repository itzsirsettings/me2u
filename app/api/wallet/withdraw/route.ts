import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { getPlatformLoanRetainedDeposit, repeatPlatformLoanMinimum } from "@/lib/loans";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";

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

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("registration_deposit_paid, kyc_verified")
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
          `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain in your wallet after withdrawal.`,
        );
      }

      throw new Error("Insufficient balance.");
    }

    const { error } = await auth.supabase.rpc("me2u_withdraw_wallet", {
      p_user_id: auth.user.id,
      p_amount: amount,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to withdraw funds.");
  }
}
