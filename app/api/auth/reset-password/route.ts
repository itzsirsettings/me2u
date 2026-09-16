import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  createSignedFlowToken,
  verifySignedFlowToken,
  verifySignedOtpToken,
} from "@/lib/server/otp";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { hashPassword } from "@/lib/railway/auth";
import { query } from "@/lib/railway/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`reset-password:${clientIp}`, 5, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const mode = String(body.mode || "reset").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const token = String(body.token || "").trim();
    const resetToken = String(body.resetToken || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    if (isRateLimited(`reset-password-email:${email}`, 3, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts for this email. Please wait and try again." },
        { status: 429 },
      );
    }

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 },
      );
    }

    const userId = rows[0].id;

    if (mode === "verify_code") {
      if (!code || !token) {
        return NextResponse.json(
          { error: "Verification code and token are required." },
          { status: 400 },
        );
      }
      if (!verifySignedOtpToken({ email, code, token, purpose: "password_reset" })) {
        return NextResponse.json(
          { error: "Invalid or expired verification code." },
          { status: 400 },
        );
      }
      return NextResponse.json({
        success: true,
        resetToken: createSignedFlowToken({ email, purpose: "password_reset_complete" }),
      });
    }

    if (!resetToken || !verifySignedFlowToken({ email, token: resetToken, purpose: "password_reset_complete" })) {
      return NextResponse.json(
        { error: "Password reset verification has expired. Request a new code." },
        { status: 400 },
      );
    }

    if (!newPassword) return NextResponse.json({ error: "New password is required." }, { status: 400 });
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await query(
      `UPDATE auth_users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, userId],
    );

    return NextResponse.json({ success: true, message: "Password has been reset successfully." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset password." },
      { status: 500 },
    );
  }
}
