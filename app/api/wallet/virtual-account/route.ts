import { NextResponse } from "next/server";
import { errorResponse, requireAuthenticatedUser } from "@/lib/server/auth";

type VirtualAccountRow = {
  status: string;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query<VirtualAccountRow>(
      `SELECT status, account_name, account_number, bank_name
       FROM virtual_accounts
       WHERE user_id = $1 AND provider = 'wema'
       LIMIT 1`,
      [auth.user.id],
    );

    const account = rows[0];
    if (!account) {
      return NextResponse.json(
        {
          status: "pending",
          message: auth.user.kycVerified
            ? "Your dedicated funding account is being prepared. Please check again shortly."
            : "Complete KYC before your dedicated funding account can be created.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(account, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "Unable to load your funding account.");
  }
}
