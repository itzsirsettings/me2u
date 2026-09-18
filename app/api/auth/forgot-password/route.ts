import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { createSignedOtpToken, generateOtpCode } from "@/lib/server/otp";
import { createOtp } from "@/lib/server/otp-db";
import { sendOtpEmail } from "@/lib/server/email";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { query } from "@/lib/railway/client";
import { requestMeta } from "@/lib/server/idempotency";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildBlindForgotResponse(email: string, token: string) {
  return NextResponse.json(
    { success: true, email, token },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const meta = requestMeta(request);
    const clientIp = getClientIp(request);

    if (await isRateLimited(`forgot-password:${clientIp}`, 5, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (await isRateLimited(`forgot-password-email:${email}`, 3, 15 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
      [email],
    );
    const accountExists = rows.length > 0;

    const code = generateOtpCode();
    const token = createSignedOtpToken({ email, code, purpose: "password_reset" });

    if (accountExists) {
      await createOtp(email, "password_reset", {
        code,
        ttlMs: 10 * 60_000,
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(() => undefined);
      await sendOtpEmail(email, code).catch(() => ({ success: false }));
    }

    return buildBlindForgotResponse(email, token);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
