import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { createSignedFlowToken, verifySignedOtpToken } from "@/lib/server/otp";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`verify-otp-ip:${clientIp}`, 20, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const token = String(body.token || "").trim();
    const action = String(body.action || "register").trim().toLowerCase();

    if (!email || !code || !token) {
      return NextResponse.json({ error: "Email, code, and token are required." }, { status: 400 });
    }

    if (action !== "login" && action !== "register") {
      return NextResponse.json({ error: "Unsupported verification action." }, { status: 400 });
    }

    if (isRateLimited(`verify-otp-email:${action}:${email}`, 8, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please request a new code." },
        { status: 429 },
      );
    }

    const purpose = action === "login" ? "login" : "register";

    if (!verifySignedOtpToken({ email, code, token, purpose })) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 },
      );
    }

    if (action === "login") {
      return NextResponse.json(
        { error: "Passwordless login is not enabled for this account. Please sign in with your password." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      email,
      registrationToken: createSignedFlowToken({ email, purpose: "register_complete" }),
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify code." },
      { status: 500 }
    );
  }
}
