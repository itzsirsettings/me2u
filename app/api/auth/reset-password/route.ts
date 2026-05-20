import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tooManyRequestsResponse } from "@/lib/server/auth";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function verifyTokenAndCode(email: string, code: string, token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiresAtStr, hash] = parts;
  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
  const payload = `${email}:${code}:${expiresAt}`;
  const expectedHash = createHmac("sha256", secret).update(payload).digest("hex");
  return hash === expectedHash;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`reset-password:${clientIp}`, 5, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const token = String(body.token || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!email || !code || !token) {
      return NextResponse.json({ error: "Email, verification code, and token are required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!newPassword) {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (!verifyTokenAndCode(email, code, token)) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    if (isRateLimited(`reset-password-email:${email}`, 3, 15 * 60_000)) {
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

    const { data: users, error: listUsersError } = await supabase.auth.admin.listUsers();

    if (listUsersError) {
      throw listUsersError;
    }

    const user = users?.users?.find((u) => u.email?.toLowerCase() === email);

    if (!user) {
      return NextResponse.json(
        { error: "Unable to find your account. Please contact support." },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error in reset-password:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset password." },
      { status: 500 },
    );
  }
}
