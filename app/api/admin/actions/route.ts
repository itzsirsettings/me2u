import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server/auth";
import { requestWemaVirtualAccountForKycUser } from "@/lib/server/wema-virtual-account";
import { withTransaction } from "@/lib/railway/client";
import { buildLedgerRef, recordWalletMove } from "@/lib/server/wallet-ledger";

type AdminAction =
  | "approve_payment_proof"
  | "reject_payment_proof"
  | "approve_withdrawal"
  | "reject_withdrawal"
  | "approve_kyc"
  | "reject_kyc";

const validActions = new Set<AdminAction>([
  "approve_payment_proof",
  "reject_payment_proof",
  "approve_withdrawal",
  "reject_withdrawal",
  "approve_kyc",
  "reject_kyc",
]);

function readAction(value: unknown): AdminAction {
  const action = String(value || "").trim() as AdminAction;
  if (validActions.has(action)) return action;
  throw new Error("Unsupported admin action.");
}

function readId(value: unknown): string {
  const id = String(value || "").trim();
  if (!id) throw new Error("Missing record id.");
  return id;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const action = readAction(body.action);
    const id = readId(body.id);
    const db = auth.db;

    // ── KYC approve / reject ─────────────────────────────────────────────────
    if (action === "approve_kyc" || action === "reject_kyc") {
      const { rows: profileRows } = await db.query<{
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        nin_last4: string | null;
        bank_name: string | null;
        account_number: string | null;
        passport_photo_url: string | null;
      }>(
        `SELECT id, first_name, last_name, email, phone, nin_last4,
                bank_name, account_number, passport_photo_url
         FROM profiles WHERE id = $1`,
        [id],
      );

      const profile = profileRows[0];
      if (!profile) throw new Error("Profile not found.");

      if (
        action === "approve_kyc" &&
        (!profile.bank_name || !profile.account_number || !profile.passport_photo_url)
      ) {
        throw new Error("KYC documents are incomplete.");
      }

      await db.query(
        `UPDATE profiles SET kyc_verified = $1, updated_at = NOW() WHERE id = $2`,
        [action === "approve_kyc", id],
      );

      if (action === "approve_kyc") {
        try {
          await requestWemaVirtualAccountForKycUser({
            userId: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            email: profile.email,
            phone: profile.phone,
            ninLast4: profile.nin_last4,
          });
        } catch (err) {
          console.error("Wema virtual account request failed after KYC approval", err);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // ── Payment proof approve ────────────────────────────────────────────────
    if (action === "approve_payment_proof") {
      let registrationDepositUserId: string | null = null;
      await withTransaction(async (client) => {
        const { rows: proofRows } = await client.query<{
          id: string;
          user_id: string;
          amount: number;
          type: string;
          status: string;
        }>(
          `SELECT id, user_id, amount, type, status FROM payment_proofs WHERE id = $1 FOR UPDATE`,
          [id],
        );
        const proof = proofRows[0];
        if (!proof) throw new Error("Payment proof not found.");
        if (proof.status !== "pending")
          throw new Error("This proof has already been processed.");

        await client.query(
          `UPDATE payment_proofs SET status = 'approved', updated_at = NOW() WHERE id = $1`,
          [id],
        );

        const description =
          proof.type === "registration_deposit"
            ? `Registration deposit of ₦${Number(proof.amount).toLocaleString()} confirmed`
            : `Wallet funded with ₦${Number(proof.amount).toLocaleString()}`;

        // Credit wallet via recordWalletMove so the ledger has a full audit entry.
        await recordWalletMove(client, {
          userId: proof.user_id,
          txType: "credit",
          source: "deposit",
          reference: buildLedgerRef("admin-proof", id),
          description,
          balanceDelta: Number(proof.amount),
          sourceDetail: id,
          metadata: { proofId: id, proofType: proof.type },
        });

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'deposit', $2, $3, NOW())`,
          [proof.user_id, Number(proof.amount), description],
        );

        if (proof.type === "registration_deposit") {
          const { rows: updatedProfiles } = await client.query<{ id: string }>(
            `UPDATE profiles
             SET registration_deposit_paid = true,
                 registration_deposit_confirmed_at = NOW(),
                 registration_deposit_amount = $1,
                 account_unlocked = true,
                 unlock_method = 'registration_deposit',
                 account_unlock_paid_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2
             RETURNING id`,
            [Number(proof.amount), proof.user_id],
          );
          if (!updatedProfiles[0]) {
            throw new Error(
              "Registration payment cannot be approved because the user profile is missing.",
            );
          }
          registrationDepositUserId = proof.user_id;
        }

        await client.query(
          `INSERT INTO notifications (user_id, title, message, is_read, created_at)
           VALUES ($1, 'Payment Confirmed', $2, false, NOW())`,
          [
            proof.user_id,
            `Your payment of ₦${Number(proof.amount).toLocaleString()} has been confirmed.`,
          ],
        );
      });

      if (registrationDepositUserId) {
        const { rows: profileRows } = await db.query<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          nin_last4: string | null;
        }>(
          `SELECT id, first_name, last_name, email, phone, nin_last4 FROM profiles WHERE id = $1`,
          [registrationDepositUserId],
        );
        const profile = profileRows[0];
        if (profile) {
          try {
            await requestWemaVirtualAccountForKycUser({
              userId: profile.id,
              firstName: profile.first_name,
              lastName: profile.last_name,
              email: profile.email,
              phone: profile.phone,
              ninLast4: profile.nin_last4,
            });
          } catch (err) {
            console.error(
              "Dedicated wallet account request failed after deposit approval",
              err,
            );
          }
        }
      }

      return NextResponse.json({ ok: true });
    }

    // ── Payment proof reject ─────────────────────────────────────────────────
    if (action === "reject_payment_proof") {
      const { rows: proofRows } = await db.query<{
        status: string;
        user_id: string;
        amount: number;
      }>(`SELECT status, user_id, amount FROM payment_proofs WHERE id = $1`, [id]);
      const proof = proofRows[0];
      if (!proof) throw new Error("Payment proof not found.");
      if (proof.status !== "pending") throw new Error("This proof has already been processed.");

      await db.query(
        `UPDATE payment_proofs SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      await db.query(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at)
         VALUES ($1, 'Payment Not Confirmed', $2, false, NOW())`,
        [
          proof.user_id,
          `Your payment proof of ₦${Number(proof.amount).toLocaleString()} could not be verified. Please resubmit with a clear screenshot.`,
        ],
      );

      return NextResponse.json({ ok: true });
    }

    // ── Withdrawal approve ───────────────────────────────────────────────────
    if (action === "approve_withdrawal") {
      await withTransaction(async (client) => {
        const { rows: wRows } = await client.query<{
          id: string;
          user_id: string;
          amount: number;
          fee_amount: number;
          status: string;
        }>(
          `SELECT id, user_id, amount, fee_amount, status
           FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
          [id],
        );
        const wr = wRows[0];
        if (!wr) throw new Error("Withdrawal request not found.");
        if (wr.status !== "pending")
          throw new Error("This request has already been processed.");

        await client.query(
          `UPDATE withdrawal_requests
           SET status = 'success', processed_by = $1, processed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [auth.user.id, id],
        );

        // Record settled ledger entry — balance was already debited at dispatch;
        // release the locked funds to close the audit trail.
        await recordWalletMove(client, {
          userId: wr.user_id,
          txType: "debit",
          source: "withdrawal",
          reference: buildLedgerRef("wdr-admin-approved", id),
          description: `Withdrawal manually approved by admin`,
          balanceDelta: 0,
          lockedDelta: -(Number(wr.amount) + Number(wr.fee_amount || 0)),
          sourceDetail: id,
          metadata: { approvedBy: auth.user.id, withdrawalId: id },
        });

        await client.query(
          `INSERT INTO notifications (user_id, title, message, is_read, created_at)
           VALUES ($1, 'Withdrawal Successful', $2, false, NOW())`,
          [
            wr.user_id,
            `Your withdrawal of ₦${Number(wr.amount).toLocaleString()} has been processed.`,
          ],
        );
      });

      return NextResponse.json({ ok: true });
    }

    // ── Withdrawal reject ────────────────────────────────────────────────────
    if (action === "reject_withdrawal") {
      await withTransaction(async (client) => {
        const { rows: wRows } = await client.query<{
          user_id: string;
          amount: number;
          fee_amount: number;
          status: string;
        }>(
          `SELECT user_id, amount, fee_amount, status
           FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
          [id],
        );
        const wr = wRows[0];
        if (!wr) throw new Error("Withdrawal request not found.");
        if (wr.status !== "pending")
          throw new Error("This request has already been processed.");

        await client.query(
          `UPDATE withdrawal_requests
           SET status = 'reversed', processed_by = $1, processed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [auth.user.id, id],
        );

        // Refund amount + fee
        const refundTotal = Number(wr.amount) + Number(wr.fee_amount);
        await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [refundTotal, wr.user_id],
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'deposit', $2, 'Withdrawal reversed — funds returned to wallet', NOW())`,
          [wr.user_id, Number(wr.amount)],
        );

        await client.query(
          `INSERT INTO notifications (user_id, title, message, is_read, created_at)
           VALUES ($1, 'Withdrawal Reversed', $2, false, NOW())`,
          [
            wr.user_id,
            `Your withdrawal of ₦${Number(wr.amount).toLocaleString()} was not processed and has been returned to your wallet.`,
          ],
        );
      });

      return NextResponse.json({ ok: true });
    }

    throw new Error("Unhandled admin action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete admin action.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
