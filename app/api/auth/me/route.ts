import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";
import { withFreshCsrfCookie } from "@/lib/server/auth-cookie";

/**
 * GET /api/auth/me
 * Returns the current user's full profile + wallet balance.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    return withFreshCsrfCookie(
      request,
      NextResponse.json({ user: auth.user }, { headers: { "Cache-Control": "no-store" } }),
    );
  } catch (error) {
    return errorResponse(error, "Unable to load user.");
  }
}
