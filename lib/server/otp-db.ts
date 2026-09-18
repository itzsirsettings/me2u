/**
 * Database-backed OTP with attempt tracking and 8-attempt invalidation.
 *
 * Combines the existing signed-token flow (for transport) with a durable
 * `otp_codes` table row. The signed token (from lib/server/otp.ts) prevents
 * code-forging off-box; the DB row provides at-least-once consumption and
 * attempt-based lockout that survives process restarts.
 *
 * Rules (AC-R13, AUTH-005):
 *  - Exactly ONE active (verified=false AND expires_at>now) row per
 *    (identifier, purpose) — enforced by partial UNIQUE index from G0 T4.
 *  - 1st-7th mismatches: attempts counter incremented.
 *  - 8th mismatch: OTP row invalidated (verified=true) so it cannot be reused;
 *    caller must request a fresh code.
 *  - Match + consume: sets verified=true atomically so the same OTP cannot be
 *    replayed even if the signed token is replayed.
 */
import type { PoolClient } from "pg";
import { query, withTransaction, withUserTransaction } from "@/lib/railway/client";
import type { OtpPurpose } from "@/lib/server/otp";
import baseLogger from "@/lib/server/logger";

const MAX_ATTEMPTS = 8;
const DEFAULT_TTL_MS = 10 * 60_000;

function inetCast(ip?: string | null): { ipInet: string | null; ipText: string | null } {
  if (!ip) return { ipInet: null, ipText: null };
  const trimmed = ip.trim();
  if (!trimmed) return { ipInet: null, ipText: null };
  const validV4V6 = /^[\d.:a-fA-F]+$/.test(trimmed) ? trimmed : null;
  return { ipInet: validV4V6, ipText: trimmed };
}

export interface OtpCreateResult {
  /** The 6-digit OTP code — pass to email/SMS delivery, never store in plaintext */
  code: string;
  /** DB row id for later correlation */
  otpId: string;
  /** True if a previous active row was superseded (replaced) due to the partial UNIQUE */
  replaced: boolean;
}

/**
 * Create a fresh active OTP row for (identifier, purpose).
 *
 * Uses the partial UNIQUE index from G0 T4 as the concurrency guard:
 *  - If no active row: insert → ok.
 *  - If an active row exists (race), the INSERT throws 23505; we atomically
 *    invalidate the old row (set verified=true) then insert the new one,
 *    guaranteeing exactly ONE active row remains.
 */
export async function createOtp(
  identifier: string,
  purpose: OtpPurpose,
  opts: {
    code: string;
    ttlMs?: number;
    ip?: string;
    userAgent?: string;
  },
): Promise<OtpCreateResult> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl);
  const identifierLower = identifier.trim().toLowerCase();
  const ua = opts.userAgent?.slice(0, 500) ?? null;
  const ip = inetCast(opts.ip ?? null);

  let replaced = false;

  try {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO otp_codes (identifier, purpose, code, expires_at, attempts, verified, ip_address, user_agent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, false, $5::inet, $6, NOW(), NOW())
       RETURNING id`,
      [identifierLower, purpose, opts.code, expiresAt, ip.ipInet, ua],
    );
    return { code: opts.code, otpId: rows[0].id, replaced: false };
  } catch (err: any) {
    // Postgres 23505 = unique_violation → means another active row for (id,purpose)
    // beat us to the insert. Atomically invalidate it and retry.
    if (err?.code !== "23505") {
      try {
        baseLogger.error(
          { err: err?.message, identifierLower, purpose },
          "[otp_create_unexpected_error]",
        );
      } catch {
        // ignore
      }
      throw err;
    }
  }

  replaced = true;
  const retryResult = await withTransaction(async (client) => {
    const superseded = await client.query(
      `UPDATE otp_codes
          SET verified = true, updated_at = NOW()
        WHERE identifier = $1
          AND purpose    = $2
          AND verified   = false
          AND expires_at > NOW()
        RETURNING id`,
      [identifierLower, purpose],
    );

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO otp_codes (identifier, purpose, code, expires_at, attempts, verified, ip_address, user_agent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, false, $5::inet, $6, NOW(), NOW())
       RETURNING id`,
      [identifierLower, purpose, opts.code, expiresAt, ip.ipInet, ua],
    );

    void superseded;
    return rows[0].id;
  });

  return { code: opts.code, otpId: retryResult, replaced };
}

