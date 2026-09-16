import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import {
  repeatPlatformLoanMinimum,
  getSecurityDeposit,
  getMaxLoanDuration,
} from "@/lib/loans";
import { withUserTransaction } from "@/lib/railway/client";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`loan-request-ip:${clientIp}`, 20, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`loan-request-user:${auth.user.id}`, 6, 60_000)) return tooManyRequestsResponse();

    const body = await request.json().catch(() => ({}));
    const amount =
      body.amount === undefined || body.amount === null || body.amount === ""
        ? repeatPlatformLoanMinimum
        : readPositiveAmount(body.amount, "Loan amount");
    const requestedDays = body.days ? Number(body.days) : 14;

    const userId = auth.user.id;

    await withUserTransaction(userId, async (client) => {
      // Validate profile
      const { rows: profileRows } = await client.query<{
        kyc_verified: boolean;
        registration_deposit_paid: boolean;
        trust_score: number;
      }>(
        `SELECT kyc_verified, registration_deposit_paid, trust_score FROM profiles WHERE id = $1`,
        [userId],
      );
      const profile = profileRows[0];
      if (!profile) throw new Error("Profile not found.");
      if (!profile.kyc_verified) throw new Error("Complete KYC before requesting a loan.");
      if (!profile.registration_deposit_paid) throw new Error("Pay your registration deposit first.");

      // Check no active platform loan
      const { rows: activeLoans } = await client.query(
        `SELECT id FROM loans WHERE borrower_id = $1 AND lender_id IS NULL AND status = 'active' LIMIT 1`,
        [userId],
      );
      if (activeLoans.length > 0) throw new Error("Repay your active loan before requesting another one.");

      if (amount < repeatPlatformLoanMinimum) {
        throw new Error(`Loans start from ₦${repeatPlatformLoanMinimum.toLocaleString()}.`);
      }

      const maxDays = getMaxLoanDuration(profile.trust_score);
      const days = Math.min(requestedDays, maxDays);
      const securityDeposit = getSecurityDeposit(amount, profile.trust_score);

      // Validate wallet balance covers security deposit
      const { rows: walletRows } = await client.query<{ balance: number; locked: number }>(
        `SELECT balance, locked FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      const wallet = walletRows[0];
      if (!wallet) throw new Error("Wallet not found.");
      if (Number(wallet.balance) < securityDeposit) {
        throw new Error(
          `Fund ₦${(securityDeposit - Number(wallet.balance)).toLocaleString()} first. The security deposit must stay in your wallet.`,
        );
      }

      // Lock security deposit in wallet
      await client.query(
        `UPDATE wallets SET locked = locked + $1, updated_at = NOW() WHERE user_id = $2`,
        [securityDeposit, userId],
      );

      // Credit loan amount
      await client.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [amount, userId],
      );

      const startDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + days * 86_400_000).toISOString();

      await client.query(
        `INSERT INTO loans
           (borrower_id, lender_id, amount, rate, days, status, funding_source,
            security_deposit, start_date, due_date, created_at)
         VALUES ($1, NULL, $2, 0, $3, 'active', 'me2u_balance_sheet', $4, $5, $6, NOW())`,
        [userId, amount, days, securityDeposit, startDate, dueDate],
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, created_at)
         VALUES ($1, 'loan_disbursed', $2, $3, NOW())`,
        [userId, amount, `Platform loan of ₦${amount.toLocaleString()} for ${days} days`],
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to request loan.");
  }
}
