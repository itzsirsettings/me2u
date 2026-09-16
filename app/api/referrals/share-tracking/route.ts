import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;
    const body = await request.json();
    const templateType = String(body.template_type || "").trim();

    const validTypes = ["whatsapp", "sms", "copy", "native_share"];
    if (!validTypes.includes(templateType)) {
      return NextResponse.json(
        { error: "Invalid template type. Use: whatsapp, sms, copy, or native_share." },
        { status: 400 },
      );
    }

    // Track share
    await auth.db.query(
      `INSERT INTO share_template_usage (user_id, template_type, shared_at)
       VALUES ($1, $2, NOW())`,
      [userId, templateType],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to track share.");
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const userId = auth.user.id;

    // Get share statistics
    const { rows } = await auth.db.query<{
      template_type: string;
      share_count: number;
    }>(
      `SELECT 
         template_type,
         COUNT(*)::int as share_count
       FROM share_template_usage
       WHERE user_id = $1
       GROUP BY template_type
       ORDER BY share_count DESC`,
      [userId],
    );

    const totalShares = rows.reduce((sum, row) => sum + row.share_count, 0);

    return NextResponse.json({
      totalShares,
      byType: rows,
      mostUsed: rows[0]?.template_type || null,
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch share statistics.");
  }
}
