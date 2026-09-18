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
    if (await isRateLimited(`support-beneficiaries-get-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT * FROM support_beneficiaries WHERE sponsor_id = $1 ORDER BY created_at DESC`,
      [auth.user.id],
    );

    return NextResponse.json({ ok: true, beneficiaries: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load support beneficiaries.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`support-beneficiaries-post-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "create").trim().toLowerCase();

    if (action === "create") {
      const beneficiaryName = String(body.beneficiaryName || "").trim();
      const relationship = String(body.relationship || "Family").trim().slice(0, 80);
      const purpose = String(body.purpose || "Family support").trim().slice(0, 120);
      const supportMode = body.supportMode === "repayment" ? "repayment" : "non_repayment";

      if (beneficiaryName.length < 2 || beneficiaryName.length > 120) {
        throw new Error("Beneficiary name must be between 2 and 120 characters.");
      }

      const { rows } = await auth.db.query(
        `INSERT INTO support_beneficiaries
           (sponsor_id, beneficiary_name, relationship, purpose, support_mode,
            verified, last_support_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, false, 0, NOW(), NOW())
         RETURNING *`,
        [auth.user.id, beneficiaryName, relationship, purpose, supportMode],
      );

      return NextResponse.json({ ok: true, beneficiary: rows[0] });
    }

    if (action === "record_support") {
      const beneficiaryId = String(body.beneficiaryId || "").trim();
      const amount = readPositiveAmount(body.amount, "Support amount");
      const spendingProofUrl =
        typeof body.spendingProofUrl === "string"
          ? body.spendingProofUrl.trim().slice(0, 500)
          : null;

      if (!beneficiaryId) throw new Error("Beneficiary is required.");

      const { rows } = await auth.db.query(
        `UPDATE support_beneficiaries
         SET last_support_amount = $1,
             spending_proof_url = $2,
             updated_at = NOW()
         WHERE id = $3 AND sponsor_id = $4
         RETURNING *`,
        [amount, spendingProofUrl, beneficiaryId, auth.user.id],
      );

      if (!rows[0]) throw new Error("Beneficiary not found.");
      return NextResponse.json({ ok: true, beneficiary: rows[0] });
    }

    throw new Error("Unsupported support action.");
  } catch (error) {
    return errorResponse(error, "Unable to update support beneficiary.");
  }
}
