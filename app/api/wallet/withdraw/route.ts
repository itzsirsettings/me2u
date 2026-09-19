import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { getWithdrawalProcessorFee, withdrawalFeeAmount } from "@/lib/revenue";
import { verifyAndRecordPinAttempt, type PinAttemptResult } from "@/lib/server/pin";
import { withTransaction, withUserTransaction } from "@/lib/railway/client";
import {
  readIdempotencyKey,
  replayIfDuplicate,
  rememberIdempotentResponse,
  requestMeta,
} from "@/lib/server/idempotency";
import { randomUUID } from "crypto";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";
import { logWarn } from "@/lib/server/logger";
import { isUniqueViolation } from "@/lib/server/pg-errors";
import {
  WITHDRAWAL_IN_FLIGHT_SQL,
  WITHDRAWAL_QUEUED_STATUS,
  withdrawalTransferReference,
} from "@/lib/server/withdrawal-status";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const MIN_WITHDRAWAL = 1000;

const DUPLICATE_WITHDRAWAL_MESSAGE =
  "You already have a withdrawal in progress. Wait for it to finish before starting another.";

async function createPaystackRecipient(
  accountName: string,
  accountNumber: string,
  bankCode: string,
) {
  const res = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Failed to create transfer recipient");
  return data.data;
}

