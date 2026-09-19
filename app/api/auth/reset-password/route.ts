import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  createSignedFlowToken,
  verifySignedFlowToken,
  verifySignedOtpToken,
} from "@/lib/server/otp";
import { consumeOtpAttempt } from "@/lib/server/otp-db";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { hashPassword, revokeAllSessionsForUser } from "@/lib/railway/auth";
import { query, withTransaction } from "@/lib/railway/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    if (await isRateLimited(`reset-password:${clientIp}`, 10, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const mode = String(body.mode || "reset").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const token = String(body.token || "").trim();
    const resetToken = String(body.resetToken || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (await isRateLimited(`reset-password-email:${email}`, 5, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
      [email],
    );
    const userExists = rows.length > 0;
    const userId = rows[0]?.id;

    if (mode === "verify_code") {
      if (!code || !token) {
        return NextResponse.json(
          { error: "Verification code and token are required." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const signedOk = verifySignedOtpToken({ email, code, token, purpose: "password_reset" });
      const consumeResult = userId
        ? await consumeOtpAttempt(email, "password_reset", code)
        : { outcome: "not_found" as const, attempts: 0, remaining: 0 };
      const dbOk = consumeResult.outcome === "ok";

      if (!signedOk || !dbOk || !userExists) {
        return NextResponse.json(
          { error: "Invalid or expired verification code." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      return NextResponse.json(
        {
          success: true,
          resetToken: createSignedFlowToken({ email, purpose: "password_reset_complete" }),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!resetToken || !verifySignedFlowToken({ email, token: resetToken, purpose: "password_reset_complete" })) {
      return NextResponse.json(
        { error: "Password reset verification has expired. Request a new code." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!userExists || !userId) {
      return NextResponse.json(
        { error: "Password reset verification has expired. Request a new code." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE auth_users SET password_hash = $1 WHERE id = $2`,
        [passwordHash, userId],
      );
      await client.query(
        `UPDATE profiles
            SET password_changed_at = NOW(),
                account_locked = false,
                failed_pin_attempts = 0,
                last_pin_attempt_at = NULL,
                updated_at = NOW()
          WHERE id = $1`,
        [userId],
      );
    });

    revokeAllSessionsForUser(userId, false).catch(() => undefined);

    return NextResponse.json(
      { success: true, message: "Password has been reset successfully." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset password." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
