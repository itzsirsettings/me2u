import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { createSignedOtpToken, generateOtpCode } from "@/lib/server/otp";
import { sendOtpEmail } from "@/lib/server/email";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { query } from "@/lib/railway/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`forgot-password:${clientIp}`, 5, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email)
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    if (!isValidEmail(email))
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    if (isRateLimited(`forgot-password-email:${email}`, 3, 15 * 60_000)) {
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

    const code = generateOtpCode();
    const token = createSignedOtpToken({ email, code, purpose: "password_reset" });

    const emailResult = await sendOtpEmail(email, code);
    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification email." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      email,
      token,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request." },
      { status: 500 },
    );
  }
}
