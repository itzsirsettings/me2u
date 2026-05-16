import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

function hasPlatformAccountDetails() {
  return Boolean(
    process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK?.trim() &&
      process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME?.trim() &&
      process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER?.trim(),
  );
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`wallet-fund-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    if (!hasPlatformAccountDetails()) {
      return NextResponse.json(
        { error: "Platform account details are not configured yet." },
        { status: 503 },
      );
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`wallet-fund-user:${auth.user.id}`, 10, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const amount = readPositiveAmount(body.amount);
    const reference = String(body.reference || "").trim();

    if (reference.length < 4 || reference.length > 120) {
      throw new Error("Enter a valid payment reference.");
    }

    const { error } = await auth.supabase.rpc("me2u_fund_wallet", {
      p_user_id: auth.user.id,
      p_amount: amount,
      p_reference: reference,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to fund wallet.");
  }
}
