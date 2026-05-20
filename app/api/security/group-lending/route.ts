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
    if (isRateLimited(`security-group-lending-ip:${clientIp}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { data: profile, error: selectError } = await auth.supabase
      .from("profiles")
      .select("group_lending_enabled")
      .eq("id", auth.user.id)
      .single();

    if (selectError) throw new Error(selectError.message);

    const nextState = !profile.group_lending_enabled;

    const { error: updateError } = await auth.supabase
      .from("profiles")
      .update({ group_lending_enabled: nextState })
      .eq("id", auth.user.id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true, enabled: nextState });
  } catch (error) {
    return errorResponse(error, "Unable to toggle group lending.");
  }
}
