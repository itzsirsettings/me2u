import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/server/email";

/**
 * Test email endpoint - Use to verify SMTP configuration
 * GET /api/auth/test-email?email=your@email.com
 * 
 * Security: Remove or protect this endpoint in production!
 */
export async function GET(request: Request) {
  try {
    // Only allow in development or with admin auth
    if (process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("authorization");
      const adminSecret = process.env.ADMIN_SECRET || process.env.AUTH_TOKEN_SECRET;
      
      if (authHeader !== `Bearer ${adminSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const testCode = "123456";
    const result = await sendOtpEmail(email, testCode);

    return NextResponse.json({
      success: result.success,
      email,
      testCode,
      loggedToConsole: result.loggedToConsole,
      error: result.error,
      smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
      smtpHost: process.env.SMTP_HOST || "not configured",
      smtpPort: process.env.SMTP_PORT || "not configured",
      message: result.success 
        ? result.loggedToConsole 
          ? "Email logged to console (SMTP not configured)" 
          : "Email sent successfully!"
        : "Failed to send email",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test email failed",
        stack: process.env.NODE_ENV === "development" ? (error as Error)?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
