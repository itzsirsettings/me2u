import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const bankName = String(body.bankName || "").trim().slice(0, 80);
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
