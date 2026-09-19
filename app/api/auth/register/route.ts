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
import { createOtp, consumeOtpAttempt } from "@/lib/server/otp-db";
import { sendOtpEmail } from "@/lib/server/email";
import { createUser, recordReferral } from "@/lib/railway/auth";
import { query } from "@/lib/railway/client";
import { assignPaystackDvaForNewUser } from "@/lib/server/paystack-dva";
import { requestMeta } from "@/lib/server/idempotency";
import { tooManyRequestsResponse } from "@/lib/server/auth";

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
    return NextResponse.json(
      { error: "Unable to complete registration at this time." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    normalized.includes("profiles_username_lower_unique_idx") ||
    (normalized.includes("duplicate key") && normalized.includes("username"))
  ) {
    return NextResponse.json(
      { error: "Username is already taken." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

function buildBlindRegisterResponse(email: string, token: string) {
  return NextResponse.json(
    { success: true, email, token },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const meta = requestMeta(request);
    const clientIp = getClientIp(request);

    if (await isRateLimited(`register:${clientIp}`, 20, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const step = String(body.step || "").trim();

    if (step === "send_code") {
      const email = String(body.email || "").trim().toLowerCase();

      if (!email) {
        return NextResponse.json(
          { error: "Email is required." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: "Enter a valid email address." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (await isRateLimited(`register-email:${email}`, 10, 60 * 60_000)) {
        return tooManyRequestsResponse();
      }

      const { rows } = await query<{ id: string }>(
        `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
        [email],
      );
      const alreadyRegistered = rows.length > 0;

      const code = generateOtpCode();
      const signedToken = createSignedOtpToken({ email, code, purpose: "register" });

      if (!alreadyRegistered) {
        await createOtp(email, "register", {
          code,
          ttlMs: 10 * 60_000,
          ip: meta.ip,
          userAgent: meta.userAgent,
        }).catch(() => undefined);
        await sendOtpEmail(email, code).catch(() => ({ success: false }));
      }

      return buildBlindRegisterResponse(email, signedToken);
    }

    if (step === "verify_code") {
      const email = String(body.email || "").trim().toLowerCase();
      const code = String(body.code || "").trim();
      const token = String(body.token || "").trim();

      if (!email || !code || !token) {
        return NextResponse.json(
          { error: "Email, verification code, and token are required." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: "Enter a valid email address." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (await isRateLimited(`register-verify:${email}`, 10, 15 * 60_000)) {
        return tooManyRequestsResponse();
      }

      const signedOk = verifySignedOtpToken({ email, code, token, purpose: "register" });
      const consumeResult = await consumeOtpAttempt(email, "register", code);
      const dbOk = consumeResult.outcome === "ok";

      if (!signedOk || !dbOk) {
        return NextResponse.json(
          { error: "Invalid or expired verification code." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const { rows } = await query<{ id: string }>(
        `SELECT id FROM profiles WHERE email = $1 LIMIT 1`,
        [email],
      );
      if (rows.length > 0) {
        return NextResponse.json(
          { error: "Email is already registered. Please login instead." },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }

      return NextResponse.json(
        {
          success: true,
          email,
          registrationToken: createSignedFlowToken({ email, purpose: "register_complete" }),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (step === "verify_and_register") {
      const email = String(body.email || "").trim().toLowerCase();
      const registrationToken = String(body.registrationToken || "").trim();

      if (!email || !registrationToken) {
        return NextResponse.json(
          { error: "Email verification is required before registration." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
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
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (await isRateLimited(`register-email:${email}`, 10, 60 * 60_000)) {
        return tooManyRequestsResponse();
      }

      const firstName = String(body.firstName || "").trim().replace(/\s+/g, " ");
      const lastName = String(body.lastName || "").trim().replace(/\s+/g, " ");
      const username = String(body.username || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const referral = String(body.referral || "").trim();
      const countryCode = String(body.countryCode || "NG").trim().toUpperCase();
      const preferredLanguage = String(body.preferredLanguage || "en").trim().toLowerCase();
      const password = String(body.password || "");

      if (!password) {
        return NextResponse.json(
          { error: "Password is required." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (
        firstName.length < 2 ||
        firstName.length > 80 ||
        lastName.length < 2 ||
        lastName.length > 80
      ) {
        return NextResponse.json(
          { error: "Enter your first and last name." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (!/^[a-z0-9]{3,30}$/.test(username)) {
        return NextResponse.json(
          { error: "Username must be 3 to 30 letters and numbers only." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        return NextResponse.json(
          { error: "Enter a valid phone number." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (referral.length > 40) {
        return NextResponse.json(
          { error: "Referral code is too long." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (!isSupportedCountryCode(countryCode)) {
        return NextResponse.json(
          { error: "Choose a supported country." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (!isSupportedLanguageCode(preferredLanguage)) {
        return NextResponse.json(
          { error: "Choose a supported language." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const country = getCountryConfig(countryCode);

      const { rows: usernameRows } = await query<{ id: string }>(
        `SELECT id FROM profiles WHERE lower(username) = lower($1) LIMIT 1`,
        [username],
      );
      if (usernameRows.length > 0) {
        return NextResponse.json(
          { error: "Username is already taken." },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }

      let referredBy: string | null = null;
      if (referral) {
        if (referral.toLowerCase() === username.toLowerCase()) {
          return NextResponse.json(
            { error: "You cannot use your own username as a referral." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
        const { rows: referrerRows } = await query<{ id: string }>(
          `SELECT id FROM profiles WHERE lower(username) = lower($1) LIMIT 1`,
          [referral],
        );
        if (referrerRows.length === 0) {
          return NextResponse.json(
            { error: "Referral username was not found." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
        referredBy = referrerRows[0].id;
      } else {
        // No referral code provided - assign to platform user if configured
        const platformUserId = process.env.PLATFORM_USER_ID;
        if (platformUserId) {
          // Verify platform user exists before assigning
          const { rows: platformUserRows } = await query<{ id: string }>(
            `SELECT id FROM profiles WHERE id = $1 LIMIT 1`,
            [platformUserId],
          );
          if (platformUserRows.length > 0) {
            referredBy = platformUserId;
          }
        }
      }

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

      if (referredBy) {
        await recordReferral(referredBy, userId);
      }

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
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
