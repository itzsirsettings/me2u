import { NextResponse } from "next/server";

import { revokeEverySession } from "@/lib/railway/auth";
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

    await revokeEverySession(auth.user.id, false);

    // The revocation already succeeded; a failed audit write must not be
    // reported to the caller as a failed sign-out.
    await auth.db
      .query(
        `INSERT INTO security_events (user_id, type, detail, metadata, created_at)
         VALUES ($1, 'sessions_revoked_all', $2, $3, NOW())`,
        [
          auth.user.id,
          "Signed out of all sessions on every device.",
          JSON.stringify({
            userAgent: request.headers.get("user-agent")?.slice(0, 180) || null,
            at: new Date().toISOString(),
          }),
        ],
      )
      .catch(() => undefined);

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
