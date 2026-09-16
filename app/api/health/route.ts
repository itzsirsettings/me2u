import { NextResponse } from "next/server";
import { getLaunchReadiness } from "@/lib/server/launch-readiness";

export async function GET() {
  const readiness = getLaunchReadiness();

  return NextResponse.json(readiness, {
    status: readiness.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
