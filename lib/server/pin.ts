import { createHmac, timingSafeEqual } from "crypto";

import type { Pool, PoolClient } from "pg";

import { revokeEverySession } from "@/lib/railway/auth";
import { query, withUserTransaction, getRailwayDbClient } from "@/lib/railway/client";

const pinVerifierPrefix = "v1:";
const MAX_PIN_ATTEMPTS = 5;

function getPinSecret() {
  const secret = process.env.PIN_PEPPER || process.env.AUTH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Missing server PIN verifier secret.");
  }
  return secret;
}

export function createTransactionPinVerifier(userId: string, pin: string) {
  const digest = createHmac("sha256", getPinSecret()).update(`${userId}:${pin}`).digest("hex");

  return `${pinVerifierPrefix}${digest}`;
}

export function verifyTransactionPin(
  storedVerifier: string | null | undefined,
  userId: string,
  pin: string,
) {
  if (!storedVerifier) return false;
  if (!/^\d{4}$/.test(pin)) return false;

  if (/^\d{4}$/.test(storedVerifier)) {
    // Legacy plaintext PIN — timing-safe compare.
    const a = Buffer.from(storedVerifier);
    const b = Buffer.from(pin);
    const dummyA = Buffer.alloc(Math.max(a.length, b.length), 0);
    const dummyB = Buffer.alloc(Math.max(a.length, b.length), 0);
    const sameLen = a.length === b.length;
    const dummyMatch = timingSafeEqual(sameLen ? a : dummyA, sameLen ? b : dummyB);
    const realMatch = sameLen && timingSafeEqual(a, b);
    return dummyMatch && realMatch;
  }

  if (!storedVerifier.startsWith(pinVerifierPrefix)) return false;

  const expected = createTransactionPinVerifier(userId, pin);
  const storedBuffer = Buffer.from(storedVerifier);
  const expectedBuffer = Buffer.from(expected);

  return (
    storedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(storedBuffer, expectedBuffer)
  );
}

export async function getUserPinVerifier(userId: string): Promise<string | null> {
  const { rows } = await query<{ transaction_pin: string | null }>(
    `SELECT transaction_pin FROM profiles WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.transaction_pin ?? null;
}

/**
 * Result of a PIN verification with side effects (attempt counters + lockout).
 *
 * ok:          true  → PIN correct; counter reset
 * locked:      true  → user is (or just became) account_locked due to PIN attempts
 * needsSetup:  true  → no PIN set on profile
 * attemptsLeft: after this call, how many attempts remain before lockout
 */
export interface PinAttemptResult {
  ok: boolean;
  locked: boolean;
  needsSetup: boolean;
  attemptsLeft: number;
  failedAttempts: number;
}

/**
 * Verify a transaction PIN with durable attempt tracking and lockout.
 *
 *  - Locks the profile row with `FOR UPDATE` within a user transaction
 *  - Refuses if `account_locked` already set (must be unlocked by admin)
 *  - On mismatch: increments `failed_pin_attempts`, stamps `last_pin_attempt_at`;
 *    at 5 mismatches sets `account_locked = true` and revokes all sessions
 *  - On match: zeros the counter (keeps last_pin_attempt_at as audit trail)
 *
 * Pass an existing `client` if the caller already holds a txn (e.g. withdrawal)
 * so the PIN lock + balance debit share the same transaction.
 */
export async function verifyAndRecordPinAttempt(
  userId: string,
  pin: string,
  opts: { client?: PoolClient; db?: Pool; lockoutRevokesSessions?: boolean } = {},
): Promise<PinAttemptResult> {
  const runner = async (client: PoolClient): Promise<PinAttemptResult> => {
    const { rows } = await client.query<{
      transaction_pin: string | null;
      account_locked: boolean;
      failed_pin_attempts: number;
    }>(
      `SELECT transaction_pin,
              COALESCE(account_locked, false) AS account_locked,
              COALESCE(failed_pin_attempts, 0)::integer AS failed_pin_attempts
         FROM profiles
        WHERE id = $1
        FOR UPDATE`,
      [userId],
    );
    const profile = rows[0];
    if (!profile) {
      return { ok: false, locked: true, needsSetup: true, attemptsLeft: 0, failedAttempts: 0 };
    }

    if (profile.account_locked) {
      return {
        ok: false,
        locked: true,
        needsSetup: !profile.transaction_pin,
        attemptsLeft: 0,
        failedAttempts: profile.failed_pin_attempts,
      };
    }

    if (!profile.transaction_pin) {
      return {
        ok: false,
        locked: false,
        needsSetup: true,
        attemptsLeft: MAX_PIN_ATTEMPTS,
        failedAttempts: 0,
      };
    }

    const matches = verifyTransactionPin(profile.transaction_pin, userId, pin);
    if (matches) {
      await client.query(
        `UPDATE profiles
            SET failed_pin_attempts = 0,
                last_pin_attempt_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [userId],
      );
      return {
        ok: true,
        locked: false,
        needsSetup: false,
        attemptsLeft: MAX_PIN_ATTEMPTS,
        failedAttempts: 0,
      };
    }

    const nextAttempts = Math.min(profile.failed_pin_attempts + 1, MAX_PIN_ATTEMPTS);
    const willLock = nextAttempts >= MAX_PIN_ATTEMPTS;

    if (willLock) {
      await client.query(
        `UPDATE profiles
            SET failed_pin_attempts = $2,
                account_locked = true,
                last_pin_attempt_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [userId, nextAttempts],
      );
    } else {
      await client.query(
        `UPDATE profiles
            SET failed_pin_attempts = $2,
                last_pin_attempt_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [userId, nextAttempts],
      );
    }

    if (willLock && opts.lockoutRevokesSessions !== false) {
      // Best-effort outside the nested tx; failure does not roll back lock.
      revokeEverySession(userId, false).catch(() => undefined);
    }

    return {
      ok: false,
      locked: willLock,
      needsSetup: false,
      attemptsLeft: Math.max(0, MAX_PIN_ATTEMPTS - nextAttempts),
      failedAttempts: nextAttempts,
    };
  };

  if (opts.client) {
    return runner(opts.client);
  }
  return withUserTransaction(userId, runner);
}

/**
 * Admin / self-service unlock: clears PIN failure counters and the account_locked
 * flag.  Requires the caller to have already verified authority (admin role or
 * email-OTP password-reset flow).
 */
export async function clearPinLockout(
  userId: string,
  opts: { adminId?: string; reason?: string } = {},
): Promise<void> {
  getRailwayDbClient(); // ensure pool initialized (returns the pool synchronously)
  await query(
    `UPDATE profiles
        SET account_locked = false,
            failed_pin_attempts = 0,
            last_pin_attempt_at = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [userId],
  );
  // Optional: write an audit event via the standard audit helper later;
  // opts.adminId / opts.reason reserved for that expansion.
  void opts;
}
