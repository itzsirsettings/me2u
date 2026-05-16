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
    if (isRateLimited(`registration-deposit-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`registration-deposit-user:${auth.user.id}`, 6, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const reference = String(body.reference || "").trim();

    if (reference.length < 4 || reference.length > 120) {
      throw new Error("Enter a valid payment reference.");
    }

    const { error } = await auth.supabase.rpc("lendpeer_confirm_registration_deposit", {
      p_user_id: auth.user.id,
      p_reference: reference,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to confirm registration deposit.");
  }
}
