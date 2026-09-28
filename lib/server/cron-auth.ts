import { NextResponse } from "next/server";

/**
 * Verify the cron authorization header against CRON_SECRET.
 *
 * CRON_SECRET must be set as its own environment variable — it should NOT share
 * a value with AUTH_TOKEN_SECRET. The fallback to AUTH_TOKEN_SECRET is kept for
 * backwards compatibility but logs a warning in production so the misconfiguration
 * is visible in Railway logs.
 *
 * Returns a 401 NextResponse if unauthorized, or null if the caller may proceed.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;
  const fallbackSecret = process.env.AUTH_TOKEN_SECRET;

  if (!cronSecret && process.env.NODE_ENV === "production") {
    console.warn(
      "[cron-auth] CRON_SECRET is not set. Falling back to AUTH_TOKEN_SECRET — " +
        "set CRON_SECRET to a distinct value to remove this warning.",
    );
  }

  const effectiveSecret = cronSecret || fallbackSecret;

  if (!effectiveSecret || authHeader !== `Bearer ${effectiveSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
