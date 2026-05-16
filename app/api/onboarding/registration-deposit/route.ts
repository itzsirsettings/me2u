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
    const receiptImageUrl = String(body.receiptImageUrl || "").trim();

    if (!receiptImageUrl) {
      throw new Error("Proof of payment receipt is required.");
    }

    if (reference.length < 4 || reference.length > 120) {
      throw new Error("Enter a valid payment reference.");
    }

    const { error } = await auth.supabase
      .from("payment_proofs")
      .insert({
        user_id: auth.user.id,
        amount: 1000, // Registration deposit is fixed at 1000
        reference: reference,
        receipt_image_url: receiptImageUrl,
        type: "registration_deposit",
        status: "pending",
      });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to confirm registration deposit.");
  }
}
