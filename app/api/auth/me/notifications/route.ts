import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT id, user_id, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [auth.user.id],
    );

    return NextResponse.json({ notifications: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load notifications.");
  }
}
