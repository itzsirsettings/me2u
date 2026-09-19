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
    if (await isRateLimited(`security-group-lending-ip:${clientIp}`, 100, 15 * 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query<{ group_lending_enabled: boolean }>(
      `SELECT group_lending_enabled FROM profiles WHERE id = $1`,
      [auth.user.id],
    );

    if (!rows[0]) throw new Error("Profile not found.");

    const nextState = !rows[0].group_lending_enabled;

    await auth.db.query(
      `UPDATE profiles SET group_lending_enabled = $1, updated_at = NOW() WHERE id = $2`,
      [nextState, auth.user.id],
    );

    return NextResponse.json({ ok: true, enabled: nextState });
  } catch (error) {
    return errorResponse(error, "Unable to toggle group lending.");
  }
}
