import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    // Verify webhook signature
    const hash = createHmac("sha512", PAYSTACK_SECRET)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log(`Paystack webhook event: ${event.event}`);

    if (event.event === "transfer.success") {
      const transferCode = event.data?.transfer_code;
      const reference = event.data?.reference;

      if (!transferCode) {
        return new Response("Missing transfer_code", { status: 400 });
      }

      // Find the withdrawal request by transfer code
      const { data: withdrawal, error: findError } = await supabase
        .from("withdrawal_requests")
        .select("id, status")
        .eq("paystack_transfer_code", transferCode)
        .maybeSingle();

      if (findError) {
        console.error("Error finding withdrawal:", findError);
        return new Response("OK", { status: 200 });
      }

      if (withdrawal && withdrawal.status === "processing") {
        await supabase.rpc("me2u_confirm_withdrawal_success", {
          p_request_id: withdrawal.id,
          p_transfer_code: transferCode,
          p_reference: reference,
        });

        // Notify user
        const { data: w } = await supabase
          .from("withdrawal_requests")
          .select("user_id, net_amount")
          .eq("id", withdrawal.id)
          .maybeSingle();

        if (w) {
          await supabase.from("notifications").insert({
            user_id: w.user_id,
            title: "Withdrawal Successful",
            message: `₦${Number(w.net_amount).toLocaleString()} has been sent to your bank account.`,
          });
        }
      }
    }

    if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
      const transferCode = event.data?.transfer_code;
      const reason = event.data?.message || event.event;

      if (!transferCode) {
        return new Response("Missing transfer_code", { status: 400 });
      }

      // Find the withdrawal request by transfer code
      const { data: withdrawal, error: findError } = await supabase
        .from("withdrawal_requests")
        .select("id, status")
        .eq("paystack_transfer_code", transferCode)
        .maybeSingle();

      if (findError) {
        console.error("Error finding withdrawal:", findError);
        return new Response("OK", { status: 200 });
      }

      if (withdrawal && withdrawal.status === "processing") {
        await supabase.rpc("me2u_handle_withdrawal_failure", {
          p_request_id: withdrawal.id,
          p_transfer_code: transferCode,
          p_reason: reason,
        });
      }
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200 }); // Always return 200 to prevent retries
  }
});
