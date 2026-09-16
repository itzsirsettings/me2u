import { NextResponse } from "next/server";
import { requireAuthenticatedUser, errorResponse } from "@/lib/server/auth";
import { verifyEmailConfig } from "@/lib/server/email";

/**
 * Email configuration health check endpoint
 * GET /api/admin/email-health
 * 
 * Returns SMTP configuration status and connection health
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Check admin role
    const { rows: roleRows } = await auth.db.query<{ role: string }>(
      `SELECT role FROM profiles WHERE id = $1`,
      [auth.user.id]
    );
    
    if (!roleRows[0] || roleRows[0].role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    // Verify email configuration
    const emailHealth = await verifyEmailConfig();

    // Get recent email send stats
    const recentSends = {
      last_hour: 0,
      last_24h: 0,
      last_7d: 0,
    };

    // Check environment variables (without exposing secrets)
    const envCheck = {
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASSWORD: !!process.env.SMTP_PASSWORD,
      EMAIL_FROM: !!process.env.EMAIL_FROM,
      SMTP_SECURE: process.env.SMTP_SECURE || "not set",
    };

    return NextResponse.json({
      status: emailHealth.connected ? "healthy" : emailHealth.configured ? "configured_but_disconnected" : "not_configured",
      configured: emailHealth.configured,
      connected: emailHealth.connected,
      config: emailHealth.config,
      error: emailHealth.error,
      environment: envCheck,
      recent_sends: recentSends,
      recommendations: getRecommendations(emailHealth),
    });
  } catch (error) {
    return errorResponse(error, "Failed to check email health.");
  }
}

function getRecommendations(health: Awaited<ReturnType<typeof verifyEmailConfig>>): string[] {
  const recommendations: string[] = [];

  if (!health.configured) {
    recommendations.push("Configure SMTP credentials in environment variables");
    recommendations.push("Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM");
    recommendations.push("For Gmail: Enable 2FA and generate app password at https://myaccount.google.com/apppasswords");
  } else if (!health.connected) {
    if (health.error?.includes("authentication")) {
      recommendations.push("Check SMTP username and password are correct");
      recommendations.push("For Gmail: Use app password, not your regular Gmail password");
      recommendations.push("Verify 2FA is enabled on your Gmail account");
    } else if (health.error?.includes("timeout")) {
      recommendations.push("Check SMTP_HOST and SMTP_PORT are correct");
      recommendations.push("Verify firewall allows outbound connections on the SMTP port");
      recommendations.push("Try SMTP_PORT=587 with SMTP_SECURE=false");
    } else if (health.error?.includes("certificate")) {
      recommendations.push("Try setting SMTP_SECURE=false");
    } else {
      recommendations.push("Check all SMTP credentials are correct");
      recommendations.push("Test connection manually using telnet or openssl");
    }
  } else {
    recommendations.push("Email configuration is healthy ✅");
    recommendations.push("Users should receive OTP codes within seconds");
  }

  return recommendations;
}
