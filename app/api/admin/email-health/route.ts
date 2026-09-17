import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";
import { verifyEmailConfig } from "@/lib/server/email";

/**
 * Email configuration health check endpoint
 * GET /api/admin/email-health
 *
 * Returns Resend configuration presence; delivery requires a controlled inbox test.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Check admin role
    const { rows: roleRows } = await auth.db.query<{ role: string }>(
      `SELECT role FROM profiles WHERE id = $1`,
      [auth.user.id],
    );

    if (!roleRows[0] || roleRows[0].role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    // Verify email configuration
    const emailHealth = verifyEmailConfig();

    return NextResponse.json(
      {
        provider: "resend",
        status: emailHealth.configured ? "configured_delivery_unverified" : "not_configured",
        configured: emailHealth.configured,
        delivery_verified: false,
        message: emailHealth.error,
        environment: {
          RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
          EMAIL_FROM: Boolean(process.env.EMAIL_FROM?.trim()),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "Failed to check email health.");
  }
}
