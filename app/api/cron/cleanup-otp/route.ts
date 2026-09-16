import { NextResponse } from "next/server";
import { cleanupExpiredOtps } from "@/lib/server/in-app-otp";

/**
 * Cron job to cleanup expired OTP codes
 * Schedule: Run daily
 * Vercel Cron: Add to vercel.json
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.AUTH_TOKEN_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deletedCount = await cleanupExpiredOtps();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired OTP code(s)`,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OTP cleanup cron job error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cleanup OTP codes",
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
