import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { getPlatformAccountDetails } from "@/lib/server/platform-account";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (auth.user.registrationDepositPaid) {
      return NextResponse.json(
        { error: "The registration deposit has already been approved." },
        { status: 410, headers: { "Cache-Control": "no-store" } },
      );
    }

    const account = getPlatformAccountDetails();
    if (!account) {
      return NextResponse.json(
        { error: "Registration payment details are temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json({ account }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "Unable to load registration payment details.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`registration-deposit-ip:${clientIp}`, 50, 15 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (auth.user.registrationDepositPaid) {
      throw new Error("Registration deposit is already confirmed.");
    }
    if (await isRateLimited(`registration-deposit-user:${auth.user.id}`, 20, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const reference = String(body.reference || "").trim();
    const receiptImageUrl = String(body.receiptImageUrl || "").trim();

    if (!receiptImageUrl) throw new Error("Proof of payment receipt is required.");
    if (reference.length < 4 || reference.length > 120)
      throw new Error("Enter a valid payment reference.");

    await auth.db.query(
      `INSERT INTO payment_proofs
         (user_id, amount, reference, receipt_image_url, type, status, created_at, updated_at)
       VALUES ($1, 2000, $2, $3, 'registration_deposit', 'pending', NOW(), NOW())`,
      [auth.user.id, reference, receiptImageUrl],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to confirm registration deposit.");
  }
}
