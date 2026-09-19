import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { requireAuthenticatedUser, tooManyRequestsResponse } from "@/lib/server/auth";

const DAY_MS = 24 * 60 * 60_000;
const DAY_SECONDS = 24 * 60 * 60;

export async function POST(request: Request) {
  try {
    // RL-004: rate limit BEFORE any DB work. KYC writes are heavy
    // (profile update + admin review queue) and user-scoped documents
    // are uploaded — keep per-network and per-user budgets tight.
    const clientIp = getClientIp(request);
    if (await isRateLimited(`kyc-ip:${clientIp}`, 20, DAY_MS)) {
      return tooManyRequestsResponse(
        "Too many KYC submissions from this network. Please try again tomorrow.",
        DAY_SECONDS,
      );
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (await isRateLimited(`kyc-user:${auth.user.id}`, 5, DAY_MS)) {
      return tooManyRequestsResponse(
        "Too many KYC submissions today. Please try again tomorrow.",
        DAY_SECONDS,
      );
    }

    const body = await request.json();
    const bankName = String(body.bankName || "")
      .trim()
      .slice(0, 80);
    const accountNumber = String(body.accountNumber || "").replace(/\D/g, "");
    const passportPhotoUrl = String(body.passportPhotoUrl || "").trim();

    if (bankName.length < 2) {
      return NextResponse.json({ error: "Bank name is required" }, { status: 400 });
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Account number must be 10 digits" }, { status: 400 });
    }
    if (!passportPhotoUrl.startsWith(`${auth.user.id}/`)) {
      return NextResponse.json({ error: "Passport photo is required" }, { status: 400 });
    }

    // Reset KYC verification (kyc_verified: false) when bank details are updated
    await auth.db.query(
      `UPDATE profiles
       SET bank_name = $1, account_number = $2, passport_photo_url = $3,
           kyc_verified = false, updated_at = NOW()
       WHERE id = $4`,
      [bankName, accountNumber, passportPhotoUrl, auth.user.id],
    );

    return NextResponse.json({ success: true, status: "pending_review" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
