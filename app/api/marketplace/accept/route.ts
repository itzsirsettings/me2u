import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`marketplace-accept-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`marketplace-accept-user:${auth.user.id}`, 12, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const itemId = String(body.itemId || "");

    if (!itemId) {
      throw new Error("Marketplace listing is required.");
    }

    const { error } = await auth.supabase.rpc("me2u_accept_marketplace_item", {
      p_user_id: auth.user.id,
      p_item_id: itemId,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to accept listing.");
  }
}
