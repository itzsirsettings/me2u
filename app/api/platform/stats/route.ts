import { getPlatformStats } from "@/lib/server/platform-stats";
import { NextResponse } from "next/server";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await getPlatformStats();

    return NextResponse.json(
      { ok: true, stats: result },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    logApiError("platform-stats", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
