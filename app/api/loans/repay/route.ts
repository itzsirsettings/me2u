import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { withUserTransaction } from "@/lib/railway/client";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`loan-repay-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`loan-repay-user:${auth.user.id}`, 12, 60_000)) return tooManyRequestsResponse();

    const body = await request.json();
    const loanId = String(body.loanId || "");
    if (!loanId) throw new Error("Loan is required.");

    const userId = auth.user.id;

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
      if (loan.borrower_id !== userId) throw new Error("This loan cannot be repaid from this account.");
      if (loan.status === "completed") throw new Error("This loan has already been repaid.");

      const repaymentAmount = Number(loan.amount) + (Number(loan.amount) * Number(loan.rate)) / 100;
      const securityDeposit = Number(loan.security_deposit || 0);

      // Check borrower wallet
      const { rows: walletRows } = await client.query<{ balance: number; locked: number }>(
        `SELECT balance, locked FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      const wallet = walletRows[0];
      if (!wallet) throw new Error("Wallet not found.");
      if (Number(wallet.balance) < repaymentAmount) {
        throw new Error("Insufficient balance to repay this loan.");
      }

      // Deduct repayment from borrower
      await client.query(
        `UPDATE wallets
         SET balance = balance - $1,
             locked  = GREATEST(0, locked - $2),
             updated_at = NOW()
         WHERE user_id = $3`,
        [repaymentAmount, securityDeposit, userId],
      );

      // If peer loan, credit lender
      if (loan.lender_id) {
        await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [repaymentAmount, loan.lender_id],
        );
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'repayment_received', $2, $3, NOW())`,
          [loan.lender_id, repaymentAmount, `Repayment received for loan ${loanId}`],
        );
      }

      // Mark loan complete
      await client.query(
        `UPDATE loans SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [loanId],
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, created_at)
         VALUES ($1, 'loan_repayment', $2, $3, NOW())`,
        [userId, repaymentAmount, `Loan repayment of ₦${repaymentAmount.toLocaleString()}`],
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to repay loan.");
  }
}
