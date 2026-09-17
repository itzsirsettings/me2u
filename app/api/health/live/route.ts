import { NextResponse } from "next/server";

/**
 * Liveness probe for Railway healthcheck (`railway.json` → healthcheckPath).
 * Must not touch the database or any external service — it only proves the
 * Next.js server is up and able to serve requests.
 */
export async function GET() {
  return NextResponse.json(
    { status: "live", checkedAt: new Date().toISOString() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
