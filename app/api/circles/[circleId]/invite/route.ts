import { queryAsUser, withUserTransaction } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { circleId } = await params;
    const body = await request.json();
    const { userId, username } = body;

    if (!userId && !username) {
      return NextResponse.json(
        { ok: false, error: "Must provide userId or username" },
        { status: 400 }
      );
    }

    // Verify user is a member of this circle
    const { rows: membership } = await queryAsUser<{ circle_id: string }>(
      auth.user.id,
      `SELECT circle_id FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
      [circleId, auth.user.id]
    );

    if (membership.length === 0) {
      return NextResponse.json(
        { ok: false, error: "You must be a member to invite others" },
        { status: 403 }
      );
    }

    // Use transaction to ensure consistency
    const result = await withUserTransaction(auth.user.id, async (client) => {
      // Find the user to invite
      let inviteeId = userId;
      if (!inviteeId && username) {
        const profileResult = await client.query<{ id: string }>(
          `SELECT id FROM profiles WHERE username = $1`,
          [username.toLowerCase()]
        );

        if (profileResult.rows.length === 0) {
          throw new Error("User not found");
        }

        inviteeId = profileResult.rows[0].id;
      }

      // Check if already a member
      const existingResult = await client.query<{ circle_id: string }>(
        `SELECT circle_id FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
        [circleId, inviteeId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error("User is already a member of this circle");
      }

      // Add user to circle
      await client.query(
        `INSERT INTO circle_members (circle_id, user_id, joined_at)
         VALUES ($1, $2, NOW())`,
        [circleId, inviteeId]
      );

      // Get circle name for notification
      const circleResult = await client.query<{ name: string }>(
        `SELECT name FROM circles WHERE id = $1`,
        [circleId]
      );

      const circleName = circleResult.rows[0]?.name || "New Circle";

      // Send notification to invitee
      await client.query(
        `INSERT INTO notifications (user_id, title, message, created_at, read)
         VALUES ($1, $2, $3, NOW(), false)`,
        [inviteeId, "Circle Invitation", `You've been added to the circle: ${circleName}`]
      );

      return { circleName };
    });

    return NextResponse.json({
      ok: true,
      message: "User added to circle successfully",
      circleName: result.circleName,
    });
  } catch (error) {
    logApiError("circle-invite", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: error instanceof Error && message.includes("not found") ? 404 : 500 }
    );
  }
}
