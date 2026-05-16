import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`loan-repay-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`loan-repay-user:${auth.user.id}`, 12, 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json();
    const loanId = String(body.loanId || "");

    if (!loanId) {
      throw new Error("Loan is required.");
    }

    const { error } = await auth.supabase.rpc("me2u_repay_loan", {
      p_user_id: auth.user.id,
      p_loan_id: loanId,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to repay loan.");
  }
}
