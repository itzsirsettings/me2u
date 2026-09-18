import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { withUserTransaction } from "@/lib/railway/client";
import { getSecurityDeposit } from "@/lib/loans";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`marketplace-accept-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`marketplace-accept-user:${auth.user.id}`, 12, 60_000)) return tooManyRequestsResponse();

    const body = await request.json();
    const itemId = String(body.itemId || "");
    if (!itemId) throw new Error("Marketplace listing is required.");

    const userId = auth.user.id;

    await withUserTransaction(userId, async (client) => {
      // Lock item row
      const { rows: itemRows } = await client.query<{
        id: string;
        type: string;
        amount: number;
        rate: number;
        days: number;
        author_id: string;
        status: string;
        trust_score: number;
      }>(
        `SELECT id, type, amount, rate, days, author_id, status, trust_score
         FROM marketplace_items WHERE id = $1 FOR UPDATE`,
        [itemId],
      );
      const item = itemRows[0];
      if (!item) throw new Error("Listing not found.");
      if (item.status !== "active") throw new Error("This listing is no longer available.");
      if (item.author_id === userId) throw new Error("You cannot accept your own listing.");

      const { rows: profileRows } = await client.query<{
        kyc_verified: boolean;
        trust_score: number;
      }>(
        `SELECT kyc_verified, trust_score FROM profiles WHERE id = $1`,
        [userId],
      );
      const profile = profileRows[0];
      if (!profile?.kyc_verified) throw new Error("Complete KYC before participating in the marketplace.");

      const amount = Number(item.amount);
      const days = item.days;

      // Determine roles
      const isBorrower = item.type === "lending_offer"; // acceptor borrows from lender's offer
      const borrowerId = isBorrower ? userId : item.author_id;
      const lenderId = isBorrower ? item.author_id : userId;
      const borrowerTrustScore = isBorrower ? profile.trust_score : item.trust_score;
      const securityDeposit = getSecurityDeposit(amount, borrowerTrustScore);

      // Lock both wallets (consistent order by id to avoid deadlock)
      const [first, second] = [borrowerId, lenderId].sort();
      await client.query(`SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`, [first]);
      if (first !== second) {
        await client.query(`SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`, [second]);
      }

      // Check lender has funds
      const { rows: lenderWalletRows } = await client.query<{ balance: number }>(
        `SELECT balance FROM wallets WHERE user_id = $1`,
        [lenderId],
      );
      if (!lenderWalletRows[0] || Number(lenderWalletRows[0].balance) < amount) {
        throw new Error("Insufficient lender balance to fund this loan.");
      }

      // Check borrower has security deposit
      const { rows: borrowerWalletRows } = await client.query<{ balance: number }>(
        `SELECT balance FROM wallets WHERE user_id = $1`,
        [borrowerId],
      );
      if (!borrowerWalletRows[0] || Number(borrowerWalletRows[0].balance) < securityDeposit) {
        throw new Error(
          `Borrower needs ₦${securityDeposit.toLocaleString()} as a security deposit.`,
        );
      }

      // Deduct from lender, credit borrower
      await client.query(
        `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`,
        [amount, lenderId],
      );
      await client.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [amount, borrowerId],
      );

      // Lock borrower security deposit
      await client.query(
        `UPDATE wallets SET locked = locked + $1, updated_at = NOW() WHERE user_id = $2`,
        [securityDeposit, borrowerId],
      );

      const startDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + days * 86_400_000).toISOString();

      await client.query(
        `INSERT INTO loans
           (borrower_id, lender_id, amount, rate, days, status, funding_source,
            security_deposit, start_date, due_date, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', 'peer_lender', $6, $7, $8, NOW())`,
        [borrowerId, lenderId, amount, item.rate, days, securityDeposit, startDate, dueDate],
      );

      // Mark item funded
      await client.query(
        `UPDATE marketplace_items SET status = 'funded', updated_at = NOW() WHERE id = $1`,
        [itemId],
      );

      // Transaction records
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, created_at)
         VALUES ($1, 'loan_disbursed', $2, $3, NOW())`,
        [borrowerId, amount, `Peer loan of ₦${amount.toLocaleString()} for ${days} days`],
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, created_at)
         VALUES ($1, 'investment', $2, $3, NOW())`,
        [lenderId, amount, `Funded peer loan of ₦${amount.toLocaleString()}`],
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to accept listing.");
  }
}
