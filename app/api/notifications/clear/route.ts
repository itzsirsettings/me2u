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
    if (isRateLimited(`notifications-clear-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (isRateLimited(`notifications-clear-user:${auth.user.id}`, 20, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const clearAll = Boolean(body.clearAll);
    const id = typeof body.id === "string" ? body.id : null;

    if (clearAll) {
      const { error } = await auth.supabase
        .from("notifications")
        .delete()
        .eq("user_id", auth.user.id);

      if (error) throw new Error(error.message);
    } else if (id) {
      const { error } = await auth.supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", auth.user.id);

      if (error) throw new Error(error.message);
    } else {
      throw new Error("Invalid request parameters.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to clear notifications.");
  }
}
