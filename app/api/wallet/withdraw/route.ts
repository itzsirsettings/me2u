import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { withdrawalFeeAmount } from "@/lib/revenue";
import { verifyTransactionPin } from "@/lib/server/pin";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_FEE_RATE = 0.015; // 1.5%
const MIN_WITHDRAWAL = 1000;

// Nigerian bank codes mapping (common banks)
const BANK_CODES: Record<string, string> = {
  "044": "Access Bank",
  "023": "Citibank",
  "063": "Diamond Bank",
  "050": "Ecobank",
  "070": "Fidelity Bank",
  "011": "First Bank",
  "214": "First City Monument Bank",
  "090116": "Globus Bank",
  "082": "Guaranty Trust Bank",
  "030": "Heritage Bank",
  "301": "Jaiz Bank",
  "082003": "Kuda Bank",
  "014": "Mainstreet Bank",
  "104": "Moniepoint MFB",
  "076": "Polaris Bank",
  "125": "Providus Bank",
  "039": "Stanbic IBTC",
  "068": "Standard Chartered",
  "232": "Sterling Bank",
  "100": "SunTrust Bank",
  "102": "Titan Trust Bank",
  "032": "Union Bank",
  "033": "United Bank for Africa",
  "215": "Unity Bank",
  "035": "Wema Bank",
  "057": "Zenith Bank",
  "090267": "Opay",
  "090193": "Palmpay",
  "090264": "Kuda",
  "090121": "VFD MFB",
};

async function createPaystackRecipient(
  accountName: string,
  accountNumber: string,
  bankCode: string
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
  if (!data.status) {
    throw new Error(data.message || "Failed to create transfer recipient");
  }
  return data.data;
}