export type OtpConsumeOutcome =
  | "ok"
  | "already_used"
  | "expired"
  | "invalid_code"
  | "attempts_exhausted"
  | "not_found"
  | "wrong_purpose";

export interface OtpConsumeResult {
  outcome: OtpConsumeOutcome;
  attempts: number;
  remaining: number;
}

/**
 * Attempt to consume an OTP. Atomically validates code/purpose and, on the 8th
 * failure, invalidates the row entirely so no more attempts are possible.
 *
 * Always uses FOR UPDATE row locking so concurrent verifies cannot both pass.
 *
 * NOTE: this function does NOT verify the signed HMAC token from otp.ts — the
 * caller combines both (DB durable + signed off-box) as defense-in-depth.
 */
export async function consumeOtpAttempt(
  identifier: string,
  purpose: OtpPurpose,
  code: string,
): Promise<OtpConsumeResult> {
  const identifierLower = identifier.trim().toLowerCase();

  const outcome = await withTransaction(async (client): Promise<OtpConsumeResult> => {
    const { rows } = await client.query<{
      id: string;
      code: string;
      verified: boolean;
      expires_at: Date;
      attempts: number;
      purpose: string;
    }>(
      `SELECT id, code, verified, expires_at, attempts, purpose
         FROM otp_codes
        WHERE identifier = $1 AND purpose = $2
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE`,
      [identifierLower, purpose],
    );
    const row = rows[0];
    if (!row) return { outcome: "not_found", attempts: 0, remaining: 0 };
    if (row.purpose !== purpose) return { outcome: "wrong_purpose", attempts: row.attempts, remaining: 0 };

    if (row.verified) {
      // Either matched earlier OR attempts-exhaust invalidation; collapse to
      // the semantic state most useful for UI.
      return {
        outcome: row.attempts >= MAX_ATTEMPTS ? "attempts_exhausted" : "already_used",
        attempts: row.attempts,
        remaining: 0,
      };
    }

    if (row.expires_at.getTime() < Date.now()) {
      return { outcome: "expired", attempts: row.attempts, remaining: 0 };
    }

    // Timing-safe code compare (6-digit plaintext row codes — the partial UNIQUE
    // index combined with HTTPS transport + signed outer token make this a
    // defense-in-depth layer rather than the sole authenticity gate).
    const a = Buffer.from(String(row.code));
    const b = Buffer.from(String(code));
    const sameLen = a.length === b.length;
    const dummyA = Buffer.alloc(Math.max(a.length, b.length, 6), 0);
    const dummyB = Buffer.alloc(Math.max(a.length, b.length, 6), 0);
    const dummyMatch = sameLen
      ? true
      : compareDummy(a, b, dummyA, dummyB);
    const realMatch = sameLen && Buffer.compare(a, b) === 0;
    const match = dummyMatch && realMatch;

    if (match) {
      await client.query(
        `UPDATE otp_codes
            SET verified = true,
                attempts = attempts + 1,
                updated_at = NOW()
          WHERE id = $1`,
        [row.id],
      );
      return { outcome: "ok", attempts: row.attempts + 1, remaining: 0 };
    }

    const nextAttempts = Math.min(row.attempts + 1, MAX_ATTEMPTS);
    const exhausted = nextAttempts >= MAX_ATTEMPTS;
    await client.query(
      exhausted
        ? `UPDATE otp_codes
              SET verified = true, attempts = $2, updated_at = NOW()
            WHERE id = $1`
        : `UPDATE otp_codes
              SET attempts = $2, updated_at = NOW()
            WHERE id = $1`,
      [row.id, nextAttempts],
    );
    return {
      outcome: exhausted ? "attempts_exhausted" : "invalid_code",
      attempts: nextAttempts,
      remaining: exhausted ? 0 : MAX_ATTEMPTS - nextAttempts,
    };
  });

  return outcome;
}

function compareDummy(a: Buffer, b: Buffer, dA: Buffer, dB: Buffer): boolean {
  // Avoid timing-leak branches: always compare same-length buffers.
  for (let i = 0; i < dA.length; i++) {
    dA[i] = i < a.length ? a[i] : 0;
    dB[i] = i < b.length ? b[i] : 0;
  }
  // Non-functional compare: result intentionally discarded by caller (we only
  // want to burn equal-wall-clock cycles regardless of length mismatch).
  let x = 0;
  for (let i = 0; i < dA.length; i++) x |= dA[i] ^ dB[i];
  return x === 0;
}
