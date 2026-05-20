import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/server/email";
import { tooManyRequestsResponse } from "@/lib/server/auth";

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
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (isRateLimited(`forgot-password-email:${email}`, 3, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts for this email. Please wait and try again." },
        { status: 429 },
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: profile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 },
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
    const payload = `${email}:${code}:${expiresAt}`;
    const hash = createHmac("sha256", secret).update(payload).digest("hex");
    const token = `${expiresAt}.${hash}`;

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
      loggedToConsole: !!emailResult.loggedToConsole,
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request." },
      { status: 500 },
    );
  }
}
