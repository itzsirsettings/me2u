import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;
  return NextResponse.json(
    {
      error:
        "Manual wallet funding is no longer available. Confirm your registration deposit to receive your dedicated wallet account.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
