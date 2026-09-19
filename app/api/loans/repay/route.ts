import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { withUserTransaction } from "@/lib/railway/client";
import {
  readIdempotencyKey,
  replayIfDuplicate,
  rememberIdempotentResponse,
} from "@/lib/server/idempotency";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";

export async function POST(request: Request) {
  const route = "api/loans/repay";
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`loan-repay-ip:${clientIp}`, 100, 15 * 60_000))
      return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`loan-repay-user:${auth.user.id}`, 50, 60 * 60_000))
      return tooManyRequestsResponse();

    const idempotencyKey = readIdempotencyKey(request);
    const duplicate = await replayIfDuplicate(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
    });
    if (duplicate) return duplicate;

    const body = await request.json();
    const loanId = String(body.loanId || "");
    if (!loanId) throw new Error("Loan is required.");

    const userId = auth.user.id;

    let repaymentAmountUsed = 0;
    let lenderIdUsed: string | null = null;
    await withUserTransaction(userId, async (client) => {
      const { rows: loanRows } = await client.query<{
        id: string;
        amount: number;
        rate: number;
        status: string;
        borrower_id: string;
        lender_id: string | null;
        security_deposit: number;
      }>(
        `SELECT id, amount, rate, status, borrower_id, lender_id, security_deposit
         FROM loans WHERE id = $1 FOR UPDATE`,
        [loanId],
      );

      const loan = loanRows[0];
      if (!loan) throw new Error("Loan not found.");
      if (loan.borrower_id !== userId)
        throw new Error("This loan cannot be repaid from this account.");
      if (loan.status === "completed") throw new Error("This loan has already been repaid.");

      const repaymentAmount =
        Number(loan.amount) + (Number(loan.amount) * Number(loan.rate)) / 100;
      repaymentAmountUsed = repaymentAmount;
      const securityDeposit = Number(loan.security_deposit || 0);
      lenderIdUsed = loan.lender_id;

      await recordWalletMove(client, {
        userId,
        txType: "debit",
        source: "repayment",
        reference: buildLedgerRef("loan-repay", loanId),
        description: `Loan repayment of ₦${repaymentAmount.toLocaleString()} (security deposit ₦${securityDeposit.toLocaleString()} released)`,
        balanceDelta: -repaymentAmount,
        lockedDelta: -securityDeposit,
        metadata: {
          loanId,
          loanAmount: Number(loan.amount),
          rate: Number(loan.rate),
          repaymentAmount,
          securityDepositReleased: securityDeposit,
        },
      });

      if (loan.lender_id) {
        await recordWalletMove(client, {
          userId: loan.lender_id,
          txType: "credit",
          source: "repayment",
          reference: buildLedgerRef("loan-repay-lender", loanId),
          description: `Repayment received for loan ${loanId}`,
          balanceDelta: repaymentAmount,
          metadata: {
            loanId,
            borrowerId: userId,
            loanAmount: Number(loan.amount),
            repaymentAmount,
          },
        });

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, loan_id, created_at)
           VALUES ($1, 'repayment_received', $2, $3, $4, NOW())`,
          [loan.lender_id, repaymentAmount, `Repayment received for loan ${loanId}`, loanId],
        );
      }

      await client.query(
        `UPDATE loans SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [loanId],
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, loan_id, created_at)
         VALUES ($1, 'loan_repayment', $2, $3, $4, NOW())`,
        [
          userId,
          repaymentAmount,
          `Loan repayment of ₦${repaymentAmount.toLocaleString()}`,
          loanId,
        ],
      );
    });

    const responseBody = {
      ok: true,
      repayment_amount: repaymentAmountUsed,
      lender_paid: lenderIdUsed !== null,
    };
    await rememberIdempotentResponse(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
      status: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    return errorResponse(error, "Unable to repay loan.", route);
  }
}
