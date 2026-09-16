import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { createTransactionPinVerifier } from "@/lib/server/pin";
import { getUserByEmail, verifyPassword } from "@/lib/railway/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`security-pin-ip:${clientIp}`, 20, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`security-pin-user:${auth.user.id}`, 10, 60_000)) return tooManyRequestsResponse();

    const body = await request.json();
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!/^\d{4}$/.test(pin)) throw new Error("Transaction PIN must be a 4-digit number.");
    if (!password) throw new Error("Password is required to change or reset your transaction PIN.");

    // Verify password against Railway auth_users table
    const account = await getUserByEmail(auth.user.email!);
    if (!account) throw new Error("Account not found.");

    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) throw new Error("Incorrect password. Please verify and try again.");

    await auth.db.query(
      `UPDATE profiles SET transaction_pin = $1, updated_at = NOW() WHERE id = $2`,
      [createTransactionPinVerifier(auth.user.id, pin), auth.user.id],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to set transaction PIN.");
  }
}
