import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { loanDurationMaxDays, loanDurationMinDays } from "@/lib/loans";
import { marketplaceBoostFeeAmount } from "@/lib/revenue";
import { withUserTransaction } from "@/lib/railway/client";
import {
  readIdempotencyKey,
  replayIfDuplicate,
  rememberIdempotentResponse,
} from "@/lib/server/idempotency";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";

const listingTypes = new Set(["borrow_request", "lending_offer"]);

export async function POST(request: Request) {
  const route = "api/marketplace/create";
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`marketplace-create-ip:${clientIp}`, 100, 15 * 60_000))
      return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`marketplace-create-user:${auth.user.id}`, 50, 60 * 60_000))
      return tooManyRequestsResponse();

    const idempotencyKey = readIdempotencyKey(request);
    const duplicate = await replayIfDuplicate(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
    });
    if (duplicate) return duplicate;

    const body = await request.json();
    const type = String(body.type || "");
    const amount = readPositiveAmount(body.amount);
    const days = Number(body.days);
    const boost = Boolean(body.boost);

    if (!listingTypes.has(type)) throw new Error("Choose a valid listing type.");
    if (!Number.isInteger(days) || days < loanDurationMinDays || days > loanDurationMaxDays) {
      throw new Error(
        `Duration must be between ${loanDurationMinDays} and ${loanDurationMaxDays} days.`,
      );
    }
    if (boost && type !== "borrow_request") {
      throw new Error(
        `Only borrow requests can be promoted. The boost fee is ₦${marketplaceBoostFeeAmount.toLocaleString()}.`,
      );
    }

    const userId = auth.user.id;
    // Mint the listing id up front so the boost fee ledger entry below carries a
    // deterministic reference for this specific listing.
    const itemId = randomUUID();

    let itemCreatedId: string | null = null;
    await withUserTransaction(userId, async (client) => {
      const { rows: profileRows } = await client.query<{
        kyc_verified: boolean;
        first_name: string;
        trust_score: number;
      }>(`SELECT kyc_verified, first_name, trust_score FROM profiles WHERE id = $1`, [userId]);
      const profile = profileRows[0];
      if (!profile) throw new Error("Profile not found.");
      if (!profile.kyc_verified) throw new Error("Complete KYC before posting a listing.");

      let boostedAt: string | null = null;
      let boostedUntil: string | null = null;
      let boostFeeAmount = 0;

      if (boost) {
        await recordWalletMove(client, {
          userId,
          txType: "debit",
          source: "admin_adjustment",
          reference: buildLedgerRef("mp-boost", itemId),
          description: `Marketplace listing boost fee`,
          balanceDelta: -marketplaceBoostFeeAmount,
          metadata: {
            fee: marketplaceBoostFeeAmount,
            listingType: type,
            amount,
            days,
          },
        });

        const now = new Date();
        boostedAt = now.toISOString();
        boostedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        boostFeeAmount = marketplaceBoostFeeAmount;

        await client.query(
          `INSERT INTO revenue_events (type, amount, user_id, description, created_at)
           VALUES ('marketplace_boost', $1, $2, 'Marketplace boost fee', NOW())`,
          [marketplaceBoostFeeAmount, userId],
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'withdrawal', $2, 'Marketplace listing boost fee', NOW())`,
          [userId, marketplaceBoostFeeAmount],
        );
      }

      const { rows: itemRows } = await client.query<{ id: string }>(
        `INSERT INTO marketplace_items
           (id, type, amount, rate, days, author_id, author_name, trust_score,
            status, boosted_at, boosted_until, boost_fee_amount, created_at)
         VALUES ($1, $2, $3, 0, $4, $5, $6, $7, 'active', $8, $9, $10, NOW())
         RETURNING id`,
        [
          itemId,
          type,
          amount,
          days,
          userId,
          profile.first_name,
          profile.trust_score,
          boostedAt,
          boostedUntil,
          boostFeeAmount,
        ],
      );
      itemCreatedId = itemRows[0]?.id ?? null;
    });

    const responseBody = { ok: true, item_id: itemCreatedId };
    await rememberIdempotentResponse(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
      status: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    return errorResponse(error, "Unable to create listing.", route);
  }
}
