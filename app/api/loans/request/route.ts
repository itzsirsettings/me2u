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
import {
  readIdempotencyKey,
  replayIfDuplicate,
  rememberIdempotentResponse,
} from "@/lib/server/idempotency";
import {
  buildLedgerRef,
  recordWalletMove,
} from "@/lib/server/wallet-ledger";

export async function POST(request: Request) {
  const route = "api/loans/request";
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`loan-request-ip:${clientIp}`, 50, 15 * 60_000))
      return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (
      await isRateLimited(
        `loan-request-user:${auth.user.id}`,
        20,
        60 * 60_000,
      )
    )
      return tooManyRequestsResponse();

    const idempotencyKey = readIdempotencyKey(request);
    const duplicate = await replayIfDuplicate(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
    });
    if (duplicate) return duplicate;

    const body = await request.json().catch(() => ({}));
    const amount =
      body.amount === undefined ||
      body.amount === null ||
      body.amount === ""
        ? repeatPlatformLoanMinimum
        : readPositiveAmount(body.amount, "Loan amount");
    const requestedDays = body.days ? Number(body.days) : 14;

    const userId = auth.user.id;

    let loanResult: { loanId: string | null } = { loanId: null };
    await withUserTransaction(userId, async (client) => {
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
      if (!profile.kyc_verified)
        throw new Error("Complete KYC before requesting a loan.");
      if (!profile.registration_deposit_paid)
        throw new Error("Pay your registration deposit first.");

      const { rows: activeLoans } = await client.query(
        `SELECT id FROM loans WHERE borrower_id = $1 AND lender_id IS NULL AND status = 'active' LIMIT 1`,
        [userId],
      );
      if (activeLoans.length > 0)
        throw new Error("Repay your active loan before requesting another one.");

      if (amount < repeatPlatformLoanMinimum) {
        throw new Error(
          `Loans start from ₦${repeatPlatformLoanMinimum.toLocaleString()}.`,
        );
      }

      const maxDays = getMaxLoanDuration(profile.trust_score);
      const days = Math.min(requestedDays, maxDays);
      const securityDeposit = getSecurityDeposit(amount, profile.trust_score);

      await recordWalletMove(client, {
        userId,
        txType: "debit",
        source: "loan",
        reference: buildLedgerRef("loan-sd-lock", userId),
        description: `Security deposit locked for platform loan of ₦${amount.toLocaleString()}`,
        balanceDelta: 0,
        lockedDelta: securityDeposit,
        metadata: {
          securityDeposit,
          loanAmount: amount,
          days,
          trustScore: profile.trust_score,
        },
      });

      await recordWalletMove(client, {
        userId,
        txType: "credit",
        source: "loan",
        reference: buildLedgerRef("loan-disburse", userId),
        description: `Platform loan of ₦${amount.toLocaleString()} for ${days} days`,
        balanceDelta: amount,
        metadata: {
          securityDeposit,
          loanAmount: amount,
          days,
          trustScore: profile.trust_score,
        },
      });

      const startDate = new Date().toISOString();
      const dueDate = new Date(
        Date.now() + days * 86_400_000,
      ).toISOString();

      const { rows: loanRows } = await client.query<{ id: string }>(
        `INSERT INTO loans
           (borrower_id, lender_id, amount, rate, days, status, funding_source,
            security_deposit, start_date, due_date, created_at)
         VALUES ($1, NULL, $2, 0, $3, 'active', 'me2u_balance_sheet', $4, $5, $6, NOW())
         RETURNING id`,
        [userId, amount, days, securityDeposit, startDate, dueDate],
      );
      loanResult.loanId = loanRows[0]?.id ?? null;

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, loan_id, created_at)
         VALUES ($1, 'loan_disbursed', $2, $3, $4, NOW())`,
        [
          userId,
          amount,
          `Platform loan of ₦${amount.toLocaleString()} for ${days} days`,
          loanResult.loanId,
        ],
      );
    });

    const responseBody = { ok: true, loan_id: loanResult.loanId };
    await rememberIdempotentResponse(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
      status: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    return errorResponse(error, "Unable to request loan.", route);
  }
}
