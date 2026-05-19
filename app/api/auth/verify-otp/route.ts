import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getGoogleUserPassword } from "@/lib/server/auth-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const token = String(body.token || "").trim();
    const action = String(body.action || "register").trim().toLowerCase();

    if (!email || !code || !token) {
      return NextResponse.json({ error: "Email, code, and token are required." }, { status: 400 });
    }

    // Split token into expiry and hash
    const parts = token.split(".");
    if (parts.length !== 2) {
      return NextResponse.json({ error: "Invalid verification token." }, { status: 400 });
    }

    const [expiresAtStr, hash] = parts;
    const expiresAt = Number(expiresAtStr);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Verify signature
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
    const payload = `${email}:${code}:${expiresAt}`;
    const expectedHash = createHmac("sha256", secret).update(payload).digest("hex");

    if (hash !== expectedHash) {
      return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
    }

    // Code is correct!
    if (action === "login") {
      const password = getGoogleUserPassword(email);
      return NextResponse.json({
        success: true,
        email,
        password,
      });
    }

    return NextResponse.json({
      success: true,
      email,
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify code." },
      { status: 500 }
    );
  }
}
