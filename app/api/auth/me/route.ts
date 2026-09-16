import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";
import { getUserById } from "@/lib/railway/auth";

/**
 * GET /api/auth/me
 * Returns the current user's full profile + wallet balance.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const user = await getUserById(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return errorResponse(error, "Unable to load user.");
  }
}