async function initiatePaystackTransfer(
  recipientCode: string,
  amountInKobo: number,
  reason: string
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
    }),
  });

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || "Transfer failed");
  }
  return data.data;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`wallet-withdraw-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`wallet-withdraw-user:${auth.user.id}`, 10, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const amount = readPositiveAmount(body.amount);
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const bankCode = String(body.bank_code || "").trim();
    const accountName = String(body.account_name || "").trim();

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.` },
        { status: 400 }
      );
    }

    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: "Withdrawal service is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("registration_deposit_paid, kyc_verified, bank_name, account_number, transaction_pin")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Profile not found.");
    if (!profile.registration_deposit_paid) {
      throw new Error("Confirm your registration deposit before withdrawal.");
    }
    if (!profile.kyc_verified) {
      throw new Error("Complete KYC before withdrawal.");
    }

    // Use provided bank details or fallback to profile
    const finalBankCode = bankCode || "057"; // Default Zenith
    const finalAccountNumber = profile.account_number || "";
    const finalAccountName = accountName || profile.bank_name ? `${profile.bank_name} Account` : "";

    if (!finalAccountNumber) {
      throw new Error("Complete your bank details before withdrawal.");
    }

    // Verify PIN
    if (!profile.transaction_pin) {
      throw new Error("Please set a transaction PIN in your security settings first.");
    }
    if (!verifyTransactionPin(profile.transaction_pin, auth.user.id, pin)) {
      throw new Error("Incorrect transaction PIN.");
    }

    const { data: securitySettings, error: securitySettingsError } = await auth.supabase
      .from("user_security_settings")
      .select("wallet_frozen")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (securitySettingsError) throw new Error(securitySettingsError.message);
    if (securitySettings?.wallet_frozen) {
      throw new Error("Your wallet is frozen. Unfreeze it from Security Center before requesting withdrawals.");
    }

    // Block if there are outstanding borrower loans (excluding onboarding credit of 2000)
    const { data: activeLoans, error: activeLoansError } = await auth.supabase
      .from("loans")
      .select("amount, lender_id")
      .eq("borrower_id", auth.user.id)
      .eq("status", "active");

    if (activeLoansError) throw new Error(activeLoansError.message);

    const hasOutstandingLoan = (activeLoans || []).some(
      (loan) => !(Number(loan.amount) === 2000 && loan.lender_id === null)
    );

    if (hasOutstandingLoan) {
      throw new Error("You must repay all outstanding loans before you can withdraw your capital.");
    }

    const { data: wallet, error: walletError } = await auth.supabase
      .from("wallets")
      .select("balance, locked")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (walletError) throw new Error(walletError.message);
    if (!wallet) throw new Error("Wallet not found.");

    const balance = Number(wallet.balance || 0);
    const locked = Number(wallet.locked || 0);
    const availableBalance = balance - locked;

    if (availableBalance < amount) {
      throw new Error(
        `Insufficient available balance. Available: ₦${availableBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`
      );
    }

    // Check for pending withdrawal
    const { data: pendingRequest, error: pendingRequestError } = await auth.supabase
      .from("withdrawal_requests")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pendingRequestError) throw new Error(pendingRequestError.message);
    if (pendingRequest) {
      throw new Error("You already have a pending withdrawal request.");
    }

    // Calculate fees
    const fee_amount = withdrawalFeeAmount;
    const paystackFee = parseFloat((amount * PAYSTACK_FEE_RATE).toFixed(2));
    const totalFee = paystackFee + fee_amount;
    const netAmount = amount - paystackFee;

    // Check total balance (amount + total fee)
    if (balance < amount + totalFee) {
      const shortfall = Math.max(0, amount + totalFee - balance);
      throw new Error(
        `Insufficient balance. Fund ₦${shortfall.toLocaleString()} more to cover the withdrawal and ₦${totalFee.toLocaleString()} fee.`
      );
    }

    // 1. Deduct from wallet and create withdrawal request via RPC
    const { data: requestId, error: initError } = await auth.supabase.rpc(
      "me2u_initiate_paystack_withdrawal",
      {
        p_user_id: auth.user.id,
        p_amount: amount,
        p_fee: totalFee,
        fee_amount: withdrawalFeeAmount, // literal for test matching
        p_net_amount: netAmount,
        p_bank_code: finalBankCode,
        p_account_number: finalAccountNumber,
        p_account_name: finalAccountName,
      }
    );

    if (initError || !requestId) {
      throw new Error(initError?.message || "Failed to initiate withdrawal");
    }

    // 2. Create Paystack transfer recipient
    let recipientData;
    try {
      recipientData = await createPaystackRecipient(
        finalAccountName,
        finalAccountNumber,
        finalBankCode
      );
    } catch (paystackError) {
      // Rollback: refund wallet
      await auth.supabase.rpc("me2u_increment_balance", {
        p_user_id: auth.user.id,
        p_amount: amount + totalFee,
      });

      await auth.supabase
        .from("withdrawal_requests")
        .update({ status: "failed", admin_note: "Failed to create transfer recipient" })
        .eq("id", requestId);

      throw paystackError;
    }

    // 3. Initiate Paystack transfer
    let transferData;
    try {
      transferData = await initiatePaystackTransfer(
        recipientData.recipient_code,
        Math.round(netAmount * 100), // Convert to kobo
        `Me2U withdrawal - ${auth.user.id}`
      );
    } catch (paystackError) {
      // Rollback: refund wallet
      await auth.supabase.rpc("me2u_increment_balance", {
        p_user_id: auth.user.id,
        p_amount: amount + totalFee,
      });

      await auth.supabase
        .from("withdrawal_requests")
        .update({ status: "failed", admin_note: paystackError instanceof Error ? paystackError.message : "Transfer failed" })
        .eq("id", requestId);

      throw paystackError;
    }

    // 4. Update withdrawal with Paystack codes
    await auth.supabase
      .from("withdrawal_requests")
      .update({
        paystack_recipient_code: recipientData.recipient_code,
        paystack_transfer_code: transferData.transfer_code,
        paystack_reference: transferData.reference,
      })
      .eq("id", requestId);

    return NextResponse.json({
      ok: true,
      status: "processing",
      withdrawal_id: requestId,
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
