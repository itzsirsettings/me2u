import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const accountNumber = String(body.account_number || "").trim();
    const bankCode = String(body.bank_code || "").trim();

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be 10 digits" },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        { error: "Bank code is required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const data = await res.json();

    if (!data.status || !data.data?.account_name) {
      return NextResponse.json(
        { error: "Could not resolve account name. Check the details and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      account_name: data.data.account_name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve account" },
      { status: 500 }
    );
  }
}
