import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`loan-request-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`loan-request-user:${auth.user.id}`, 6, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json().catch(() => ({}));
    const amount =
      body.amount === undefined || body.amount === null || body.amount === ""
        ? null
        : readPositiveAmount(body.amount, "Loan amount");
    const days = body.days ? Number(body.days) : null;

    const { error } = await auth.supabase.rpc("me2u_request_platform_loan", {
      p_user_id: auth.user.id,
      p_amount: amount,
      p_days: days,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to request loan.");
  }
}
