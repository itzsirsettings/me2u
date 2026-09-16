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
    if (isRateLimited(`notifications-clear-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`notifications-clear-user:${auth.user.id}`, 20, 60_000)) return tooManyRequestsResponse();

    const body = await request.json();
    const clearAll = Boolean(body.clearAll);
    const id = typeof body.id === "string" ? body.id : null;

    if (clearAll) {
      await auth.db.query(
        `DELETE FROM notifications WHERE user_id = $1`,
        [auth.user.id],
      );
    } else if (id) {
      await auth.db.query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
        [id, auth.user.id],
      );
    } else {
      throw new Error("Invalid request parameters.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to clear notifications.");
  }
}
