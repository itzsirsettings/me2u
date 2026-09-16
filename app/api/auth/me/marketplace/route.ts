import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT *
       FROM marketplace_items
       WHERE status = 'active' OR author_id = $1
       ORDER BY created_at DESC`,
      [auth.user.id],
    );

    return NextResponse.json({ items: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load marketplace.");
  }
}
