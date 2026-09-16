import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT
         l.*,
         row_to_json(b.*) AS borrower,
         row_to_json(le.*) AS lender
       FROM loans l
       LEFT JOIN profiles b ON b.id = l.borrower_id
       LEFT JOIN profiles le ON le.id = l.lender_id
       WHERE l.borrower_id = $1 OR l.lender_id = $1
       ORDER BY l.created_at DESC`,
      [auth.user.id],
    );

    return NextResponse.json({ loans: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load loans.");
  }
}
