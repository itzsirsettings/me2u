import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/railway/client";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";
import { logApiError, logInfo } from "@/lib/server/logger";
import { WITHDRAWAL_IN_FLIGHT_SQL } from "@/lib/server/withdrawal-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

const PS_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!PS_SECRET || !signatureHeader) return false;
  try {
    const expected = createHmac("sha512", PS_SECRET).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * At-least-once webhook dedup.
 *
 * The INSERT *is* the lock: `provider_webhooks` carries
 * UNIQUE (provider, reference) since migration 20260920000001, so
 * `ON CONFLICT DO NOTHING RETURNING id` yields a row exactly once per event id —
 * even when two deliveries race (the previous COUNT-then-INSERT did not).
 * A truthful `false` is only returned when a row already exists.
 */
async function ensureProcessedUnique(eventId: string): Promise<boolean> {
  if (!eventId) return true;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO provider_webhooks (provider, reference, processed, created_at)
     VALUES ('paystack', $1, true, NOW())
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [eventId],
  );
  return rows.length > 0;
}

function ngnFromKobo(kobo: number): number {
  return Math.round((Number(kobo) / 100) * 100) / 100;
}

async function findUserIdByPaystackCustomer(payload: any): Promise<string | null> {
  const customerCode = String(payload?.data?.customer?.customer_code || "").trim();
  const email = String(payload?.data?.customer?.email || "")
    .trim()
    .toLowerCase();
  const accountNumber = String(payload?.data?.dedicated_account?.account_number || "").trim();

  if (customerCode) {
    const { rows } = await query<{ user_id: string }>(
      `SELECT user_id FROM paystack_dedicated_accounts WHERE customer_code = $1 LIMIT 1`,
      [customerCode],
    );
    if (rows[0]?.user_id) return rows[0].user_id;
  }

  if (accountNumber) {
    const { rows } = await query<{ user_id: string }>(
      `SELECT user_id FROM paystack_dedicated_accounts WHERE account_number = $1 LIMIT 1`,
      [accountNumber],
    );
    if (rows[0]?.user_id) return rows[0].user_id;
  }

  if (email) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM auth_users WHERE email = $1 LIMIT 1`,
      [email],
    );
    if (rows[0]?.id) return rows[0].id;
  }

  const metadataEmail = String(payload?.data?.metadata?.email || "")
    .trim()
    .toLowerCase();
  const metadataUserId = String(
    payload?.data?.metadata?.user_id || payload?.data?.metadata?.userId || "",
  ).trim();
  if (metadataUserId) return metadataUserId;
  if (metadataEmail) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM auth_users WHERE email = $1 LIMIT 1`,
      [metadataEmail],
    );
    if (rows[0]?.id) return rows[0].id;
  }
  return null;
}

