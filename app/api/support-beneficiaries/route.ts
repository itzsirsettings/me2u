import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`support-beneficiaries-get-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { data, error } = await auth.supabase
      .from("support_beneficiaries")
      .select("*")
      .eq("sponsor_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, beneficiaries: data || [] });
  } catch (error) {
    return errorResponse(error, "Unable to load support beneficiaries.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`support-beneficiaries-post-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "create").trim().toLowerCase();
    const db = auth.supabase as any;

    if (action === "create") {
      const beneficiaryName = String(body.beneficiaryName || "").trim();
      const relationship = String(body.relationship || "Family").trim().slice(0, 80);
      const purpose = String(body.purpose || "Family support").trim().slice(0, 120);
      const supportMode = body.supportMode === "repayment" ? "repayment" : "non_repayment";

      if (beneficiaryName.length < 2 || beneficiaryName.length > 120) {
        throw new Error("Beneficiary name must be between 2 and 120 characters.");
      }

      const { data, error } = await db
        .from("support_beneficiaries")
        .insert({
          sponsor_id: auth.user.id,
          beneficiary_name: beneficiaryName,
          relationship,
          purpose,
          support_mode: supportMode,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, beneficiary: data });
    }

    if (action === "record_support") {
      const beneficiaryId = String(body.beneficiaryId || "").trim();
      const amount = readPositiveAmount(body.amount, "Support amount");
      const spendingProofUrl = typeof body.spendingProofUrl === "string" ? body.spendingProofUrl.trim().slice(0, 500) : null;

      if (!beneficiaryId) throw new Error("Beneficiary is required.");

      const { data, error } = await db
        .from("support_beneficiaries")
        .update({
          last_support_amount: amount,
          spending_proof_url: spendingProofUrl,
        })
        .eq("id", beneficiaryId)
        .eq("sponsor_id", auth.user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, beneficiary: data });
    }

    throw new Error("Unsupported support action.");
  } catch (error) {
    return errorResponse(error, "Unable to update support beneficiary.");
  }
}