async function resolvePaystackAccount(accountNumber: string, bankCode: string) {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });
  const res = await fetch(`https://api.paystack.co/bank/resolve?${params}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const data = await res.json();
  if (!data.status || !data.data?.account_name) {
    throw new Error("Could not verify the destination bank account.");
  }
  return String(data.data.account_name).trim();
}

async function initiatePaystackTransfer(
  recipientCode: string,
  amountInKobo: number,
  reason: string,
  reference: string,
) {
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: amountInKobo,
      recipient: recipientCode,
      reason,
      reference,
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Transfer failed");
  return data.data;
}

/**
 * Withdrawal reference helper lives in `@/lib/server/withdrawal-status`
 * (single source of truth, shared with the reconciliation cron).
 */

function pinResultToError(result: PinAttemptResult): Error | null {
  if (result.ok) return null;
  if (result.needsSetup)
    return new Error("Please set a transaction PIN in your security settings first.");
  if (result.locked) {
    return new Error(
      "Too many incorrect PIN attempts. Your account is locked; please use password reset to unlock.",
    );
  }
  const suffix =
    result.attemptsLeft > 0
      ? ` ${result.attemptsLeft} attempt${
          result.attemptsLeft === 1 ? "" : "s"
        } left before lockout.`
      : "";
  return new Error(`Incorrect transaction PIN.${suffix}`);
}

export async function POST(request: Request) {
  const route = "api/wallet/withdraw";
  try {
    const meta = requestMeta(request);

    const clientIp = getClientIp(request);
    if (await isRateLimited(`wallet-withdraw-ip:${clientIp}`, 100, 15 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (await isRateLimited(`wallet-withdraw-user:${auth.user.id}`, 50, 60 * 60_000)) {
      return tooManyRequestsResponse(
        "Too many withdrawal attempts. Please try again in one hour.",
      );
    }

    if (await isRateLimited(`wallet-withdraw-pin:${auth.user.id}`, 10, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const idempotencyKey = readIdempotencyKey(request);
    const duplicate = await replayIfDuplicate(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
    });
    if (duplicate) return duplicate;

    const body = await request.json();
    const amount = readPositiveAmount(body.amount);
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const bankCode = String(body.bank_code || "").trim();
    const accountNumber = String(body.account_number || "").trim();
    const accountName = String(body.account_name || "").trim();
    const userId = auth.user.id;

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.` },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        {
          error: "Withdrawal service is not configured. Please contact support.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!/^\d{3,6}$/.test(bankCode))
      throw new Error("Select and verify your bank before withdrawal.");
    if (!/^\d{10}$/.test(accountNumber))
      throw new Error("Enter a valid 10-digit account number.");
    if (accountName.length < 2 || accountName.length > 120) {
      throw new Error("Verify the destination account name before withdrawal.");
    }

    const { rows: profileRows } = await auth.db.query<{
      registration_deposit_paid: boolean;
      kyc_verified: boolean;
      account_unlocked: boolean;
      verified_referral_count: number;
      created_at: string;
      unlock_eligible_at: string | null;
      unlock_payment_made: boolean;
      has_subscription: boolean;
      days_since_registration: number;
    }>(
      `SELECT 
         p.registration_deposit_paid, 
         p.kyc_verified, 
         COALESCE(p.account_unlocked, false) as account_unlocked,
         COALESCE(p.verified_referral_count, 0) as verified_referral_count,
         p.created_at,
         p.unlock_eligible_at,
         EXISTS (
           SELECT 1 FROM account_unlock_payments 
           WHERE user_id = p.id AND status = 'success' AND amount >= 2000
         ) as unlock_payment_made,
         EXISTS (
           SELECT 1 FROM subscriptions 
           WHERE user_id = p.id 
             AND status IN ('active', 'trialing')
             AND plan IN ('plus_monthly', 'plus_annual', 'lender_pro_monthly', 'lender_pro_volume')
             AND current_period_end > NOW()
         ) as has_subscription,
         EXTRACT(DAY FROM NOW() - p.created_at)::integer as days_since_registration
       FROM profiles p
       WHERE p.id = $1`,
      [userId],
    );
    const profile = profileRows[0];
    if (!profile) throw new Error("Profile not found.");
    if (!profile.registration_deposit_paid)
      throw new Error("Confirm your registration deposit before withdrawal.");
    if (!profile.kyc_verified) throw new Error("Complete KYC before withdrawal.");

    if (!profile.account_unlocked) {
      let unlocked = false;
      if (profile.has_subscription) {
        await auth.db.query(
          `UPDATE profiles 
           SET account_unlocked = true, 
               unlock_method = 'subscription',
               account_unlock_paid_at = NOW()
           WHERE id = $1`,
          [userId],
        );
        unlocked = true;
      } else if (profile.verified_referral_count >= 10) {
        await auth.db.query(
          `UPDATE profiles 
           SET account_unlocked = true, 
               unlock_method = 'referrals',
               account_unlock_paid_at = NOW()
           WHERE id = $1`,
          [userId],
        );
        unlocked = true;
      } else if (
        profile.unlock_payment_made &&
        profile.unlock_eligible_at &&
        new Date(profile.unlock_eligible_at) <= new Date()
      ) {
        await auth.db.query(
          `UPDATE profiles 
           SET account_unlocked = true, 
               unlock_method = 'time_based',
               account_unlock_paid_at = NOW()
           WHERE id = $1`,
          [userId],
        );
        unlocked = true;
      }

      if (!unlocked) {
        const daysRemaining =
          profile.unlock_payment_made && profile.unlock_eligible_at
            ? Math.ceil(
                (new Date(profile.unlock_eligible_at).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
            : null;
        const unlockOptions: string[] = [];
        if (profile.unlock_payment_made && daysRemaining !== null && daysRemaining > 0) {
          unlockOptions.push(
            `Wait ${daysRemaining} more day${
              daysRemaining !== 1 ? "s" : ""
            } (payment received, unlock on ${new Date(
              profile.unlock_eligible_at!,
            ).toLocaleDateString("en-NG")})`,
          );
        } else if (!profile.unlock_payment_made) {
          unlockOptions.push(`Pay ₦2,000 one-time fee, then wait 15 days`);
        }
        const referralsNeeded = 10 - profile.verified_referral_count;
        if (referralsNeeded > 0) {
          unlockOptions.push(
            `Refer ${referralsNeeded} more verified user${
              referralsNeeded !== 1 ? "s" : ""
            } (${profile.verified_referral_count}/10) for instant unlock`,
          );
        }
        unlockOptions.push(
          `Upgrade to Me2U Plus (₦1,500/month) for instant unlock + premium features`,
        );

        return NextResponse.json(
          {
            error: "account_locked",
            message: `Your account is locked. Choose an unlock option:`,
            unlock_options: unlockOptions,
            current_status: {
              days_since_registration: profile.days_since_registration,
              payment_made: profile.unlock_payment_made,
              days_remaining: daysRemaining,
              unlock_eligible_at: profile.unlock_eligible_at,
              verified_referrals: profile.verified_referral_count,
              referrals_needed: Math.max(0, 10 - profile.verified_referral_count),
              has_subscription: profile.has_subscription,
            },
            unlock_fee: 2000,
            upgrade_url: "/profile/upgrade",
          },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const pinResult = await verifyAndRecordPinAttempt(userId, pin, {
      lockoutRevokesSessions: true,
    });
    if (!pinResult.ok) {
      const err = pinResultToError(pinResult);
      try {
        logWarn("withdraw_pin_failed", {
          userId,
          locked: pinResult.locked,
          failedAttempts: pinResult.failedAttempts,
          attemptsLeft: pinResult.attemptsLeft,
          ip: meta.ip,
        });
      } catch {
        // ignore
      }
      throw err!;
    }

    const { rows: secRows } = await auth.db.query<{ wallet_frozen: boolean }>(
      `SELECT wallet_frozen FROM user_security_settings WHERE user_id = $1`,
      [userId],
    );
    if (secRows[0]?.wallet_frozen) {
      throw new Error(
        "Your wallet is frozen. Unfreeze it from Security Center before withdrawals.",
      );
    }

    const { rows: loanRows } = await auth.db.query(
      `SELECT id FROM loans WHERE borrower_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );
    if (loanRows.length > 0) {
      throw new Error(
        "You must repay all outstanding loans before you can withdraw your capital.",
      );
    }

    // Friendly fast path. The authoritative guard is the partial UNIQUE index
    // idx_withdrawal_requests_one_pending_per_user (SQLSTATE 23505 below), which
    // covers the concurrent-double-submit race this SELECT cannot.
    const { rows: pendingRows } = await auth.db.query(
      `SELECT id FROM withdrawal_requests
        WHERE user_id = $1 AND status IN (${WITHDRAWAL_IN_FLIGHT_SQL})
        LIMIT 1`,
      [userId],
    );
    if (pendingRows.length > 0) throw new Error(DUPLICATE_WITHDRAWAL_MESSAGE);

    const fee_amount = withdrawalFeeAmount;
    const paystackFee = getWithdrawalProcessorFee(amount);
    const totalFee = paystackFee + fee_amount;
    const netAmount = amount;

    const resolvedAccountName = await resolvePaystackAccount(accountNumber, bankCode);

    // The withdrawal id is minted before the debit so every ledger entry for this
    // request can carry a deterministic, reconcilable reference.
    const requestId = randomUUID();
    await withUserTransaction(userId, async (client) => {
      const pinAgain = await verifyAndRecordPinAttempt(userId, pin, {
        client,
        lockoutRevokesSessions: false,
      });
      if (!pinAgain.ok) {
        throw pinResultToError(pinAgain)!;
      }

      await recordWalletMove(client, {
        userId,
        txType: "debit",
        source: "withdrawal",
        reference: buildLedgerRef("wdr-debit", requestId),
        description: `Withdrawal of ₦${amount.toLocaleString()} to ${resolvedAccountName} (fee ₦${totalFee.toLocaleString()})`,
        balanceDelta: -(amount + totalFee),
        metadata: {
          withdrawalAmount: amount,
          feeAmount: withdrawalFeeAmount,
          processorFee: paystackFee,
          totalFee,
          bankCode,
          accountNumber,
          accountName: resolvedAccountName,
        },
      });

      const { rows: reqRows } = await client.query<{ id: string }>(
        `INSERT INTO withdrawal_requests
           (id, user_id, amount, fee_amount, fee, net_amount, bank_code, account_number,
            account_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, '${WITHDRAWAL_QUEUED_STATUS}', NOW(), NOW())
         RETURNING id`,
        [
          requestId,
          userId,
          amount,
          totalFee,
          netAmount,
          bankCode,
          accountNumber,
          resolvedAccountName,
        ],
      );
      // Keep the ledger references honest: the row we just wrote must be the id
      // the debit and any later reversal were referenced with.
      if (reqRows[0]?.id !== requestId) {
        throw new Error(
          "Withdrawal could not be recorded consistently. No funds were moved — please try again.",
        );
      }

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, withdrawal_request_id, created_at)
         VALUES ($1, 'withdrawal', $2, $3, $4, NOW())`,
        [
          userId,
          amount,
          `Withdrawal of ₦${amount.toLocaleString()} to ${resolvedAccountName}`,
          requestId,
        ],
      );

      await client.query(
        `INSERT INTO revenue_events (type, amount, user_id, description, created_at)
         VALUES ('withdrawal_fee', $1, $2, 'Withdrawal processing fee', NOW())`,
        [fee_amount, userId],
      );

      // G4 fee transparency: book the Paystack 1.5% processor cost as a
      // separate revenue event for reconciliation (cost-visibility only;
      // the full amount + fees was already debited from the wallet above).
      if (paystackFee > 0) {
        await client.query(
          `INSERT INTO revenue_events (type, amount, user_id, description, created_at)
           VALUES ('withdrawal_processor_cost', $1, $2, 'Paystack withdrawal processor cost', NOW())`,
          [paystackFee, userId],
        );
      }
    });

    let recipientData: any;
    let transferData: any;
    const transferReference = withdrawalTransferReference(requestId);

    // Persist the provider reference BEFORE calling Paystack. If this process dies
    // after the transfer is created, the reconciliation cron can verify this exact
    // reference instead of guessing whether money left the platform.
    await auth.db.query(
      `UPDATE withdrawal_requests
          SET paystack_reference = $1, updated_at = NOW()
        WHERE id = $2`,
      [transferReference, requestId],
    );

    try {
      recipientData = await createPaystackRecipient(
        resolvedAccountName,
        accountNumber,
        bankCode,
      );
    } catch (paystackError) {
      await withTransaction(async (client) => {
        await recordWalletMove(client, {
          userId,
          txType: "reversal",
          source: "withdrawal",
          reference: buildLedgerRef("wdr-rev", requestId),
          description: `Withdrawal reversal: failed to create transfer recipient`,
          balanceDelta: amount + totalFee,
          sourceDetail: requestId,
          metadata: {
            reason: "create_transfer_recipient_failed",
            errorMessage:
              paystackError instanceof Error ? paystackError.message : String(paystackError),
          },
        });
        await client.query(
          `UPDATE withdrawal_requests SET status = 'failed', admin_note = $1, updated_at = NOW() WHERE id = $2`,
          ["Failed to create transfer recipient", requestId],
        );
      });
      throw paystackError;
    }

    try {
      transferData = await initiatePaystackTransfer(
        recipientData.recipient_code,
        Math.round(netAmount * 100),
        `Me2U withdrawal - ${userId}`,
        transferReference,
      );
    } catch (paystackError) {
      await withTransaction(async (client) => {
        await recordWalletMove(client, {
          userId,
          txType: "reversal",
          source: "withdrawal",
          reference: buildLedgerRef("wdr-rev", requestId),
          description: `Withdrawal reversal: transfer initiation failed`,
          balanceDelta: amount + totalFee,
          sourceDetail: requestId,
          metadata: {
            reason: "transfer_init_failed",
            errorMessage:
              paystackError instanceof Error ? paystackError.message : String(paystackError),
          },
        });
        await client.query(
          `UPDATE withdrawal_requests SET status = 'failed', admin_note = $1, updated_at = NOW() WHERE id = $2`,
          [
            paystackError instanceof Error ? paystackError.message : "Transfer failed",
            requestId,
          ],
        );
      });
      throw paystackError;
    }

    await auth.db.query(
      `UPDATE withdrawal_requests
       SET paystack_recipient_code = $1,
           paystack_transfer_code = $2,
           paystack_reference = COALESCE($3, paystack_reference),
           updated_at = NOW()
       WHERE id = $4`,
      [
        recipientData.recipient_code,
        transferData.transfer_code,
        transferData.reference || transferReference,
        requestId,
      ],
    );

    const responseBody = {
      ok: true,
      status: WITHDRAWAL_QUEUED_STATUS,
      withdrawal_id: requestId,
      transfer_code: transferData.transfer_code,
      reference: transferData.reference,
      net_amount: netAmount,
      fee: totalFee,
      message: `₦${netAmount.toLocaleString()} is being sent to your account. Fee: ₦${totalFee.toLocaleString()}`,
    };

    await rememberIdempotentResponse(auth.db, {
      key: idempotencyKey,
      userId: auth.user.id,
      route,
      status: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // The partial UNIQUE index idx_withdrawal_requests_one_pending_per_user is the
    // authoritative double-submit guard; translate it into a friendly 409 instead
    // of leaking a Postgres constraint name to the client.
    if (isUniqueViolation(error, "idx_withdrawal_requests_one_pending_per_user")) {
      return NextResponse.json(
        { error: DUPLICATE_WITHDRAWAL_MESSAGE },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    return errorResponse(error, "Unable to withdraw funds.", route);
  }
}
