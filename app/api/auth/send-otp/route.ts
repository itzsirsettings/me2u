import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { tooManyRequestsResponse } from "@/lib/server/auth";
import { createSignedOtpToken, generateOtpCode } from "@/lib/server/otp";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/server/email";

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

    const supabase = getSupabaseAdminClient();

    // Look up existing user
    const { data: profile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    if (action === "login" && !profile) {
      return NextResponse.json(
        { error: "No account found with this email. Please register first." },
        { status: 404 }
      );
    }

    if (action === "register" && profile) {
      return NextResponse.json(
        { error: "Email is already registered. Please login instead." },
        { status: 409 }
      );
    }

    const code = generateOtpCode();
    const token = createSignedOtpToken({ email, code, purpose });

    // Send email
    const emailResult = await sendOtpEmail(email, code);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
      token,
      loggedToConsole: !!emailResult.loggedToConsole,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate verification code." },
      { status: 500 }
    );
  }
}
