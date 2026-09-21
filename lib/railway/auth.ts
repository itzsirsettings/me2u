import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { query, withTransaction } from "./client";
import type { User } from "@/lib/store";
import baseLogger from "@/lib/server/logger";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
const REVOKE_REDIS_TTL_MS = SEVEN_DAYS_SECONDS * 1000 + 60_000;

let redisRevoke: Redis | null | undefined;

function getRevokeRedis(): Redis | null {
  if (redisRevoke !== undefined) return redisRevoke;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisRevoke = null;
    return redisRevoke;
  }
  try {
    redisRevoke = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 1500,
    });
    redisRevoke.on("error", () => {
      // Fall back to DB-only auth_sessions check; Redis is a fast-path.
    });
    redisRevoke.connect().catch(() => undefined);
  } catch {
    redisRevoke = null;
  }
  return redisRevoke;
}

function getJwtSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET environment variable is required");

  // Enforce secret separation in production (AUTH-006)
  if (process.env.NODE_ENV === "production") {
    const otpSecret = process.env.OTP_SIGNING_SECRET;
    if (otpSecret && secret === otpSecret) {
      throw new Error(
        "SECURITY: AUTH_TOKEN_SECRET and OTP_SIGNING_SECRET must be different in production",
      );
    }
  }

  return secret;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface TokenAndSession {
  token: string;
  jti: string;
}

export async function generateToken(
  payload: Omit<JWTPayload, "jti" | "iat" | "exp"> & {
    userAgent?: string;
    ip?: string;
  },
): Promise<TokenAndSession> {
  const jti = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SEVEN_DAYS_SECONDS;

  const token = jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      jti,
      iat: issuedAt,
    },
    getJwtSecret(),
    {
      expiresIn: "7d",
      issuer: "me2u",
      audience: "app.me2u",
    },
  );

  try {
    const clientIp = payload.ip?.slice(0, 45) ?? null;
    const ua = payload.userAgent?.slice(0, 500) ?? null;
    await query(
      `INSERT INTO auth_sessions (session_id, user_id, jwt_id, user_agent, ip, created_at, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4::inet, NOW(), to_timestamp($5)::timestamptz)
       ON CONFLICT (jwt_id) DO NOTHING`,
      [payload.userId, jti, ua, clientIp, expiresAt],
    );
  } catch (err) {
    // Non-fatal: token is still valid; revocation checks use Redis too.
    try {
      baseLogger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "[auth_session_insert_failed]",
      );
    } catch {
      // ignore
    }
  }

  return { token, jti };
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "me2u",
      audience: "app.me2u",
    }) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Revocation check — consults Redis fast-path (short-TTL jti blacklist) plus
 * the durable auth_sessions + password_changed_at DB truth.
 *
 * Returns true if the token MUST be rejected (revoked, stale vs password change,
 * session expired or explicitly revoked).
 */
export async function isTokenRevoked(payload: JWTPayload): Promise<boolean> {
  if (!payload?.jti || !payload?.userId) return true;

  const jtiKey = `revoked_jti:${payload.jti}`;
  const redis = getRevokeRedis();
  if (redis) {
    try {
      const shortRevoked = await redis.get(jtiKey);
      if (shortRevoked !== null) return true;
    } catch {
      // Redis unavailable; DB is authoritative; continue
    }
  }

  try {
    const { rows } = await query<{
      revoked_at: string | null;
      expires_at: string | null;
      password_changed_at: string | null;
      account_locked: boolean;
    }>(
      `SELECT
         s.revoked_at,
         s.expires_at,
         p.password_changed_at,
         COALESCE(p.account_locked, false) AS account_locked
       FROM auth_sessions s
       RIGHT JOIN profiles p ON p.id = s.user_id AND s.jwt_id = $2
       WHERE p.id = $1
       LIMIT 1`,
      [payload.userId, payload.jti],
    );
    const row = rows[0];
    if (!row) return true; // user missing → reject

    if (row.account_locked) return true;

    // Session explicitly revoked OR expired
    if (row.revoked_at) return true;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return true;

    // Password changed AFTER token issued → invalidate
    if (row.password_changed_at) {
      const changedAtSec = Math.floor(new Date(row.password_changed_at).getTime() / 1000);
      if (changedAtSec > payload.iat) return true;
    }
  } catch (err) {
    // Fail-closed for DB errors during revocation check; surface to caller.
    try {
      baseLogger.warn(
        { err: err instanceof Error ? err.message : String(err), jti: payload.jti },
        "[revoke_check_db_error]",
      );
    } catch {
      // ignore
    }
    return true;
  }

  return false;
}

export async function revokeTokenByJti(jti: string, userId: string): Promise<void> {
  const redis = getRevokeRedis();
  if (redis) {
    try {
      await redis.set(`revoked_jti:${jti}`, "1", "PX", REVOKE_REDIS_TTL_MS);
    } catch {
      // ignore; DB is authoritative
    }
  }
  try {
    await query(
      `UPDATE auth_sessions SET revoked_at = NOW() WHERE jwt_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [jti, userId],
    );
  } catch {
    // ignore — Redis shortlist still active
  }
}

export async function revokeAllSessionsForUser(
  userId: string,
  touchPasswordChanged = true,
): Promise<void> {
  const redis = getRevokeRedis();
  try {
    const { rows } = await query<{ jwt_id: string | null }>(
      `SELECT jwt_id FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
    if (redis) {
      const pipeline = redis.pipeline();
      for (const r of rows) {
        if (r.jwt_id) pipeline.set(`revoked_jti:${r.jwt_id}`, "1", "PX", REVOKE_REDIS_TTL_MS);
      }
      await pipeline.exec().catch(() => undefined);
    }
  } catch {
    // continue to DB UPDATE below even if lookup fails
  }

  try {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
      if (touchPasswordChanged) {
        await client.query(`UPDATE profiles SET password_changed_at = NOW() WHERE id = $1`, [
          userId,
        ]);
      }
    });
  } catch {
    // ignore
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
  accountLocked: boolean;
} | null> {
  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    role: string;
    accountLocked: boolean;
  }>(
    `SELECT a.id,
            a.email,
            a.password_hash,
            p.role,
            COALESCE(p.account_locked, false) AS "accountLocked"
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
      `INSERT INTO auth_users (email, password_hash, first_name, last_name, phone, email_verified)
       VALUES ($1, $2, $3, $4, $5, true)
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
         password_changed_at,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11,
         false, 50, 'user',
         false, 0,
         0, false,
         NOW(),
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
