import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { verifyTransactionPin } from "@/lib/server/pin";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`wallet-paybill-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`wallet-paybill-user:${auth.user.id}`, 10, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const amount = readPositiveAmount(body.amount);
    const serviceLabel = typeof body.serviceLabel === "string" ? body.serviceLabel : "Bill Payment";
    const detail = typeof body.detail === "string" ? body.detail : "";
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("kyc_verified, transaction_pin")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Profile not found.");
    if (!profile.kyc_verified) {
      throw new Error("Complete KYC before paying bills.");
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
      throw new Error("Your wallet is frozen. Unfreeze it from Security Center before paying bills.");
    }

    // 1. Get current balance
    const { data: wallet, error: walletError } = await auth.supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (walletError) throw new Error(walletError.message);
    if (!wallet) throw new Error("Wallet not found.");

    const balance = Number(wallet.balance || 0);
    if (balance < amount) {
      throw new Error(`Insufficient wallet balance for ₦${amount.toLocaleString()} ${serviceLabel}.`);
    }

    // Deduct balance via admin client
    const { error: updateError } = await auth.supabase
      .from("wallets")
      .update({ balance: balance - amount })
      .eq("user_id", auth.user.id)
      .gte("balance", amount); // Prevent race conditions

    if (updateError) {
      throw new Error("Unable to deduct balance. " + updateError.message);
    }

    // Add transaction
    const { error: txError } = await auth.supabase
      .from("transactions")
      .insert({
        user_id: auth.user.id,
        amount,
        type: "withdrawal",
        description: `Paid ${serviceLabel} ${detail ? `(${detail})` : ""}`,
      });

    if (txError) {
      // Best effort rollback
      await auth.supabase.from("wallets").update({ balance }).eq("user_id", auth.user.id);
      throw new Error(txError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to complete bill payment.");
  }
}
