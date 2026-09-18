import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`merchant-deals-get-ip:${clientIp}`, 60, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows: profileRows } = await auth.db.query<{ country_code: string }>(
      `SELECT country_code FROM profiles WHERE id = $1`,
      [auth.user.id],
    );
    const countryCode = profileRows[0]?.country_code || "NG";

    const [dealsResult, claimsResult] = await Promise.all([
      auth.db.query(
        `SELECT * FROM merchant_deals
         WHERE active = true AND country_code = ANY($1::text[])
         ORDER BY created_at DESC`,
        [[countryCode, "NG"]],
      ),
      auth.db.query(
        `SELECT deal_id, status FROM merchant_deal_claims WHERE user_id = $1`,
        [auth.user.id],
      ),
    ]);

    return NextResponse.json({
      ok: true,
      deals: dealsResult.rows,
      claims: claimsResult.rows,
    });
  } catch (error) {
    return errorResponse(error, "Unable to load merchant deals.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`merchant-deals-post-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const dealId = String(body.dealId || "").trim();
    if (!dealId) throw new Error("Deal is required.");

    // Verify the deal exists and is active
    const { rows: dealRows } = await auth.db.query(
      `SELECT id FROM merchant_deals WHERE id = $1 AND active = true`,
      [dealId],
    );
    if (!dealRows[0]) throw new Error("Deal not found or no longer active.");

    const { rows } = await auth.db.query(
      `INSERT INTO merchant_deal_claims (user_id, deal_id, status, created_at)
       VALUES ($1, $2, 'claimed', NOW())
       ON CONFLICT (user_id, deal_id) DO UPDATE SET status = 'claimed'
       RETURNING *`,
      [auth.user.id, dealId],
    );

    return NextResponse.json({ ok: true, claim: rows[0] });
  } catch (error) {
    return errorResponse(error, "Unable to claim merchant deal.");
  }
}
