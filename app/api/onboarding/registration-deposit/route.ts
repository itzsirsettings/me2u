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

    if (!receiptImageUrl) throw new Error("Proof of payment receipt is required.");
    if (reference.length < 4 || reference.length > 120) throw new Error("Enter a valid payment reference.");

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