async function handleChargeSuccess(eventId: string, payload: any): Promise<void> {
  const data = payload?.data ?? {};
  const amount = ngnFromKobo(Number(data.amount || 0));
  if (amount <= 0) return;

  const userId = await findUserIdByPaystackCustomer(payload);
  if (!userId) {
    logApiError("paystack/charge.success:no_user", {
      eventId,
      reference: data.reference,
      customer: data.customer,
    });
    return;
  }

  const providerRef = String(data.reference || eventId);
  const existing = await query<{ id: string }>(
    `SELECT id FROM wallet_inflows WHERE provider = 'paystack' AND provider_reference = $1 LIMIT 1`,
    [providerRef],
  );
  if (existing.rows.length > 0) {
    logInfo("paystack:charge.success:duplicate_skipped", { userId, reference: providerRef });
    return;
  }

  const senderName =
    String(data?.customer?.first_name || "") + " " + String(data?.customer?.last_name || "") ||
    data?.authorization?.receiver_bank ||
    null;

  const narration = String(data?.narration || "Paystack deposit");

  let credited = false;
  await withTransaction(async (client) => {
    const { rows: wRows } = await client.query<{ id: string }>(
      `SELECT id FROM wallets WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const walletId = wRows[0]?.id ?? null;

    // Atomic claim: `wallet_inflows` carries UNIQUE (provider, provider_reference),
    // so writing the inflow BEFORE the credit means exactly one concurrent
    // delivery can claim it. The loser gets zero rows back and must not credit.
    const { rows: claimed } = await client.query<{ id: string }>(
      `INSERT INTO wallet_inflows
         (user_id, wallet_id, provider, provider_reference, amount, currency,
          status, sender_name, sender_account_number, narration, raw_payload, credited_at, created_at)
       VALUES ($1, $2, 'paystack', $3, $4::numeric(14,2), 'NGN',
          'successful', $5, $6, $7, $8::jsonb, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        userId,
        walletId,
        providerRef,
        amount,
        senderName,
        data?.dedicated_account?.account_number ?? null,
        narration,
        JSON.stringify(data),
      ],
    );
    if (claimed.length === 0) return;

    await recordWalletMove(client, {
      userId,
      txType: "credit",
      source: "deposit",
      reference: buildLedgerRef("ps-chg", providerRef),
      description: `Wallet funding via Paystack: ₦${amount.toLocaleString()} (${narration})`,
      balanceDelta: amount,
      metadata: {
        event: "charge.success",
        eventId,
        providerReference: providerRef,
        channel: data.channel,
        paymentMethod: data?.authorization?.channel,
      },
    });

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, created_at)
       VALUES ($1, 'deposit', $2::numeric(14,2), $3, NOW())`,
      [userId, amount, `Wallet funding via Paystack reference ${providerRef}`],
    );
    credited = true;
  });

  logInfo("paystack:charge.success:credited", {
    userId,
    amount,
    reference: providerRef,
    credited,
  });
}

async function handleTransferSuccess(eventId: string, payload: any): Promise<void> {
  const data = payload?.data ?? {};
  const transferCode = String(data.transfer_code || "");
  const reference = String(data.reference || "");
  if (!transferCode && !reference) return;

  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `UPDATE withdrawal_requests
          SET status = 'success',
              paystack_reference = COALESCE($1, paystack_reference),
              updated_at = NOW()
        WHERE (paystack_transfer_code = $2 OR paystack_reference = $1)
          AND status IN (${WITHDRAWAL_IN_FLIGHT_SQL})
        RETURNING id`,
      [reference, transferCode],
    );
    if (rows[0]) {
      logInfo("paystack:transfer.success:updated", {
        withdrawalId: rows[0].id,
        transferCode,
      });
    }
  });
}

async function handleTransferFailed(eventId: string, payload: any): Promise<void> {
  const data = payload?.data ?? {};
  const transferCode = String(data.transfer_code || "");
  const reference = String(data.reference || "");
  const reason = String(data.reason || data.failurereason || "Transfer failed");
  if (!transferCode && !reference) return;

  await withTransaction(async (client) => {
    const { rows: wrRows } = await client.query<{
      id: string;
      user_id: string;
      amount: number;
      fee: number;
    }>(
      `SELECT id, user_id, amount, fee
         FROM withdrawal_requests
        WHERE (paystack_transfer_code = $1 OR paystack_reference = $2)
          AND status IN (${WITHDRAWAL_IN_FLIGHT_SQL})
          FOR UPDATE`,
      [transferCode, reference],
    );

    const req = wrRows[0];
    if (!req) return;
    const totalReversed = Number(req.amount) + Number(req.fee || 0);

    await recordWalletMove(client, {
      userId: req.user_id,
      txType: "reversal",
      source: "withdrawal",
      reference: buildLedgerRef("wdr-rev-tx", req.id),
      description: `Withdrawal reversal: Paystack transfer failed (${reason})`,
      balanceDelta: totalReversed,
      sourceDetail: req.id,
      metadata: {
        event: "transfer.failed",
        eventId,
        transferCode,
        reason,
      },
    });

    await client.query(
      `UPDATE withdrawal_requests
          SET status = 'failed',
              admin_note = $1,
              updated_at = NOW()
        WHERE id = $2`,
      [`Paystack transfer failed: ${reason}`, req.id],
    );
  });

  logInfo("paystack:transfer.failed:reversed", { transferCode, reason });
}

async function handleDvaPaymentCreated(eventId: string, payload: any): Promise<void> {
  const data = payload?.data ?? {};
  const amount = ngnFromKobo(Number(data.amount || 0));
  if (amount <= 0) return;
  const accountNumber = String(data?.dedicated_account?.account_number || "");
  if (!accountNumber) return;

  const { rows: accRows } = await query<{ user_id: string }>(
    `SELECT user_id FROM paystack_dedicated_accounts WHERE account_number = $1 LIMIT 1`,
    [accountNumber],
  );
  const userId = accRows[0]?.user_id;
  if (!userId) {
    logApiError("paystack:dva:no_user", { eventId, accountNumber });
    return;
  }
  const providerRef = String(data?.reference || eventId);
  const existing = await query<{ id: string }>(
    `SELECT id FROM wallet_inflows WHERE provider = 'paystack' AND provider_reference = $1 LIMIT 1`,
    [providerRef],
  );
  if (existing.rows.length > 0) {
    logInfo("paystack:dva:duplicate_skipped", { userId, reference: providerRef });
    return;
  }

  const senderName = String(data?.sender_name || data?.sender?.name || "");
  const senderAccount = String(data?.sender_bank_account_number || "");
  const narration = String(data?.narration || "DVA transfer");

  let credited = false;
  await withTransaction(async (client) => {
    const { rows: wRows } = await client.query<{ id: string }>(
      `SELECT id FROM wallets WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const walletId = wRows[0]?.id ?? null;

    // Atomic claim — see handleChargeSuccess for the rationale.
    const { rows: claimed } = await client.query<{ id: string }>(
      `INSERT INTO wallet_inflows
         (user_id, wallet_id, provider, provider_reference, amount, currency,
          status, sender_name, sender_account_number, narration, raw_payload, credited_at, created_at)
       VALUES ($1, $2, 'paystack', $3, $4::numeric(14,2), 'NGN',
          'successful', $5, $6, $7, $8::jsonb, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        userId,
        walletId,
        providerRef,
        amount,
        senderName,
        senderAccount,
        narration,
        JSON.stringify(data),
      ],
    );
    if (claimed.length === 0) return;

    await recordWalletMove(client, {
      userId,
      txType: "credit",
      source: "bank_transfer",
      reference: buildLedgerRef("ps-dva", providerRef),
      description: `DVA funding via Paystack: ₦${amount.toLocaleString()} (${narration})`,
      balanceDelta: amount,
      metadata: {
        event: "dedicatedaccount.paymentcreated",
        eventId,
        accountNumber,
        senderName,
        senderAccount,
      },
    });

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, created_at)
       VALUES ($1, 'deposit', $2::numeric(14,2), $3, NOW())`,
      [userId, amount, `DVA transfer funding reference ${providerRef}`],
    );
    credited = true;
  });

  logInfo("paystack:dva:credited", { userId, amount, accountNumber, credited });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = String(payload?.event || "unknown");
  const eventId = String(payload?.id || payload?.data?.id || `evt:${event}:${Date.now()}`);

  try {
    const fresh = await ensureProcessedUnique(eventId);
    if (!fresh) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  } catch (err) {
    logApiError("paystack:dedup_check_failed", err);
  }

  try {
    switch (event) {
      case "charge.success":
        await handleChargeSuccess(eventId, payload);
        break;
      case "transfer.success":
        await handleTransferSuccess(eventId, payload);
        break;
      case "transfer.failed":
      case "transfer.reversed":
        await handleTransferFailed(eventId, payload);
        break;
      case "dedicatedaccount.paymentcreated":
      case "dedicated_account.payment_created":
        await handleDvaPaymentCreated(eventId, payload);
        break;
      default:
        break;
    }
  } catch (err) {
    logApiError(`paystack:handler:${event}`, err);
    return NextResponse.json({ error: "Processing error, will retry" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
