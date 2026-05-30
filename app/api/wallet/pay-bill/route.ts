import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Legacy wallet bill debit is retired. Use the Me2U Bills API at /bills so provider fulfilment, requery, and refunds are tracked.",
    },
    { status: 410 },
  );
}
