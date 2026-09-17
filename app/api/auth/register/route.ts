import { NextResponse } from "next/server";
import {
  getCountryConfig,
  isSupportedCountryCode,
  isSupportedLanguageCode,
} from "@/lib/product-features";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  createSignedFlowToken,
  createSignedOtpToken,
  generateOtpCode,
  verifySignedFlowToken,
  verifySignedOtpToken,
} from "@/lib/server/otp";
import { sendOtpEmail } from "@/lib/server/email";
import { createUser, recordReferral } from "@/lib/railway/auth";
import { query } from "@/lib/railway/client";
import { assignPaystackDvaForNewUser } from "@/lib/server/paystack-dva";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function registrationErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to register account.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("user already exists") ||
    normalized.includes("email_exists") ||
    normalized.includes("auth_users_email_key")
  ) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  if (
    normalized.includes("profiles_username_lower_unique_idx") ||
    (normalized.includes("duplicate key") && normalized.includes("username"))
  ) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`register:${clientIp}`, 5, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const step = String(body.step || "").trim();

    // ── STEP 1: Send verification code ──────────────────────────────
    if (step === "send_code") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();

      if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
      if (!isValidEmail(email))
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

      if (isRateLimited(`register-email:${email}`, 3, 15 * 60_000)) {
        return NextResponse.json(
          { error: "Too many attempts for this email. Please wait and try again." },
          { status: 429 },
        );
      }

      // Check if email already registered (profiles table)
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
        [email],
      );
      if (rows.length > 0) {
        return NextResponse.json(
          { error: "Email is already registered. Please login instead." },
          { status: 409 },
        );
      }

      const code = generateOtpCode();
      const token = createSignedOtpToken({ email, code, purpose: "register" });
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
    }

    // ── STEP 2: Verify code ──────────────────────────────────────────
    if (step === "verify_code") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const code = String(body.code || "").trim();
      const token = String(body.token || "").trim();

      if (!email || !code || !token)
        return NextResponse.json(
          { error: "Email, verification code, and token are required." },
          { status: 400 },
        );

      if (!isValidEmail(email))
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

      if (isRateLimited(`register-verify:${email}`, 8, 15 * 60_000)) {
        return NextResponse.json(
          {
            error: "Too many verification attempts for this email. Please request a new code.",
          },
          { status: 429 },
        );
      }

      if (!verifySignedOtpToken({ email, code, token, purpose: "register" })) {
        return NextResponse.json(
          { error: "Invalid or expired verification code." },
          { status: 400 },
        );
      }

      // Re-check email isn't registered
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
        [email],
      );
      if (rows.length > 0) {
        return NextResponse.json(
          { error: "Email is already registered. Please login instead." },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        email,
        registrationToken: createSignedFlowToken({ email, purpose: "register_complete" }),
      });
    }

    // ── STEP 3: Create account ───────────────────────────────────────
    if (step === "verify_and_register") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const registrationToken = String(body.registrationToken || "").trim();

      if (!email || !registrationToken) {
        return NextResponse.json(
          { error: "Email verification is required before registration." },
          { status: 400 },
        );
      }

      if (
        !verifySignedFlowToken({
          email,
          token: registrationToken,
          purpose: "register_complete",
        })
      ) {
        return NextResponse.json(
          { error: "Email verification has expired. Request a new code." },
          { status: 400 },
        );
      }

      if (isRateLimited(`register-email:${email}`, 3, 15 * 60_000)) {
        return NextResponse.json(
          { error: "Too many attempts for this email. Please wait and try again." },
          { status: 429 },
        );
      }

      // ── Validate all fields ──
      const firstName = String(body.firstName || "")
        .trim()
        .replace(/\s+/g, " ");
      const lastName = String(body.lastName || "")
        .trim()
        .replace(/\s+/g, " ");
      const username = String(body.username || "")
        .trim()
        .toLowerCase();
      const phone = String(body.phone || "").trim();
      const referral = String(body.referral || "").trim();
      const countryCode = String(body.countryCode || "NG")
        .trim()
        .toUpperCase();
      const preferredLanguage = String(body.preferredLanguage || "en")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");

      if (!password)
        return NextResponse.json({ error: "Password is required." }, { status: 400 });
      if (password.length < 8)
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 },
        );

      if (
        firstName.length < 2 ||
        firstName.length > 80 ||
        lastName.length < 2 ||
        lastName.length > 80
      )
        return NextResponse.json({ error: "Enter your first and last name." }, { status: 400 });

      if (!/^[a-z0-9]{3,30}$/.test(username))
        return NextResponse.json(
          { error: "Username must be 3 to 30 letters and numbers only." },
          { status: 400 },
        );

      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 7 || phoneDigits.length > 15)
        return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });

      if (referral.length > 40)
        return NextResponse.json({ error: "Referral code is too long." }, { status: 400 });

      if (!isSupportedCountryCode(countryCode))
        return NextResponse.json({ error: "Choose a supported country." }, { status: 400 });

      if (!isSupportedLanguageCode(preferredLanguage))
        return NextResponse.json({ error: "Choose a supported language." }, { status: 400 });

      const country = getCountryConfig(countryCode);

      // ── Check username uniqueness ──
      const { rows: usernameRows } = await query<{ id: string }>(
        `SELECT id FROM profiles WHERE lower(username) = lower($1) LIMIT 1`,
        [username],
      );
      if (usernameRows.length > 0) {
        return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
      }

      // ── Resolve referrer ──
      let referredBy: string | null = null;
      if (referral) {
        if (referral.toLowerCase() === username.toLowerCase()) {
          return NextResponse.json(
            { error: "You cannot use your own username as a referral." },
            { status: 400 },
          );
        }
        const { rows: referrerRows } = await query<{ id: string }>(
          `SELECT id FROM profiles WHERE lower(username) = lower($1) LIMIT 1`,
          [referral],
        );
        if (referrerRows.length === 0) {
          return NextResponse.json(
            { error: "Referral username was not found." },
            { status: 400 },
          );
        }
        referredBy = referrerRows[0].id;
      }

      // ── Create user (auth_users + profiles + wallets in one transaction) ──
      const { id: userId } = await createUser({
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
        username,
        referralCode: referral || undefined,
        referredBy,
        countryCode: country.code,
        preferredCurrency: country.currency,
        preferredLanguage,
      });

      // ── Record referral relationship ──
      if (referredBy) {
        await recordReferral(referredBy, userId);
      }

      // ── Assign Paystack DVA (optional, non-blocking) ──
      let walletAccountStatus: string | null = null;
      if (process.env.PAYSTACK_DVA_ENABLED === "true") {
        try {
          const walletAccount = await assignPaystackDvaForNewUser({
            userId,
            email,
            firstName,
            lastName,
            phone,
            countryCode: country.code,
          });
          walletAccountStatus = walletAccount.status;
        } catch (dvaError) {
          console.error("Paystack DVA assignment failed during registration", dvaError);
          walletAccountStatus = "pending";
        }
      }

      return NextResponse.json(
        { email, firstName, lastName, username, walletAccountStatus },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        error:
          "Invalid registration step. Use 'send_code', 'verify_code', or 'verify_and_register'.",
      },
      { status: 400 },
    );
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
