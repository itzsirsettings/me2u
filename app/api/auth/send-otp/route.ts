import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { createOtp, getCurrentOtp } from "@/lib/server/in-app-otp";
import { query } from "@/lib/railway/client";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`send-otp-ip:${clientIp}`, 10, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const action = String(body.action || "register").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (action !== "login" && action !== "register") {
      return NextResponse.json({ error: "Unsupported verification action." }, { status: 400 });
    }

    const purpose = action === "login" ? "login" : "register";

    if (isRateLimited(`send-otp-email:${action}:${email}`, 3, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many verification attempts for this email. Please wait and try again." },
        { status: 429 },
      );
    }

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
      [email],
    );
    const exists = rows.length > 0;

    if (action === "login" && !exists) {
      return NextResponse.json(
        { error: "No account found with this email. Please register first." },
        { status: 404 },
      );
    }
    if (action === "register" && exists) {
      return NextResponse.json(
        { error: "Email is already registered. Please login instead." },
        { status: 409 },
      );
    }

    // Create OTP in database (no external service needed!)
    const { code, expiresAt } = await createOtp(email, purpose);

    return NextResponse.json({
      success: true,
      email,
      code, // Return code directly - will be displayed in UI
      expiresAt: expiresAt.toISOString(),
      message: "Verification code generated. Enter the code shown above.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate verification code." },
      { status: 500 },
    );
  }
}
