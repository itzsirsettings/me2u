import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { errorResponse, requireAuthenticatedUser, tooManyRequestsResponse } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`pin-action-ip:${clientIp}`, 10, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`pin-action-user:${auth.user.id}`, 5, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const { action, pin } = body;

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      throw new Error("PIN must be exactly 4 digits.");
    }

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("transaction_pin")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Profile not found.");

    if (action === "set") {
      if (profile.transaction_pin) {
        throw new Error("PIN is already set. Contact support to reset.");
      }
      
      const { error: updateError } = await auth.supabase
        .from("profiles")
        .update({ transaction_pin: pin })
        .eq("id", auth.user.id);
        
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "verify") {
      if (!profile.transaction_pin) {
        throw new Error("No PIN set.");
      }
      if (profile.transaction_pin !== pin) {
        throw new Error("Incorrect PIN.");
      }
      return NextResponse.json({ ok: true });
    }

    throw new Error("Invalid action.");
  } catch (error) {
    return errorResponse(error, "Failed to process PIN action.");
  }
}
