import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { withTransaction } from "@/lib/railway/client";
import {
  readIdempotencyKey,
  replayIfDuplicate,
  rememberIdempotentResponse,
} from "@/lib/server/idempotency";
import {
  buildLedgerRef,
  recordWalletMove,
} from "@/lib/server/wallet-ledger";
import { getSecurityDeposit } from "@/lib/loans";

export async function POST(request: Request) {
  const route = "api/marketplace/accept";
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`marketplace-accept-ip:${clientIp}`, 100, 15 * 60_000))
      return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (
      await isRateLimited(
        `marketplace-accept-user:${auth.user.id}`,
        50,
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

    const body = await request.json();
    const itemId = String(body.itemId || "");
    if (!itemId) throw new Error("Marketplace listing is required.");

    const userId = auth.user.id;

    let createdLoanId: string | null = null;
    await withTransaction(async (client) => {
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
      if (item.status !== "active")
        throw new Error("This listing is no longer available.");
      if (item.author_id === userId)
        throw new Error("You cannot accept your own listing.");

      const { rows: profileRows } = await client.query<{
        kyc_verified: boolean;
        trust_score: number;
      }>(
        `SELECT kyc_verified, trust_score FROM profiles WHERE id = $1`,
        [userId],
      );
      const profile = profileRows[0];
      if (!profile?.kyc_verified)
        throw new Error("Complete KYC before participating in the marketplace.");

      const amount = Number(item.amount);
      const days = item.days;

      const isBorrower = item.type === "lending_offer";
      const borrowerId = isBorrower ? userId : item.author_id;
      const lenderId = isBorrower ? item.author_id : userId;
      const borrowerTrustScore = isBorrower
        ? profile.trust_score
        : item.trust_score;
      const securityDeposit = getSecurityDeposit(amount, borrowerTrustScore);

      const [first, second] = [borrowerId, lenderId].sort();
      await client.query(
        `SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [first],
      );
      if (first !== second) {
        await client.query(
          `SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`,
          [second],
        );
      }

      const { rows: lenderWalletRows } = await client.query<{
        balance: number;
      }>(`SELECT balance FROM wallets WHERE user_id = $1`, [lenderId]);
      if (
        !lenderWalletRows[0] ||
        Number(lenderWalletRows[0].balance) < amount
      ) {
        throw new Error("Insufficient lender balance to fund this loan.");
      }

      const { rows: borrowerWalletRows } = await client.query<{
        balance: number;
      }>(`SELECT balance FROM wallets WHERE user_id = $1`, [borrowerId]);
      if (
        !borrowerWalletRows[0] ||
        Number(borrowerWalletRows[0].balance) < securityDeposit
      ) {
        throw new Error(
          `Borrower needs ₦${securityDeposit.toLocaleString()} as a security deposit.`,
        );
      }

      await recordWalletMove(client, {
        userId: lenderId,
        txType: "debit",
        source: "loan",
        reference: buildLedgerRef("mp-lender-out", lenderId),
        description: `Funded peer loan of ₦${amount.toLocaleString()} via marketplace listing ${itemId}`,
        balanceDelta: -amount,
        metadata: {
          itemId,
          listingType: item.type,
          borrowerId,
          lenderId,
          amount,
          days,
          rate: item.rate,
        },
      });

      await recordWalletMove(client, {
        userId: borrowerId,
        txType: "credit",
        source: "loan",
        reference: buildLedgerRef("mp-borrower-in", borrowerId),
        description: `Peer loan of ₦${amount.toLocaleString()} for ${days} days from marketplace listing ${itemId}`,
        balanceDelta: amount,
        metadata: {
          itemId,
          listingType: item.type,
          borrowerId,
          lenderId,
          amount,
          days,
          rate: item.rate,
        },
      });

      await recordWalletMove(client, {
        userId: borrowerId,
        txType: "debit",
        source: "loan",
        reference: buildLedgerRef("mp-borrower-sd", borrowerId),
        description: `Security deposit locked for peer loan from listing ${itemId}`,
        balanceDelta: 0,
        lockedDelta: securityDeposit,
        metadata: {
          itemId,
          securityDeposit,
          loanAmount: amount,
          days,
        },
      });

      const startDate = new Date().toISOString();
      const dueDate = new Date(
        Date.now() + days * 86_400_000,
      ).toISOString();

      const { rows: loanRows } = await client.query<{ id: string }>(
        `INSERT INTO loans
           (borrower_id, lender_id, amount, rate, days, status, funding_source,
            security_deposit, start_date, due_date, marketplace_item_id, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', 'peer_lender', $6, $7, $8, $9, NOW())
         RETURNING id`,
        [
          borrowerId,
          lenderId,
          amount,
          item.rate,
          days,
          securityDeposit,
          startDate,
          dueDate,
          itemId,
        ],
      );
      createdLoanId = loanRows[0]?.id ?? null;

      await client.query(
        `UPDATE marketplace_items SET status = 'funded', updated_at = NOW() WHERE id = $1`,
        [itemId],
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, marketplace_item_id, loan_id, created_at)
         VALUES ($1, 'loan_disbursed', $2, $3, $4, $5, NOW())`,
        [
          borrowerId,
          amount,
          `Peer loan of ₦${amount.toLocaleString()} for ${days} days`,
          itemId,
          createdLoanId,
        ],
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, marketplace_item_id, loan_id, created_at)
         VALUES ($1, 'investment', $2, $3, $4, $5, NOW())`,
        [
          lenderId,
          amount,
          `Funded peer loan of ₦${amount.toLocaleString()}`,
          itemId,
          createdLoanId,
        ],
      );
    });

    const responseBody = { ok: true, loan_id: createdLoanId };
    await rememberIdempotentResponse(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
      status: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    return errorResponse(error, "Unable to accept listing.", route);
  }
}
