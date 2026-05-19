import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/server/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const action = String(body.action || "register").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
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

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Sign the verification code statelessly using the service role key as a secret
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
    const payload = `${email}:${code}:${expiresAt}`;
    const hash = createHmac("sha256", secret).update(payload).digest("hex");
    const token = `${expiresAt}.${hash}`;

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
