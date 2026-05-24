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

    const { error } = await auth.supabase
      .from("profiles")
      .update({
        bank_name: bankName,
        account_number: accountNumber,
        passport_photo_url: passportPhotoUrl,
        kyc_verified: false,
      })
      .eq("id", auth.user.id);

    if (error) {
      console.error("KYC update error:", error);
      return NextResponse.json(
        { error: "Failed to update KYC information" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, status: "pending_review" });
  } catch (error) {
    console.error("KYC error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
