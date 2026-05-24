import { NextResponse } from "next/server";
import { verifyNin } from "@/lib/nin";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`nin:${clientIp}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const profile = await verifyNin(String(body.nin || ""));

    return NextResponse.json(
      {
        firstName: profile.firstName,
        lastName: profile.lastName,
        otherNames: profile.otherNames,
        ninLast4: profile.ninLast4,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify NIN." },
      { status: 400 },
    );
  }
}
