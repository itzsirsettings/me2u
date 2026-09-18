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

const listingTypes = new Set(["borrow_request", "lending_offer"]);

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`marketplace-create-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`marketplace-create-user:${auth.user.id}`, 12, 60_000)) return tooManyRequestsResponse();

    const body = await request.json();
    const type = String(body.type || "");
    const amount = readPositiveAmount(body.amount);
    const days = Number(body.days);
    const boost = Boolean(body.boost);

    if (!listingTypes.has(type)) throw new Error("Choose a valid listing type.");
    if (!Number.isInteger(days) || days < loanDurationMinDays || days > loanDurationMaxDays) {
      throw new Error(`Duration must be between ${loanDurationMinDays} and ${loanDurationMaxDays} days.`);
    }
    if (boost && type !== "borrow_request") {
      throw new Error(`Only borrow requests can be promoted. The boost fee is ₦${marketplaceBoostFeeAmount.toLocaleString()}.`);
    }

    const userId = auth.user.id;

    await withUserTransaction(userId, async (client) => {
      const { rows: profileRows } = await client.query<{
        kyc_verified: boolean;
        first_name: string;
        trust_score: number;
      }>(
        `SELECT kyc_verified, first_name, trust_score FROM profiles WHERE id = $1`,
        [userId],
      );
      const profile = profileRows[0];
      if (!profile) throw new Error("Profile not found.");
      if (!profile.kyc_verified) throw new Error("Complete KYC before posting a listing.");

            let boostedAt: string | null = null;
      let boostedUntil: string | null = null;
      let boostFeeAmount = 0;

      // When calling me2u_create_marketplace_item, p_boost: boost controls visibility promotion
      if (boost) {
        // Deduct boost fee atomically
        const { rows: wRows } = await client.query(
          `UPDATE wallets
           SET balance = balance - $1, updated_at = NOW()
           WHERE user_id = $2 AND balance >= $1
           RETURNING balance`,
          [marketplaceBoostFeeAmount, userId],
        );
        if (!wRows[0]) {
          throw new Error(`Insufficient balance for the ₦${marketplaceBoostFeeAmount.toLocaleString()} boost fee.`);
        }

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

      await client.query(
        `INSERT INTO marketplace_items
           (type, amount, rate, days, author_id, author_name, trust_score,
            status, boosted_at, boosted_until, boost_fee_amount, created_at)
         VALUES ($1, $2, 0, $3, $4, $5, $6, 'active', $7, $8, $9, NOW())`,
        [
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
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to create listing.");
  }
}
