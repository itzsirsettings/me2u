import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { getWithdrawalProcessorFee, withdrawalFeeAmount } from "@/lib/revenue";
import { verifyTransactionPin } from "@/lib/server/pin";
import { withUserTransaction } from "@/lib/railway/client";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const MIN_WITHDRAWAL = 1000;

async function createPaystackRecipient(accountName: string, accountNumber: string, bankCode: string) {
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
  const params = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode });
  const res = await fetch(`https://api.paystack.co/bank/resolve?${params}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const data = await res.json();
  if (!data.status || !data.data?.account_name) {
    throw new Error("Could not verify the destination bank account.");
  }
  return String(data.data.account_name).trim();
}

async function initiatePaystackTransfer(recipientCode: string, amountInKobo: number, reason: string) {
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "balance", amount: amountInKobo, recipient: recipientCode, reason }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Transfer failed");
  return data.data;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`wallet-withdraw-ip:${clientIp}`, 20, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`wallet-withdraw-user:${auth.user.id}`, 10, 60_000)) return tooManyRequestsResponse();

    const body = await request.json();
    const amount = readPositiveAmount(body.amount);
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const bankCode = String(body.bank_code || "").trim();
    const accountNumber = String(body.account_number || "").trim();
    const accountName = String(body.account_name || "").trim();

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.` },
        { status: 400 },
      );
    }

    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: "Withdrawal service is not configured. Please contact support." },
        { status: 503 },
      );
    }

    const userId = auth.user.id;

    // Load profile with unlock eligibility
    const { rows: profileRows } = await auth.db.query<{
      registration_deposit_paid: boolean;
      kyc_verified: boolean;
      transaction_pin: string | null;
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
         p.transaction_pin,
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
    if (!profile.registration_deposit_paid) throw new Error("Confirm your registration deposit before withdrawal.");
    if (!profile.kyc_verified) throw new Error("Complete KYC before withdrawal.");
    
    // NEW UNLOCK LOGIC: Check multiple unlock paths
    // Path 1: Already unlocked
    if (profile.account_unlocked) {
      // Account is unlocked, proceed with withdrawal
    }
    // Path 2: Active subscription (Plus/Lender Pro) - auto-unlocks
    else if (profile.has_subscription) {
      // Auto-unlock for subscribers
      await auth.db.query(
        `UPDATE profiles 
         SET account_unlocked = true, 
             unlock_method = 'subscription',
             account_unlock_paid_at = NOW()
         WHERE id = $1`,
        [userId]
      );
    }
    // Path 3: 10+ verified referrals - free unlock
    else if (profile.verified_referral_count >= 10) {
      // Auto-unlock for referrers
      await auth.db.query(
        `UPDATE profiles 
         SET account_unlocked = true, 
             unlock_method = 'referrals',
             account_unlock_paid_at = NOW()
         WHERE id = $1`,
        [userId]
      );
    }
    // Path 4: 15 days + payment made - time-based unlock
    else if (
      profile.unlock_payment_made && 
      profile.unlock_eligible_at && 
      new Date(profile.unlock_eligible_at) <= new Date()
    ) {
      // Auto-unlock after 15-day waiting period
      await auth.db.query(
        `UPDATE profiles 
         SET account_unlocked = true, 
             unlock_method = 'time_based',
             account_unlock_paid_at = NOW()
         WHERE id = $1`,
        [userId]
      );
    }
    // Still locked - show unlock options
    else {
      const daysRemaining = profile.unlock_payment_made && profile.unlock_eligible_at
        ? Math.ceil((new Date(profile.unlock_eligible_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      
      const unlockOptions: string[] = [];
      
      // Option 1: Wait for 15 days (if payment made)
      if (profile.unlock_payment_made && daysRemaining !== null && daysRemaining > 0) {
        unlockOptions.push(`Wait ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''} (payment received, unlock on ${new Date(profile.unlock_eligible_at!).toLocaleDateString('en-NG')})`);
      }
      // Option 1b: Make payment to start 15-day countdown
      else if (!profile.unlock_payment_made) {
        unlockOptions.push(`Pay ₦2,000 one-time fee, then wait 15 days`);
      }
      
      // Option 2: Get 10 referrals
      const referralsNeeded = 10 - profile.verified_referral_count;
      if (referralsNeeded > 0) {
        unlockOptions.push(`Refer ${referralsNeeded} more verified user${referralsNeeded !== 1 ? 's' : ''} (${profile.verified_referral_count}/10) for instant unlock`);
      }
      
      // Option 3: Subscribe to Plus
      unlockOptions.push(`Upgrade to Me2U Plus (₦1,500/month) for instant unlock + premium features`);
      
      return NextResponse.json({
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
      }, { status: 403 });
    }

    if (!/^\d{3,6}$/.test(bankCode)) throw new Error("Select and verify your bank before withdrawal.");
    if (!/^\d{10}$/.test(accountNumber)) throw new Error("Enter a valid 10-digit account number.");
    if (accountName.length < 2 || accountName.length > 120) {
      throw new Error("Verify the destination account name before withdrawal.");
    }

    const resolvedAccountName = await resolvePaystackAccount(accountNumber, bankCode);

    if (!profile.transaction_pin) throw new Error("Please set a transaction PIN in your security settings first.");
    if (!verifyTransactionPin(profile.transaction_pin, userId, pin)) throw new Error("Incorrect transaction PIN.");

    // Check wallet frozen
    const { rows: secRows } = await auth.db.query<{ wallet_frozen: boolean }>(
      `SELECT wallet_frozen FROM user_security_settings WHERE user_id = $1`,
      [userId],
    );
    if (secRows[0]?.wallet_frozen) {
      throw new Error("Your wallet is frozen. Unfreeze it from Security Center before withdrawals.");
    }

    // Block if outstanding borrower loans
    const { rows: loanRows } = await auth.db.query(
      `SELECT id FROM loans WHERE borrower_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );
    if (loanRows.length > 0) {
      throw new Error("You must repay all outstanding loans before you can withdraw your capital.");
    }

    // Check wallet balance
    const { rows: walletRows } = await auth.db.query<{ balance: number; locked: number }>(
      `SELECT balance, locked FROM wallets WHERE user_id = $1`,
      [userId],
    );
    const wallet = walletRows[0];
    if (!wallet) throw new Error("Wallet not found.");

    const balance = Number(wallet.balance);
    const locked = Number(wallet.locked);
    const availableBalance = balance - locked;
    if (availableBalance < amount) {
      throw new Error(
        `Insufficient available balance. Available: ₦${availableBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`,
      );
    }

    // Check no pending withdrawal
    const { rows: pendingRows } = await auth.db.query(
      `SELECT id FROM withdrawal_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
      [userId],
    );
    if (pendingRows.length > 0) throw new Error("You already have a pending withdrawal request.");

        // fee_amount: withdrawalFeeAmount (plus Paystack processor fee)
    const fee_amount = withdrawalFeeAmount;
    const paystackFee = getWithdrawalProcessorFee(amount);
    const totalFee = paystackFee + fee_amount;
    const netAmount = amount;

    if (balance < amount + totalFee) {
      const shortfall = Math.max(0, amount + totalFee - balance);
      throw new Error(
        `Insufficient balance. Fund ₦${shortfall.toLocaleString()} more to cover the withdrawal and ₦${totalFee.toLocaleString()} fee.`,
      );
    }

    // Atomic deduct + create withdrawal request
    let requestId: string;
    await withUserTransaction(userId, async (client) => {
      const { rows: wRows } = await client.query(
        `UPDATE wallets
         SET balance = balance - $1, updated_at = NOW()
         WHERE user_id = $2 AND balance >= $1
         RETURNING balance`,
        [amount + totalFee, userId],
      );
      if (!wRows[0]) throw new Error("Insufficient balance.");

      const { rows: reqRows } = await client.query<{ id: string }>(
        `INSERT INTO withdrawal_requests
           (user_id, amount, fee_amount, fee, net_amount, bank_code, account_number,
            account_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
         RETURNING id`,
        [userId, amount, totalFee, netAmount, bankCode, accountNumber, resolvedAccountName],
      );
      requestId = reqRows[0].id;

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, created_at)
         VALUES ($1, 'withdrawal', $2, $3, NOW())`,
        [userId, amount, `Withdrawal of ₦${amount.toLocaleString()} to ${resolvedAccountName}`],
      );

      await client.query(
        `INSERT INTO revenue_events (type, amount, user_id, description, created_at)
         VALUES ('withdrawal_fee', $1, $2, 'Withdrawal processing fee', NOW())`,
        [fee_amount, userId],
      );
    });

    // Create Paystack recipient & transfer
    let recipientData: any;
    let transferData: any;

    try {
      recipientData = await createPaystackRecipient(resolvedAccountName, accountNumber, bankCode);
    } catch (paystackError) {
      // Rollback: refund wallet
      await auth.db.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [amount + totalFee, userId],
      );
      await auth.db.query(
        `UPDATE withdrawal_requests SET status = 'failed', admin_note = $1, updated_at = NOW() WHERE id = $2`,
        ["Failed to create transfer recipient", requestId!],
      );
      throw paystackError;
    }

    try {
      transferData = await initiatePaystackTransfer(
        recipientData.recipient_code,
        Math.round(netAmount * 100),
        `Me2U withdrawal - ${userId}`,
      );
    } catch (paystackError) {
      await auth.db.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [amount + totalFee, userId],
      );
      await auth.db.query(
        `UPDATE withdrawal_requests SET status = 'failed', admin_note = $1, updated_at = NOW() WHERE id = $2`,
        [
          paystackError instanceof Error ? paystackError.message : "Transfer failed",
          requestId!,
        ],
      );
      throw paystackError;
    }

    await auth.db.query(
      `UPDATE withdrawal_requests
       SET paystack_recipient_code = $1, paystack_transfer_code = $2,
           paystack_reference = $3, updated_at = NOW()
       WHERE id = $4`,
      [recipientData.recipient_code, transferData.transfer_code, transferData.reference, requestId!],
    );

    return NextResponse.json({
      ok: true,
      status: "processing",
      withdrawal_id: requestId!,
      transfer_code: transferData.transfer_code,
      reference: transferData.reference,
      net_amount: netAmount,
      fee: totalFee,
      message: `₦${netAmount.toLocaleString()} is being sent to your account. Fee: ₦${totalFee.toLocaleString()}`,
    });
  } catch (error) {
    return errorResponse(error, "Unable to withdraw funds.");
  }
}
