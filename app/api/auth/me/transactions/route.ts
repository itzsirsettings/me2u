import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT id, user_id, type, amount, description, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [auth.user.id],
    );

    return NextResponse.json({ transactions: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load transactions.");
  }
}
