import { NextResponse } from "next/server";
import { revokeTokenByJti } from "@/lib/railway/auth";
import {
  buildClearedAuthCookie,
  buildClearedCsrfCookie,
} from "@/lib/server/auth-cookie";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  try {
    await revokeTokenByJti(auth.jwtPayload.jti, auth.user.id);
  } catch {
    // Server still clears the cookie even if some session cleanup fails.
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.headers.append("Set-Cookie", buildClearedAuthCookie());
  response.headers.append("Set-Cookie", buildClearedCsrfCookie());
  return response;
}