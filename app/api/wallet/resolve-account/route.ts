import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { requireAuthenticatedUser, tooManyRequestsResponse } from "@/lib/server/auth";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`resolve-account-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: "Bank verification is not configured. Please contact support." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const accountNumber = String(body.account_number || "").trim();
    const bankCode = String(body.bank_code || "").trim();

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be 10 digits" },
        { status: 400 }
      );
    }

    if (!/^\d{3,6}$/.test(bankCode)) {
      return NextResponse.json(
        { error: "Select a valid bank" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    });
    const res = await fetch(`https://api.paystack.co/bank/resolve?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    });

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
