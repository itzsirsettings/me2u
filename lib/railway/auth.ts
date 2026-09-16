import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "./client";
import type { User } from "@/lib/store";

function getJwtSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET environment variable is required");
  return secret;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT
       p.id,
       (p.first_name || ' ' || p.last_name)                  AS name,
       p.email,
       p.phone,
       p.country_code                                         AS "countryCode",
       p.preferred_currency                                   AS "preferredCurrency",
       p.preferred_language                                   AS "preferredLanguage",
       p.bank_name                                            AS "bankName",
       p.account_number                                       AS "accountNumber",
       COALESCE(w.balance, 0)                                 AS balance,
       COALESCE(w.locked, 0)                                  AS locked,
       p.kyc_verified                                         AS "kycVerified",
       p.trust_score                                          AS "trustScore",
       p.username,
       p.referral_code                                        AS "referralCode",
       p.registration_deposit_paid                            AS "registrationDepositPaid",
       p.registration_deposit_amount                          AS "registrationDepositAmount",
       p.registration_payment_reference                       AS "registrationDepositReference",
       p.registration_deposit_confirmed_at                    AS "registrationDepositConfirmedAt",
       p.referred_by                                          AS "referredBy",
       p.affiliate_earnings                                   AS "affiliateEarnings",
       COALESCE(p.verified_referral_count, 0)                AS "verifiedReferralCount",
       COALESCE(p.weekly_referral_count, 0)                  AS "weeklyVerifiedReferralCount",
       COALESCE(p.account_unlocked, false)                   AS "accountUnlocked",
       p.account_unlock_paid_at                              AS "accountUnlockPaidAt",
       p.partner_offer_consent_at                             AS "partnerOfferConsentAt",
       p.partner_offer_consent_version                        AS "partnerOfferConsentVersion",
       p.passport_photo_url                                   AS "passportPhotoUrl",
       p.role,
       p.transaction_pin                                      AS "transactionPin",
       p.group_lending_enabled                                AS "groupLendingEnabled",
       p.created_at                                           AS "createdAt"
     FROM profiles p
     LEFT JOIN wallets w ON w.user_id = p.id
     WHERE p.id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  password_hash: string;
  role: string;
} | null> {
  const result = await query<{ id: string; email: string; password_hash: string; role: string }>(
    `SELECT a.id, a.email, a.password_hash, p.role
     FROM auth_users a
     JOIN profiles p ON p.id = a.id
     WHERE a.email = $1`,
    [email.toLowerCase()],
  );
  return result.rows[0] ?? null;
}

export interface CreateUserParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  username?: string;
  referralCode?: string;
  referredBy?: string | null;
  countryCode?: string;
  preferredCurrency?: string;
  preferredLanguage?: string;
}

export async function createUser(
  params: CreateUserParams,
): Promise<{ id: string; email: string }> {
  const passwordHash = await hashPassword(params.password);

  return withTransaction(async (client) => {
    // 1. Insert into auth_users
    const authResult = await client.query<{ id: string }>(
      `INSERT INTO auth_users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        params.email.toLowerCase(),
        passwordHash,
        params.firstName,
        params.lastName,
        params.phone ?? null,
      ],
    );
    const userId = authResult.rows[0].id;

    // 2. Insert profile
    await client.query(
      `INSERT INTO profiles (
         id, first_name, last_name, email, phone,
         username, referral_code, referred_by,
         country_code, preferred_currency, preferred_language,
         kyc_verified, trust_score, role,
         registration_deposit_paid, registration_deposit_amount,
         affiliate_earnings, group_lending_enabled,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11,
         false, 50, 'user',
         false, 0,
         0, false,
         NOW(), NOW()
       )`,
      [
        userId,
        params.firstName,
        params.lastName,
        params.email.toLowerCase(),
        params.phone ?? null,
        params.username ?? null,
        params.referralCode ?? null,
        params.referredBy ?? null,
        params.countryCode ?? "NG",
        params.preferredCurrency ?? "NGN",
        params.preferredLanguage ?? "en",
      ],
    );

    // 3. Insert wallet
    await client.query(
      `INSERT INTO wallets (user_id, balance, locked, updated_at)
       VALUES ($1, 0, 0, NOW())`,
      [userId],
    );

    return { id: userId, email: params.email };
  });
}

export async function recordReferral(referrerId: string, refereeId: string): Promise<void> {
  if (referrerId === refereeId) return;
  await query(
    `INSERT INTO referrals (referrer_id, referee_id)
     VALUES ($1, $2)
     ON CONFLICT (referrer_id, referee_id) DO NOTHING`,
    [referrerId, refereeId],
  );
}
