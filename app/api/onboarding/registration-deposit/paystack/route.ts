import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { logWarn } from "@/lib/server/logger";
import {
  completeRegistrationDepositCharge,
  readRegistrationDepositTransferDetails,
} from "@/lib/server/registration-deposit-paystack";

export const dynamic = "force-dynamic";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const REGISTRATION_DEPOSIT_KOBO = 200_000;
const REGISTRATION_DEPOSIT_NGN = 2_000;

type JsonRecord = Record<string, unknown>;
type RegistrationPaymentRow = {
  id: string;
  reference: string;
  amount: number;
  status: string;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  transaction_reference: string | null;
  expires_at: string;
  created_at: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function paymentResponse(
  details: NonNullable<ReturnType<typeof readRegistrationDepositTransferDetails>>,
) {
  return {
    reference: details.reference,
    accountName: details.accountName,
    accountNumber: details.accountNumber,
    bankName: details.bankName,
    transactionReference: details.transactionReference,
    expiresAt: details.expiresAt,
    status: details.status,
  };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`registration-paystack-ip:${ip}`, 30, 15 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    const userId = auth.user.id;

    if (auth.user.registrationDepositPaid) {
      return NextResponse.json(
        { error: "The registration deposit has already been confirmed." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (await isRateLimited(`registration-paystack-user:${userId}`, 8, 60 * 60_000)) {
      return tooManyRequestsResponse("Too many payment attempts. Try again later.");
    }
    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: "Paystack Transfer is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    await auth.db.query(
      `UPDATE registration_deposit_payments
          SET status = 'expired', updated_at = NOW()
        WHERE user_id = $1 AND status IN ('initializing', 'pending') AND expires_at <= NOW()`,
      [userId],
    );
    const { rows: reviewRows } = await auth.db.query<{ reference: string }>(
      `SELECT reference FROM registration_deposit_payments
        WHERE user_id = $1 AND status = 'review'
        ORDER BY updated_at DESC LIMIT 1`,
      [userId],
    );
    if (reviewRows[0]) {
      return NextResponse.json(
        {
          error: `A previous transfer needs support review. Contact support in the app with reference ${reviewRows[0].reference}.`,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    const { rows: existingRows } = await auth.db.query<RegistrationPaymentRow>(
      `SELECT reference, account_name, account_number, bank_name,
              transaction_reference, expires_at, status
         FROM registration_deposit_payments
        WHERE user_id = $1 AND status IN ('initializing', 'pending')
        LIMIT 1`,
      [userId],
    );
    const existing = readRegistrationDepositTransferDetails(existingRows[0]);
    if (existing) {
      if (existing.status !== "pending") {
        return NextResponse.json(
          { error: "Your Paystack Transfer is being prepared. Refresh in a moment." },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json(
        { ok: true, payment: paymentResponse(existing) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const reference = `regdep-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60_000).toISOString();
    const { rows: createdRows } = await auth.db.query<{ id: string }>(
      `INSERT INTO registration_deposit_payments
         (user_id, reference, amount, currency, status, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'NGN', 'initializing', $4, NOW(), NOW())
       ON CONFLICT (user_id) WHERE status IN ('initializing', 'pending') DO NOTHING
       RETURNING id`,
      [userId, reference, REGISTRATION_DEPOSIT_NGN, expiresAt],
    );
    if (!createdRows[0]) {
      return NextResponse.json(
        { error: "A Paystack Transfer is already being prepared. Refresh in a moment." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    let response: Response;
    try {
      response = await fetch("https://api.paystack.co/charge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: auth.user.email,
          amount: String(REGISTRATION_DEPOSIT_KOBO),
          currency: "NGN",
          reference,
          bank_transfer: { account_expires_at: expiresAt },
          metadata: { type: "registration_deposit", user_id: userId },
        }),
      });
    } catch {
      await auth.db.query(
        `UPDATE registration_deposit_payments SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [createdRows[0].id],
      );
      return NextResponse.json(
        { error: "Could not start Paystack Transfer. Please try again." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    const provider = isRecord(payload) ? payload : null;
    const data = isRecord(provider?.data) ? provider.data : null;
    const bank = isRecord(data?.bank) ? data.bank : null;
    const accountName = typeof data?.account_name === "string" ? data.account_name : "";
    const accountNumber = typeof data?.account_number === "string" ? data.account_number : "";
    const bankName = typeof bank?.name === "string" ? bank.name : "";
    const providerReference = typeof data?.reference === "string" ? data.reference : "";
    const transactionReference =
      typeof data?.transaction_reference === "string" ? data.transaction_reference : "";
    const providerAmount = Number(data?.amount ?? REGISTRATION_DEPOSIT_KOBO);
    const providerCurrency = typeof data?.currency === "string" ? data.currency : "NGN";

    if (
      !response.ok ||
      provider?.status !== true ||
      data?.status !== "pending_bank_transfer" ||
      providerReference !== reference ||
      providerAmount !== REGISTRATION_DEPOSIT_KOBO ||
      providerCurrency !== "NGN" ||
      !accountName ||
      !/^\d{10}$/.test(accountNumber) ||
      !bankName ||
      !transactionReference
    ) {
      await auth.db.query(
        `UPDATE registration_deposit_payments SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [createdRows[0].id],
      );
      return NextResponse.json(
        { error: "Paystack could not create a transfer account. Please try again." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { rows: savedRows } = await auth.db.query(
      `UPDATE registration_deposit_payments
          SET status = CASE WHEN status = 'success' THEN 'success' ELSE 'pending' END,
              account_name = $1, account_number = $2,
              bank_name = $3, transaction_reference = $4, updated_at = NOW()
        WHERE id = $5 AND status IN ('initializing', 'success')
        RETURNING reference, account_name, account_number, bank_name,
                  transaction_reference, expires_at, status`,
      [accountName, accountNumber, bankName, transactionReference, createdRows[0].id],
    );
    const payment = readRegistrationDepositTransferDetails(savedRows[0]);
    if (!payment) {
      const { rows: finalRows } = await auth.db.query(
        `SELECT reference, account_name, account_number, bank_name,
                transaction_reference, expires_at, status
           FROM registration_deposit_payments WHERE id = $1`,
        [createdRows[0].id],
      );
      const finalized = readRegistrationDepositTransferDetails(finalRows[0]);
      if (!finalized) {
        return NextResponse.json(
          { error: "Paystack Transfer was started. Refresh this page to check its status." },
          { status: 202, headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json(
        { ok: true, payment: paymentResponse(finalized) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, payment: paymentResponse(payment) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "Unable to start Paystack Transfer.");
  }
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`registration-paystack-status-ip:${ip}`, 400, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (
      await isRateLimited(`registration-paystack-status-user:${auth.user.id}`, 160, 60 * 60_000)
    ) {
      return tooManyRequestsResponse("Too many payment status checks. Please wait a moment.");
    }
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference");
    const { rows } = await auth.db.query<RegistrationPaymentRow>(
      `SELECT id, reference, amount, status, account_name, account_number,
              bank_name, transaction_reference, expires_at, created_at
         FROM registration_deposit_payments
        WHERE user_id = $1 AND ($2::text IS NULL OR reference = $2)
        ORDER BY created_at DESC
        LIMIT 1`,
      [auth.user.id, reference],
    );
    const paymentRow = rows[0];
    const payment = readRegistrationDepositTransferDetails(paymentRow);
    if (!payment || !paymentRow) {
      return NextResponse.json({ payment: null }, { headers: { "Cache-Control": "no-store" } });
    }

    if (
      payment.status === "pending" &&
      PAYSTACK_SECRET &&
      Date.now() - new Date(String(paymentRow.created_at)).getTime() >= 10_000
    ) {
      try {
        const verification = await fetch(
          `https://api.paystack.co/charge/${encodeURIComponent(payment.reference)}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, cache: "no-store" },
        );
        const payload: unknown = await verification.json().catch(() => null);
        const provider = isRecord(payload) ? payload : null;
        const transaction = isRecord(provider?.data) ? provider.data : null;
        if (verification.ok && provider?.status === true && transaction) {
          if (transaction.status === "success") {
            await completeRegistrationDepositCharge(transaction, `verify:${payment.reference}`);
          } else if (transaction.status === "failed") {
            await auth.db.query(
              `UPDATE registration_deposit_payments SET status = 'failed', updated_at = NOW()
                WHERE id = $1 AND status = 'pending'`,
              [paymentRow.id],
            );
            payment.status = "failed";
          }
        }
      } catch {
        logWarn("registration_paystack_status_check_failed", {
          userId: auth.user.id,
          reference: payment.reference,
        });
      }
    }

    if (payment.status === "pending" && Date.now() >= new Date(payment.expiresAt).getTime()) {
      await auth.db.query(
        `UPDATE registration_deposit_payments SET status = 'expired', updated_at = NOW()
          WHERE id = $1 AND status = 'pending'`,
        [paymentRow.id],
      );
    }

    const { rows: latestRows } = await auth.db.query<RegistrationPaymentRow>(
      `SELECT reference, account_name, account_number, bank_name,
              transaction_reference, expires_at, status
         FROM registration_deposit_payments WHERE id = $1`,
      [paymentRow.id],
    );
    const latest = readRegistrationDepositTransferDetails(latestRows[0]);
    return NextResponse.json(
      { payment: latest ? paymentResponse(latest) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "Unable to check Paystack Transfer status.");
  }
}
