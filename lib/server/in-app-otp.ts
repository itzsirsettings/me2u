/**
 * Me2U In-App OTP Verification System
 * 100% self-contained - no external email/SMS services
 * OTP codes stored in database and displayed in-app
 */

import { query } from "@/lib/railway/client";
import { randomInt } from "crypto";

const OTP_EXPIRY_MINUTES = 10;

export interface OTPRecord {
  id: string;
  identifier: string; // email or phone
  code: string;
  purpose: "register" | "login" | "password_reset";
  expires_at: string;
  verified: boolean;
  created_at: string;
}

/**
 * Generate 6-digit OTP code
 */
export function generateOtpCode(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Store OTP code in database
 */
export async function createOtp(
  identifier: string,
  purpose: "register" | "login" | "password_reset"
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing OTPs for this identifier and purpose
  await query(
    `UPDATE otp_codes 
     SET verified = true, updated_at = NOW() 
     WHERE identifier = $1 AND purpose = $2 AND verified = false`,
    [identifier, purpose]
  );

  // Create new OTP
  await query(
    `INSERT INTO otp_codes 
       (identifier, code, purpose, expires_at, verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, false, NOW(), NOW())`,
    [identifier, code, purpose, expiresAt.toISOString()]
  );

  console.log(`✅ OTP created for ${identifier}: ${code} (expires in ${OTP_EXPIRY_MINUTES} minutes)`);

  return { code, expiresAt };
}

/**
 * Verify OTP code
 */
export async function verifyOtp(
  identifier: string,
  code: string,
  purpose: "register" | "login" | "password_reset"
): Promise<{ valid: boolean; error?: string }> {
  // Validate input
  if (!/^\d{6}$/.test(code)) {
    return {
      valid: false,
      error: "Invalid code format. Enter 6 digits.",
    };
  }

  // Find matching OTP
  const { rows } = await query<OTPRecord>(
    `SELECT * FROM otp_codes 
     WHERE identifier = $1 
       AND code = $2 
       AND purpose = $3 
       AND verified = false 
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifier, code, purpose]
  );

  if (rows.length === 0) {
    // Check if code exists but is expired
    const { rows: expiredRows } = await query<OTPRecord>(
      `SELECT * FROM otp_codes 
       WHERE identifier = $1 
         AND code = $2 
         AND purpose = $3 
         AND verified = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [identifier, code, purpose]
    );

    if (expiredRows.length > 0) {
      return {
        valid: false,
        error: "Verification code has expired. Request a new code.",
      };
    }

    return {
      valid: false,
      error: "Invalid verification code. Check and try again.",
    };
  }

  // Mark as verified
  await query(
    `UPDATE otp_codes 
     SET verified = true, updated_at = NOW() 
     WHERE id = $1`,
    [rows[0].id]
  );

  console.log(`✅ OTP verified for ${identifier}`);

  return { valid: true };
}

/**
 * Get current OTP for identifier (for display in UI)
 */
export async function getCurrentOtp(
  identifier: string,
  purpose: "register" | "login" | "password_reset"
): Promise<OTPRecord | null> {
  const { rows } = await query<OTPRecord>(
    `SELECT * FROM otp_codes 
     WHERE identifier = $1 
       AND purpose = $2 
       AND verified = false 
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifier, purpose]
  );

  return rows[0] || null;
}

/**
 * Clean up expired OTPs (run periodically)
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const { rows } = await query<{ deleted: number }>(
    `WITH deleted AS (
       DELETE FROM otp_codes
       WHERE expires_at < NOW() - INTERVAL '24 hours'
       RETURNING 1
     )
     SELECT COUNT(*)::int AS deleted FROM deleted`
  );

  const rowCount = rows[0]?.deleted ?? 0;
  console.log(`🧹 Cleaned up ${rowCount} expired OTP codes`);
  return rowCount;
}

/**
 * Get OTP statistics (for admin dashboard)
 */
export async function getOtpStats(): Promise<{
  total_sent_today: number;
  total_verified_today: number;
  verification_rate: number;
  active_otps: number;
}> {
  const { rows } = await query<{
    total_sent_today: string;
    total_verified_today: string;
    active_otps: string;
  }>(
    `SELECT 
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as total_sent_today,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND verified = true) as total_verified_today,
       COUNT(*) FILTER (WHERE verified = false AND expires_at > NOW()) as active_otps
     FROM otp_codes`
  );

  const stats = rows[0];
  const totalSent = parseInt(stats.total_sent_today || "0");
  const totalVerified = parseInt(stats.total_verified_today || "0");

  return {
    total_sent_today: totalSent,
    total_verified_today: totalVerified,
    verification_rate: totalSent > 0 ? Math.round((totalVerified / totalSent) * 100) : 0,
    active_otps: parseInt(stats.active_otps || "0"),
  };
}
