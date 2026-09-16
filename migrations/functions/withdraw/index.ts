import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FEE_RATE = 0.015; // 1.5% Paystack transfer fee
const MIN_WITHDRAWAL = 1000;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const body = await req.json();
    const { amount, bank_code, account_number, account_name } = body;

    if (!amount || amount < MIN_WITHDRAWAL) {
      return jsonResponse({ error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` }, 400);
    }
    if (!bank_code) return jsonResponse({ error: "Bank code is required" }, 400);
    if (!account_number) return jsonResponse({ error: "Account number is required" }, 400);
    if (!account_name) return jsonResponse({ error: "Account name is required" }, 400);

    // Calculate fees
    const paystackFee = parseFloat((amount * FEE_RATE).toFixed(2));
    const platformFee = 100; // ₦100 platform processing fee
    const totalFee = paystackFee + platformFee;
    const netAmount = amount - paystackFee;

    // 1. Initiate withdrawal via Supabase RPC (deducts from wallet, creates request)
    const { data: requestId, error: initError } = await supabase.rpc(
      "me2u_initiate_paystack_withdrawal",
      {
        p_user_id: user.id,
        p_amount: amount,
        p_fee: totalFee,
        p_net_amount: netAmount,
        p_bank_code: bank_code,
        p_account_number: account_number,
        p_account_name: account_name,
      }
    );

    if (initError || !requestId) {
      return jsonResponse({
        error: initError?.message || "Failed to initiate withdrawal",
      }, 400);
    }

    // 2. Create Paystack transfer recipient
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: account_name,
        account_number,
        bank_code,
        currency: "NGN",
      }),
    });

    const recipientData = await recipientRes.json();
    if (!recipientData.status) {
      // Rollback: refund wallet
      await supabase.rpc("me2u_increment_balance", {
        p_user_id: user.id,
        p_amount: amount + totalFee,
      });

      await supabase
        .from("withdrawal_requests")
        .update({ status: "failed", admin_note: "Failed to create transfer recipient" })
        .eq("id", requestId);

      return jsonResponse({
        error: "Failed to create transfer recipient",
        detail: recipientData.message,
      }, 400);
    }

    const recipientCode = recipientData.data.recipient_code;

    // 3. Initiate Paystack transfer
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(netAmount * 100), // Paystack uses kobo
        recipient: recipientCode,
        reason: `Me2U withdrawal - ${user.id}`,
      }),
    });

    const transferData = await transferRes.json();

    if (!transferData.status) {
      // Rollback: refund wallet
      await supabase.rpc("me2u_increment_balance", {
        p_user_id: user.id,
        p_amount: amount + totalFee,
      });

      await supabase
        .from("withdrawal_requests")
        .update({ status: "failed", admin_note: transferData.message })
        .eq("id", requestId);

      return jsonResponse({
        error: "Transfer failed",
        detail: transferData.message,
      }, 400);
    }

    // 4. Update withdrawal with Paystack codes
    await supabase
      .from("withdrawal_requests")
      .update({
        paystack_recipient_code: recipientCode,
        paystack_transfer_code: transferData.data.transfer_code,
        paystack_reference: transferData.data.reference,
      })
      .eq("id", requestId);

    return jsonResponse({
      success: true,
      message: `₦${netAmount.toLocaleString()} is being sent to your account. Fee: ₦${totalFee.toLocaleString()}`,
      withdrawal_id: requestId,
      transfer_code: transferData.data.transfer_code,
      reference: transferData.data.reference,
      net_amount: netAmount,
      fee: totalFee,
    });

  } catch (err) {
    console.error("Withdraw error:", err);
    return jsonResponse({
      error: "Server error",
      detail: err instanceof Error ? err.message : "Unknown error",
    }, 500);
  }
});
