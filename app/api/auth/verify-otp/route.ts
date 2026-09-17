import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error:
        "This verification endpoint has been retired. Please use the registration or password reset page.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
