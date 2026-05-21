import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import {
  getCountryConfig,
  isSupportedCountryCode,
  isSupportedLanguageCode,
} from "@/lib/product-features";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGoogleUserPassword } from "@/lib/server/auth-helpers";
import { sendOtpEmail } from "@/lib/server/email";

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
    normalized.includes("email_exists")
  ) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  if (
    normalized.includes("profiles_username_lower_unique_idx") ||
    (normalized.includes("duplicate key") && normalized.includes("username"))
  ) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  }

  if (
    normalized.includes("schema cache") ||
    normalized.includes("could not find") ||
    normalized.includes("column") ||
    normalized.includes("relation")
  ) {
    return NextResponse.json(
      { error: "Database setup is incomplete. Apply the latest Supabase migrations and try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

function generateVerificationToken(email: string, code: string) {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
  const payload = `${email}:${code}:${expiresAt}`;
  const hash = createHmac("sha256", secret).update(payload).digest("hex");
  return { token: `${expiresAt}.${hash}`, code, expiresAt };
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
    if (isRateLimited(`register:${clientIp}`, 5, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const step = String(body.step || "").trim();

    // STEP 1: Send verification code to email
    if (step === "send_code") {
      const email = String(body.email || "").trim().toLowerCase();

      if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
      if (isRateLimited(`register-email:${email}`, 3, 15 * 60_000)) {
        return NextResponse.json(
          { error: "Too many attempts for this email. Please wait and try again." },
          { status: 429 },
        );
      }

      const supabase = getSupabaseAdminClient();
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json({ error: "Email is already registered. Please login instead." }, { status: 409 });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const { token } = generateVerificationToken(email, code);
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
    }

    // STEP 2: Verify code and create account
    if (step === "verify_and_register") {
      const email = String(body.email || "").trim().toLowerCase();
      const code = String(body.code || "").trim();
      const token = String(body.token || "").trim();

      if (!email || !code || !token) {
        return NextResponse.json({ error: "Email, verification code, and token are required." }, { status: 400 });
      }

      if (!verifyTokenAndCode(email, code, token)) {
        return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
      }

      if (isRateLimited(`register-email:${email}`, 3, 15 * 60_000)) {
        return NextResponse.json(
          { error: "Too many attempts for this email. Please wait and try again." },
          { status: 429 },
        );
      }

      const firstName = String(body.firstName || "").trim().replace(/\s+/g, " ");
      const lastName = String(body.lastName || "").trim().replace(/\s+/g, " ");
      const username = String(body.username || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const referral = String(body.referral || "").trim();
      const countryCode = String(body.countryCode || "NG").trim().toUpperCase();
      const preferredLanguage = String(body.preferredLanguage || "en").trim().toLowerCase();
      const googleToken = String(body.googleToken || "").trim();
      const googleCode = String(body.googleCode || "").trim();

      let password: string;

      // Handle Google registration path
      if (googleToken && googleCode) {
        const parts = googleToken.split(".");
        if (parts.length !== 2) {
          return NextResponse.json({ error: "Invalid Google verification token." }, { status: 400 });
        }
        const [expiresAtStr, hash] = parts;
        const expiresAt = Number(expiresAtStr);
        if (isNaN(expiresAt) || Date.now() > expiresAt) {
          return NextResponse.json({ error: "Google verification code has expired." }, { status: 400 });
        }
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
        const payload = `${email}:${googleCode}:${expiresAt}`;
        const expectedHash = createHmac("sha256", secret).update(payload).digest("hex");
        if (hash !== expectedHash) {
          return NextResponse.json({ error: "Incorrect Google verification code." }, { status: 400 });
        }
        password = getGoogleUserPassword(email);
      } else {
        password = String(body.password || "");
        if (!password) {
          return NextResponse.json({ error: "Password is required." }, { status: 400 });
        }
        if (password.length < 8) {
          return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        }
      }

      if (firstName.length < 2 || firstName.length > 80 || lastName.length < 2 || lastName.length > 80) {
        return NextResponse.json({ error: "Enter your first and last name." }, { status: 400 });
      }

      if (!/^[a-z0-9]{3,30}$/.test(username)) {
        return NextResponse.json(
          { error: "Username must be 3 to 30 letters and numbers only." },
          { status: 400 },
        );
      }

      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
      }

      if (referral.length > 40) {
        return NextResponse.json({ error: "Referral code is too long." }, { status: 400 });
      }

      if (!isSupportedCountryCode(countryCode)) {
        return NextResponse.json({ error: "Choose a supported country." }, { status: 400 });
      }

      if (!isSupportedLanguageCode(preferredLanguage)) {
        return NextResponse.json({ error: "Choose a supported language." }, { status: 400 });
      }

      const country = getCountryConfig(countryCode);
      const supabase = getSupabaseAdminClient();
      let referredBy: string | null = null;

      const { data: existingUsername, error: usernameLookupError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();

      if (usernameLookupError) throw usernameLookupError;
      if (existingUsername) {
        return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
      }

      if (referral) {
        if (referral.toLowerCase() === username.toLowerCase()) {
          return NextResponse.json({ error: "You cannot use your own username as a referral." }, { status: 400 });
        }

        const { data: referrer, error: referrerLookupError } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", referral)
          .maybeSingle();

        if (referrerLookupError) throw referrerLookupError;
        if (!referrer) {
          return NextResponse.json({ error: "Referral username was not found." }, { status: 400 });
        }

        referredBy = referrer.id;
      }

      const { data: authData, error: createUserError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            username,
            country_code: country.code,
            preferred_language: preferredLanguage,
          },
        });

      if (createUserError || !authData.user) {
        throw createUserError || new Error("Unable to create user.");
      }

      const userId = authData.user.id;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        phone: phone || null,
        nin_hash: null,
        nin_last4: null,
        country_code: country.code,
        preferred_currency: country.currency,
        preferred_language: preferredLanguage,
        kyc_verified: false,
        trust_score: 50,
        bank_name: null,
        account_number: null,
        registration_payment_reference: null,
        referral_code: referral || null,
        registration_deposit_paid: false,
        registration_deposit_amount: 0,
        registration_deposit_confirmed_at: null,
        welcome_bonus_unlocked_at: null,
        referred_by: referredBy,
        affiliate_earnings: 0,
        partner_offer_consent_at: null,
        partner_offer_consent_version: null,
        passport_photo_url: null,
        transaction_pin: null,
        role: "user",
        group_lending_enabled: false,
      });

      if (profileError) {
        await supabase.auth.admin.deleteUser(userId);
        throw profileError;
      }

      const { error: walletError } = await supabase.from("wallets").insert({
        user_id: userId,
        balance: 0,
        locked: 0,
      });

      if (walletError) {
        await supabase.auth.admin.deleteUser(userId);
        throw walletError;
      }

      // Record referral if applicable
      if (referredBy) {
        await supabase.rpc("me2u_record_referral", {
          p_referrer_id: referredBy,
          p_referee_id: userId,
        });
      }

      return NextResponse.json(
        {
          email,
          firstName,
          lastName,
          username,
          password: googleToken && googleCode ? password : undefined,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json({ error: "Invalid registration step. Use 'send_code' or 'verify_and_register'." }, { status: 400 });
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
