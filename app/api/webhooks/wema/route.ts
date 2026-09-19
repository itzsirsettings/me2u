import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/railway/client";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";
import { logApiError, logInfo } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

const WEMA_SECRET = process.env.WEMA_WEBHOOK_SECRET || "";

function verifyWemaSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WEMA_SECRET || !signatureHeader) return false;
  try {
    const expected = createHmac("sha256", WEMA_SECRET).update(rawBody).digest("hex");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
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
 * `ON CONFLICT DO NOTHING RETURNING id` yields a row exactly once per event ref —
 * even when two deliveries race (the previous COUNT-then-INSERT did not).
 */
async function ensureProcessedUnique(eventRef: string): Promise<boolean> {
  if (!eventRef) return true;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO provider_webhooks (provider, reference, processed, created_at)
     VALUES ('wema', $1, true, NOW())
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [eventRef],
  );
  return rows.length > 0;
}

async function findUserIdByWemaAccount(
  accountNumber: string,
  customerRef?: string,
): Promise<string | null> {
  if (customerRef) {
    const { rows: crRows } = await query<{ user_id: string }>(
      `SELECT user_id FROM virtual_accounts WHERE provider = 'wema' AND provider_reference = $1 LIMIT 1`,
      [customerRef],
    );
    if (crRows[0]?.user_id) return crRows[0].user_id;
  }
  if (accountNumber) {
    const { rows: anRows } = await query<{ user_id: string }>(
      `SELECT user_id FROM virtual_accounts WHERE provider = 'wema' AND account_number = $1 LIMIT 1`,
      [accountNumber],
    );
    if (anRows[0]?.user_id) return anRows[0].user_id;
  }
  return null;
}

async function handleInflow(payload: any): Promise<void> {
  const amount = Number(payload?.amount || payload?.Amount || 0);
  if (amount <= 0) return;

  const accountNumber = String(
    payload?.virtualAccountNumber || payload?.account_number || payload?.AccountNumber || "",
  ).trim();
  const customerRef = String(
    payload?.customerReference || payload?.customer_reference || payload?.CustomerRef || "",
  ).trim();
  const providerRef = String(
    payload?.transactionReference ||
      payload?.transaction_reference ||
      payload?.reference ||
      payload?.Reference ||
      "",
  ).trim();
  if (!providerRef) {
    logApiError("wema:inflow:no_reference", { accountNumber });
    return;
  }
  const senderName = String(
    payload?.senderAccountName || payload?.sender_name || payload?.SourceAccountName || "",
  ).trim();
  const senderAccount = String(
    payload?.senderAccountNumber ||
      payload?.sender_account ||
      payload?.SourceAccountNumber ||
      "",
  ).trim();
  const narration = String(
    payload?.narration ||
      payload?.Narration ||
      payload?.PaymentNarration ||
      "Wema virtual account transfer",
  ).trim();

  const userId = await findUserIdByWemaAccount(accountNumber, customerRef);
  if (!userId) {
    logApiError("wema:inflow:no_user", { accountNumber, customerRef, providerRef });
    return;
  }

  const existing = await query<{ id: string }>(
    `SELECT id FROM wallet_inflows WHERE provider = 'wema' AND provider_reference = $1 LIMIT 1`,
    [providerRef],
  );
  if (existing.rows.length > 0) {
    logInfo("wema:inflow:duplicate_skipped", { userId, providerRef });
    return;
  }

  let credited = false;
  await withTransaction(async (client) => {
    const { rows: wRows } = await client.query<{ id: string }>(
      `SELECT id FROM wallets WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const walletId = wRows[0]?.id ?? null;

    const { rows: vaRows } = await client.query<{ id: string }>(
      `SELECT id FROM virtual_accounts WHERE provider = 'wema' AND (account_number = $1 OR provider_reference = $2) LIMIT 1`,
      [accountNumber, customerRef],
    );
    const virtualAccountId = vaRows[0]?.id ?? null;

    // Atomic claim: `wallet_inflows` carries UNIQUE (provider, provider_reference),
    // so writing the inflow BEFORE the credit guarantees exactly one credit even
    // when the provider delivers the same notification twice concurrently.
    const { rows: claimed } = await client.query<{ id: string }>(
      `INSERT INTO wallet_inflows
         (user_id, wallet_id, virtual_account_id, provider, provider_reference, amount, currency,
          status, sender_name, sender_account_number, narration, raw_payload, credited_at, created_at)
       VALUES ($1, $2, $3, 'wema', $4, $5::numeric(14,2), 'NGN',
          'successful', $6, $7, $8, $9::jsonb, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        userId,
        walletId,
        virtualAccountId,
        providerRef,
        amount,
        senderName || null,
        senderAccount || null,
        narration,
        JSON.stringify(payload),
      ],
    );
    if (claimed.length === 0) return;

    await recordWalletMove(client, {
      userId,
      txType: "credit",
      source: "bank_transfer",
      reference: buildLedgerRef("wema-dep", providerRef),
      description: `Wema virtual account funding: ₦${amount.toLocaleString()} (${narration})`,
      balanceDelta: amount,
      metadata: {
        accountNumber,
        customerRef,
        providerReference: providerRef,
        senderName,
        senderAccount,
      },
    });

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, created_at)
       VALUES ($1, 'deposit', $2::numeric(14,2), $3, NOW())`,
      [userId, amount, `Wema virtual account funding ref ${providerRef}`],
    );
    credited = true;
  });

  logInfo("wema:inflow:credited", { userId, amount, providerRef, credited });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-wema-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("signature");

  if (!verifyWemaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = String(
    payload?.event || payload?.EventType || payload?.notificationType || "inflow",
  ).toLowerCase();
  // No Date.now() fallback: a fabricated reference defeats at-least-once dedup.
  const eventRef = String(
    payload?.reference ||
      payload?.Reference ||
      payload?.transactionReference ||
      payload?.transaction_reference ||
      "",
  ).trim();
  if (!eventRef) {
    // Without a provider reference we cannot dedup or reconcile this delivery.
    logApiError("wema:webhook:missing_reference", { eventType });
    return NextResponse.json({ ok: true, skipped: "missing_reference" });
  }

  try {
    const fresh = await ensureProcessedUnique(eventRef);
    if (!fresh) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  } catch (err) {
    logApiError("wema:dedup_check_failed", err);
  }

  try {
    if (
      eventType.includes("inflow") ||
      eventType.includes("payment") ||
      eventType.includes("credit") ||
      payload?.amount ||
      payload?.Amount
    ) {
      await handleInflow(payload);
    }
  } catch (err) {
    logApiError(`wema:handler:${eventType}`, err);
    return NextResponse.json({ error: "Processing error, will retry" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
