import type { PoolClient } from "pg";
import { createHash } from "crypto";

export type LedgerTransactionType = "credit" | "debit" | "refund" | "reversal";
export type LedgerSource =
  | "deposit"
  | "loan"
  | "bill_payment"
  | "repayment"
  | "admin_adjustment"
  | "withdrawal"
  | "referral"
  | "bank_transfer"
  | "transfer";

export interface LedgerEntryInput {
  userId: string;
  txType: LedgerTransactionType;
  source: LedgerSource;
  reference: string;
  description: string;
  balanceDelta: number;
  lockedDelta?: number;
  sourceDetail?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WalletSnapshot {
  walletId: string;
  balance: number;
  locked: number;
}

export async function getWalletForUpdate(
  client: PoolClient,
  userId: string,
): Promise<WalletSnapshot> {
  const { rows } = await client.query<{
    id: string;
    balance: number;
    locked: number;
  }>(
    `SELECT id,
            COALESCE(balance, 0)::numeric(14,2) AS balance,
            COALESCE(locked, 0)::numeric(14,2) AS locked
       FROM wallets
      WHERE user_id = $1
        FOR UPDATE`,
    [userId],
  );
  const row = rows[0];
  if (!row) throw new Error(`Wallet not found for user ${userId}`);
  return {
    walletId: row.id,
    balance: Number(row.balance),
    locked: Number(row.locked),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function recordWalletMove(
  client: PoolClient,
  input: LedgerEntryInput,
): Promise<WalletSnapshot> {
  const lockedDelta = round2(input.lockedDelta ?? 0);
  const balanceDelta = round2(input.balanceDelta);

  const snap = await getWalletForUpdate(client, input.userId);
  const balanceBefore = snap.balance;
  const lockedBefore = snap.locked;
  const balanceAfter = round2(balanceBefore + balanceDelta);
  const lockedAfter = round2(lockedBefore + lockedDelta);

  if (balanceAfter < 0) {
    throw new Error(
      `Ledger guard: resulting balance would be negative (${balanceAfter}) for user ${input.userId}`,
    );
  }
  if (lockedAfter < 0) {
    throw new Error(
      `Ledger guard: resulting locked would be negative (${lockedAfter}) for user ${input.userId}`,
    );
  }

  const magnitude = Math.max(Math.abs(balanceDelta), Math.abs(lockedDelta));
  const amount = magnitude > 0 ? magnitude : 0.01;

  await client.query(
    `UPDATE wallets
        SET balance = $1::numeric(14,2),
            locked  = $2::numeric(14,2),
            updated_at = NOW()
      WHERE user_id = $3`,
    [balanceAfter, lockedAfter, input.userId],
  );

  await client.query(
    `INSERT INTO wallet_ledger (
       user_id, wallet_id, transaction_type, source,
       amount, balance_before, balance_after,
       locked_before, locked_after,
       amount_delta, locked_delta,
       reference, description, source_detail, metadata, created_at
     ) VALUES (
       $1, $2, $3::wallet_ledger_transaction_type, $4::wallet_ledger_source,
       $5::numeric(14,2), $6::numeric(14,2), $7::numeric(14,2),
       $8::numeric(14,2), $9::numeric(14,2),
       $10::numeric(14,2), $11::numeric(14,2),
       $12, $13, $14, $15::jsonb, NOW()
     )`,
    [
      input.userId,
      snap.walletId,
      input.txType,
      input.source,
      amount,
      balanceBefore,
      balanceAfter,
      lockedBefore,
      lockedAfter,
      balanceDelta,
      lockedDelta,
      input.reference,
      input.description,
      input.sourceDetail ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return { walletId: snap.walletId, balance: balanceAfter, locked: lockedAfter };
}

const MAX_REFERENCE_LENGTH = 120;

/**
 * Build a ledger reference for a business event.
 *
 * Contract (enforced by `wallet_ledger.reference` being UNIQUE):
 *  - DETERMINISTIC: the same (prefix, key, suffix) triple always yields the same
 *    string, so a replayed/retried request can be detected — a second write for
 *    the same business event fails loudly with a UNIQUE violation instead of
 *    silently double-charging. Never pass a `Date.now()`/`Math.random()` value.
 *  - `key` must therefore be a stable business identifier (withdrawal id, loan
 *    id, marketplace item id, provider reference) — NOT a bare user id.
 *  - Prefixes are global and must be unique per money-movement kind.
 *
 * Over-long references are truncated deterministically with a sha256 tail so
 * they stay reproducible and collision-resistant inside the column.
 */
export function buildLedgerRef(prefix: string, key: string, suffix?: string): string {
  const reference = [prefix, key, suffix]
    .filter((part): part is string => Boolean(part))
    .join(":");

  if (reference.length <= MAX_REFERENCE_LENGTH) return reference;

  // 87 + 1 + 32 = 120 characters, fully deterministic for the same input.
  const digest = createHash("sha256").update(reference).digest("hex").slice(0, 32);
  return `${reference.slice(0, 87)}:${digest}`;
}
