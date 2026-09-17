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

    // Get comprehensive account unlock status
    const { rows } = await auth.db.query<{
      account_unlocked: boolean;
      account_unlock_paid_at: string | null;
      unlock_method: string | null;
      verified_referral_count: number;
      created_at: string;
      unlock_eligible_at: string | null;
      registration_deposit_paid: boolean;
    }>(
      `SELECT 
         COALESCE(account_unlocked, false) as account_unlocked,
         account_unlock_paid_at,
         unlock_method,
         COALESCE(verified_referral_count, 0) as verified_referral_count,
         created_at,
         unlock_eligible_at,
         registration_deposit_paid,
         email
       FROM profiles 
       WHERE id = $1`,
      [userId],
    );

    const profile = rows[0];
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // Check if payment has been made
    const { rows: paymentRows } = await auth.db.query<{
      id: string;
      amount: number;
      payment_reference: string;
      status: string;
      unlock_type: string;
      eligible_at: string | null;
      days_since_registration: number;
      created_at: string;
    }>(
      `SELECT 
         id, 
         amount, 
         payment_reference, 
         status,
         unlock_type,
         eligible_at,
         days_since_registration,
         created_at
       FROM account_unlock_payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId],
    );

    const hasSuccessfulPayment = paymentRows.some(p => p.status === 'success');
    const latestPayment = paymentRows[0];

    // Calculate days until unlock eligible
    const daysSinceRegistration = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let daysUntilEligible = 0;
    if (profile.unlock_eligible_at) {
      daysUntilEligible = Math.max(
        0,
        Math.ceil((new Date(profile.unlock_eligible_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    } else if (hasSuccessfulPayment && latestPayment) {
      // Calculate based on payment date
      const eligibleDate = new Date(latestPayment.created_at);
      eligibleDate.setDate(eligibleDate.getDate() + 15);
      daysUntilEligible = Math.max(
        0,
        Math.ceil((eligibleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    }

    // Check subscription status
    const { rows: subRows } = await auth.db.query(
      `SELECT plan, status, current_period_end
       FROM subscriptions
       WHERE user_id = $1 
         AND status IN ('active', 'trialing')
         AND plan IN ('plus_monthly', 'plus_annual', 'lender_pro_monthly', 'lender_pro_volume')
         AND current_period_end > NOW()
       LIMIT 1`,
      [userId]
    );
    const hasActiveSubscription = subRows.length > 0;

    return NextResponse.json({
      isUnlocked: profile.account_unlocked,
      unlockedAt: profile.account_unlock_paid_at,
      unlockMethod: profile.unlock_method,
      
      // Referral path
      verifiedReferralCount: profile.verified_referral_count,
      referralsNeeded: Math.max(0, 10 - profile.verified_referral_count),
      canUnlockViaReferrals: profile.verified_referral_count >= 10,
      
      // Time-based path
      registrationDate: profile.created_at,
      daysSinceRegistration,
      paymentMade: hasSuccessfulPayment,
      unlockEligibleAt: profile.unlock_eligible_at || (hasSuccessfulPayment && latestPayment 
        ? new Date(new Date(latestPayment.created_at).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
        : null),
      daysUntilEligible,
      canUnlockNow: hasSuccessfulPayment && daysUntilEligible === 0,
      
      // Subscription path
      hasActiveSubscription,
      subscriptionPlan: subRows[0]?.plan || null,
      
      // Payment info
      unlockFee: UNLOCK_FEE,
      payments: paymentRows,
      
      // Status summary
      status: profile.account_unlocked 
        ? 'unlocked' 
        : hasActiveSubscription 
        ? 'eligible_via_subscription'
        : profile.verified_referral_count >= 10
        ? 'eligible_via_referrals'
        : hasSuccessfulPayment && daysUntilEligible === 0
        ? 'eligible_via_time'
        : hasSuccessfulPayment
        ? 'waiting_period'
        : 'locked',
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
        created_at: string;
      }>(
        `SELECT COALESCE(account_unlocked, false) as account_unlocked, email, created_at
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
      
      // Calculate unlock eligible date (15 days from now)
      const eligibleDate = new Date();
      eligibleDate.setDate(eligibleDate.getDate() + 15);
      
      const daysSinceReg = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create payment record
      await auth.db.query(
        `INSERT INTO account_unlock_payments 
           (user_id, amount, payment_reference, payment_provider, status, 
            unlock_type, eligible_at, days_since_registration, created_at)
         VALUES ($1, $2, $3, 'paystack', 'pending', 'time_based', $4, $5, NOW())`,
        [userId, UNLOCK_FEE, reference, eligibleDate.toISOString(), daysSinceReg],
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

        // If payment successful, set unlock eligible date (15 days from payment)
        if (transaction.status === "success") {
          const eligibleDate = new Date();
          eligibleDate.setDate(eligibleDate.getDate() + 15);
          
          await client.query(
            `UPDATE profiles
             SET unlock_eligible_at = $1,
                 unlock_requested_at = NOW()
             WHERE id = $2`,
            [eligibleDate.toISOString(), userId],
          );
          
          // Update payment record with eligible date
          await client.query(
            `UPDATE account_unlock_payments
             SET eligible_at = $1
             WHERE payment_reference = $2`,
            [eligibleDate.toISOString(), reference]
          );

          // Notify user about 15-day waiting period
          await client.query(
            `INSERT INTO notifications (user_id, title, message, created_at)
             VALUES ($1, 'Unlock Payment Received! ⏰', 
                     $2, NOW())`,
            [
              userId, 
              `Thank you! Your account will be unlocked in 15 days (${eligibleDate.toLocaleDateString('en-NG')}). Or refer 10 users for instant unlock!`
            ],
          );

          // Log transaction
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, description, created_at)
             VALUES ($1, 'deposit', $2, $3, NOW())`,
            [userId, UNLOCK_FEE, `Account unlock payment - will unlock on ${eligibleDate.toLocaleDateString('en-NG')}`],
          );
          
          // Track revenue
          await client.query(
            `INSERT INTO revenue_events (type, amount, user_id, description, created_at)
             VALUES ('unlock_payment', $1, $2, 'Account unlock fee (15-day waiting period)', NOW())`,
            [UNLOCK_FEE, userId]
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
