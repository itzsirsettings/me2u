import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";
import { withUserTransaction } from "@/lib/railway/client";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const UNLOCK_FEE = 2000;

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;

    // Get account unlock status
    const { rows } = await auth.db.query<{
      account_unlocked: boolean;
      account_unlock_paid_at: string | null;
      verified_referral_count: number;
    }>(
      `SELECT 
         COALESCE(account_unlocked, false) as account_unlocked,
         account_unlock_paid_at,
         COALESCE(verified_referral_count, 0) as verified_referral_count
       FROM profiles 
       WHERE id = $1`,
      [userId],
    );

    const profile = rows[0];
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // Get payment history
    const { rows: paymentRows } = await auth.db.query<{
      id: string;
      amount: number;
      payment_reference: string;
      status: string;
      created_at: string;
    }>(
      `SELECT id, amount, payment_reference, status, created_at
       FROM account_unlock_payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId],
    );

    return NextResponse.json({
      isUnlocked: profile.account_unlocked,
      unlockedAt: profile.account_unlock_paid_at,
      unlockMethod: profile.account_unlocked
        ? profile.account_unlock_paid_at
          ? "payment"
          : "referrals"
        : null,
      verifiedReferralCount: profile.verified_referral_count,
      referralsNeeded: Math.max(0, 10 - profile.verified_referral_count),
      unlockFee: UNLOCK_FEE,
      payments: paymentRows,
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch account unlock status.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: "Payment service is not configured." },
        { status: 503 },
      );
    }

    const userId = auth.user.id;
    const body = await request.json();
    const action = body.action;

    // ── Initialize Payment ──
    if (action === "initialize") {
      // Check if already unlocked
      const { rows } = await auth.db.query<{
        account_unlocked: boolean;
        email: string;
      }>(
        `SELECT COALESCE(account_unlocked, false) as account_unlocked, email
         FROM profiles WHERE id = $1`,
        [userId],
      );

      const profile = rows[0];
      if (!profile) {
        return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      }

      if (profile.account_unlocked) {
        return NextResponse.json(
          { error: "Your account is already unlocked." },
          { status: 400 },
        );
      }

      // Generate reference
      const reference = `unlock_${userId}_${Date.now()}`;

      // Create payment record
      await auth.db.query(
        `INSERT INTO account_unlock_payments 
           (user_id, amount, payment_reference, payment_provider, status, created_at)
         VALUES ($1, $2, $3, 'paystack', 'pending', NOW())`,
        [userId, UNLOCK_FEE, reference],
      );

      // Initialize Paystack transaction
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          amount: UNLOCK_FEE * 100, // Convert to kobo
          reference,
          metadata: {
            user_id: userId,
            purpose: "account_unlock",
          },
          callback_url: `${new URL(request.url).origin}/account-unlock/verify?reference=${reference}`,
        }),
      });

      const paystackData = await paystackRes.json();
      if (!paystackData.status) {
        throw new Error(paystackData.message || "Failed to initialize payment");
      }

      return NextResponse.json({
        reference,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
      });
    }

    // ── Verify Payment ──
    if (action === "verify") {
      const reference = String(body.reference || "").trim();
      if (!reference) {
        return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
      }

      // Verify with Paystack
      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
          },
        },
      );

      const paystackData = await paystackRes.json();
      if (!paystackData.status) {
        throw new Error(paystackData.message || "Payment verification failed");
      }

      const transaction = paystackData.data;

      // Update payment record and unlock account
      await withUserTransaction(userId, async (client) => {
        // Update payment status
        await client.query(
          `UPDATE account_unlock_payments
           SET status = $1, metadata = $2, updated_at = NOW()
           WHERE payment_reference = $3 AND user_id = $4`,
          [
            transaction.status === "success" ? "success" : "failed",
            JSON.stringify(transaction),
            reference,
            userId,
          ],
        );

        // If payment successful, unlock account
        if (transaction.status === "success") {
          await client.query(
            `UPDATE profiles
             SET account_unlocked = true, account_unlock_paid_at = NOW()
             WHERE id = $1`,
            [userId],
          );

          // Notify user
          await client.query(
            `INSERT INTO notifications (user_id, title, message, created_at)
             VALUES ($1, 'Account Unlocked! 🎉', 
                     'Your account is now unlocked. You can withdraw funds anytime.', NOW())`,
            [userId],
          );

          // Log transaction
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, description, created_at)
             VALUES ($1, 'deposit', 0, 'Account unlock payment - ₦2,000', NOW())`,
            [userId],
          );
        }
      });

      return NextResponse.json({
        success: transaction.status === "success",
        status: transaction.status,
        amount: transaction.amount / 100,
        reference: transaction.reference,
        paid_at: transaction.paid_at,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'initialize' or 'verify'." },
      { status: 400 },
    );
  } catch (error) {
    return errorResponse(error, "Unable to process account unlock payment.");
  }
}
