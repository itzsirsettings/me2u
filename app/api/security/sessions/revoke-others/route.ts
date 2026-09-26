import { NextResponse } from "next/server";

import { revokeOtherSessions } from "@/lib/railway/auth";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

/**
 * Sign out every session for the authenticated user EXCEPT the one making
 * this request. Used by the post-PIN-save prompt for the
 * "Log out of all other sessions while keeping the current session active"
 * option.
 */
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`security-revoke-others-ip:${clientIp}`, 50, 15 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`security-revoke-others-user:${auth.user.id}`, 20, 60 * 60_000)) {
      return tooManyRequestsResponse();
    }

    await revokeOtherSessions(auth.user.id, auth.jwtPayload.jti);

    // The revocation already succeeded; a failed audit write must not be
    // reported to the caller as a failed sign-out.
    await auth.db
      .query(
        `INSERT INTO security_events (user_id, type, detail, metadata, created_at)
         VALUES ($1, 'sessions_revoked_others', $2, $3, NOW())`,
        [
          auth.user.id,
          "Signed out all other sessions; this session stayed active.",
          JSON.stringify({
            userAgent: request.headers.get("user-agent")?.slice(0, 180) || null,
            at: new Date().toISOString(),
          }),
        ],
      )
      .catch(() => undefined);

    return NextResponse.json(
      { ok: true, loggedOut: "other" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(
      error,
      "Unable to sign out other sessions.",
      "api/security/sessions/revoke-others",
    );
  }
}
