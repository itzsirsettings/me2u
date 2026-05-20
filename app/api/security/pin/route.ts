import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getGoogleUserPassword } from "@/lib/server/auth-helpers";
import { createTransactionPinVerifier } from "@/lib/server/pin";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`security-pin-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (isRateLimited(`security-pin-user:${auth.user.id}`, 10, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!/^\d{4}$/.test(pin)) {
      throw new Error("Transaction PIN must be a 4-digit number.");
    }

    if (!password) {
      throw new Error("Password is required to change or reset your transaction PIN.");
    }

    // Verify user password by attempting to sign in using standard anon client
    const client = getSupabaseBrowserClient();
    let { error: signInError } = await client.auth.signInWithPassword({
      email: auth.user.email!,
      password: password,
    });

    if (signInError) {
      // Try Google deterministic password
      const googlePassword = getGoogleUserPassword(auth.user.email!);
      const { error: googleSignInError } = await client.auth.signInWithPassword({
        email: auth.user.email!,
        password: googlePassword,
      });
      if (!googleSignInError) {
        signInError = null;
      }
    }

    if (signInError) {
      throw new Error("Incorrect password. Please verify and try again.");
    }

    const { error } = await auth.supabase
      .from("profiles")
      .update({ transaction_pin: createTransactionPinVerifier(auth.user.id, pin) })
      .eq("id", auth.user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to set transaction PIN.");
  }
}
