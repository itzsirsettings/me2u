import { NextResponse } from "next/server";

import { getUserByEmail, verifyPassword } from "@/lib/railway/auth";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { createTransactionPinVerifier, clearPinLockout } from "@/lib/server/pin";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`security-pin-ip:${clientIp}`, 50, 15 * 60_000))
      return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`security-pin-user:${auth.user.id}`, 20, 60 * 60_000))
      return tooManyRequestsResponse();

    const body = (await request.json()) as {
      pin?: unknown;
      password?: unknown;
      unlockLockout?: unknown;
    };
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const unlockLockout = Boolean(body.unlockLockout);

    if (!/^\d{4}$/.test(pin)) throw new Error("Transaction PIN must be a 4-digit number.");
    if (!password)
      throw new Error("Password is required to change or reset your transaction PIN.");

    // Verify password against Railway auth_users table
    const account = await getUserByEmail(auth.user.email);
    if (!account) throw new Error("Account not found.");

    if (await isRateLimited(`pin-pw-verify:${auth.user.id}`, 10, 10 * 60_000))
      return tooManyRequestsResponse();

    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) {
      if (await isRateLimited(`pin-pw-fail:${auth.user.id}`, 5, 15 * 60_000)) {
        return tooManyRequestsResponse("Too many failed password attempts. Try again later.");
      }
      throw new Error("Incorrect password. Please verify and try again.");
    }

    // If the user explicitly requests a lockout clear (post password-reset flow via UI),
    // clear counters so the new PIN is immediately usable.
    if (unlockLockout) {
      await clearPinLockout(auth.user.id, {
        reason: "self-service after password-verified PIN reset",
      });
    }

    await auth.db.query(
      `UPDATE profiles SET transaction_pin = $1, failed_pin_attempts = 0, updated_at = NOW() WHERE id = $2`,
      [createTransactionPinVerifier(auth.user.id, pin), auth.user.id],
    );

    // Session revocation is intentionally NOT performed here. The user must
    // choose an option from the post-save prompt (see /api/security/sessions/*
    // routes) so that setting a PIN never signs the active user out.
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "Unable to set transaction PIN.", "api/security/pin");
  }
}
