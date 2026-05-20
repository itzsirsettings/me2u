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
    if (isRateLimited(`merchant-deals-get-ip:${clientIp}`, 60, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const db = auth.supabase as any;
    const [{ data: profile }, { data: claims, error: claimsError }] = await Promise.all([
      db.from("profiles").select("country_code").eq("id", auth.user.id).maybeSingle(),
      db.from("merchant_deal_claims").select("*").eq("user_id", auth.user.id),
    ]);

    if (claimsError) throw new Error(claimsError.message);

    const countryCode = profile?.country_code || "NG";
    const { data: deals, error: dealsError } = await db
      .from("merchant_deals")
      .select("*")
      .eq("active", true)
      .in("country_code", [countryCode, "NG"])
      .order("created_at", { ascending: false });

    if (dealsError) throw new Error(dealsError.message);

    return NextResponse.json({ ok: true, deals: deals || [], claims: claims || [] });
  } catch (error) {
    return errorResponse(error, "Unable to load merchant deals.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`merchant-deals-post-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const dealId = String(body.dealId || "").trim();
    if (!dealId) throw new Error("Deal is required.");

    const db = auth.supabase as any;
    const { data: claim, error } = await db
      .from("merchant_deal_claims")
      .upsert(
        { user_id: auth.user.id, deal_id: dealId, status: "claimed" },
        { onConflict: "user_id,deal_id" },
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    return errorResponse(error, "Unable to claim merchant deal.");
  }
}
