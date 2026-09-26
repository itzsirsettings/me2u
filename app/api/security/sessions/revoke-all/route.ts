import { NextResponse } from "next/server";

import { revokeAllSessionsForUser } from "@/lib/railway/auth";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { buildClearedAuthCookie, buildClearedCsrfCookie } from "@/lib/server/auth-cookie";

/**
 * Sign out EVERY session for the authenticated user, including the one making
 * this request, and clear the auth + CSRF cookies. Used by the post-PIN-save
 * prompt for the "Log out of all sessions globally" option.
 */
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`security-revoke-all-ip:${clientIp}`, 50, 15 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`security-revoke-all-user:${auth.user.id}`, 20, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }

    await revokeAllSessionsForUser(auth.user.id, false, undefined);

    const response = NextResponse.json(
      { ok: true, loggedOut: "all" },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.headers.append("Set-Cookie", buildClearedAuthCookie());
    response.headers.append("Set-Cookie", buildClearedCsrfCookie());
    return response;
  } catch (error) {
    return errorResponse(
      error,
      "Unable to sign out all sessions.",
      "api/security/sessions/revoke-all",
    );
  }
}
