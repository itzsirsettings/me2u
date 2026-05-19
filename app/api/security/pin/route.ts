import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

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

    if (!/^\d{4}$/.test(pin)) {
      throw new Error("Transaction PIN must be a 4-digit number.");
    }

    const { error } = await auth.supabase
      .from("profiles")
      .update({ transaction_pin: pin })
      .eq("id", auth.user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to set transaction PIN.");
  }
}
