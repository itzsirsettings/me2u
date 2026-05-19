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
import type { MarketplaceRow } from "@/lib/supabase/types";

const listingTypes = new Set<MarketplaceRow["type"]>(["borrow_request", "lending_offer"]);

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`marketplace-create-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`marketplace-create-user:${auth.user.id}`, 12, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const type = String(body.type || "") as MarketplaceRow["type"];
    const amount = readPositiveAmount(body.amount);
    const rate = 0;
    const days = Number(body.days);
    const boost = Boolean(body.boost);

    if (!listingTypes.has(type)) {
      throw new Error("Choose a valid listing type.");
    }

    if (!Number.isInteger(days) || days < loanDurationMinDays || days > loanDurationMaxDays) {
      throw new Error(`Duration must be between ${loanDurationMinDays} and ${loanDurationMaxDays} days.`);
    }

    if (boost && type !== "borrow_request") {
      throw new Error(`Only borrow requests can be promoted. The boost fee is ₦${marketplaceBoostFeeAmount.toLocaleString()}.`);
    }

    const { error } = await auth.supabase.rpc("me2u_create_marketplace_item", {
      p_user_id: auth.user.id,
      p_type: type,
      p_amount: amount,
      p_rate: rate,
      p_days: days,
      p_boost: boost,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to create listing.");
  }
}
