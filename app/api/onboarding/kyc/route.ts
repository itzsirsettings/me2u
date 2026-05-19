import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const bankName = String(body.bankName || "").trim();
    const accountNumber = String(body.accountNumber || "").trim();
    const passportPhotoUrl = String(body.passportPhotoUrl || "").trim();

    if (bankName.length < 2) {
      return NextResponse.json({ error: "Bank name is required" }, { status: 400 });
    }
    if (accountNumber.length < 10) {
      return NextResponse.json({ error: "Account number must be at least 10 digits" }, { status: 400 });
    }
    if (passportPhotoUrl.length < 5) {
      return NextResponse.json({ error: "Passport photo is required" }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from("profiles")
      .update({
        bank_name: bankName,
        account_number: accountNumber,
        passport_photo_url: passportPhotoUrl,
        kyc_verified: true,
      })
      .eq("id", auth.user.id);

    if (error) {
      console.error("KYC update error:", error);
      return NextResponse.json(
        { error: "Failed to update KYC information" },
        { status: 500 },
      );
    }

    const { error: bonusError } = await auth.supabase.rpc("me2u_unlock_welcome_bonus", {
      p_user_id: auth.user.id,
    });

    if (bonusError) {
      console.error("Welcome bonus unlock error:", bonusError);
      return NextResponse.json(
        { error: "KYC saved, but the welcome bonus could not be unlocked. Please contact support." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KYC error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
