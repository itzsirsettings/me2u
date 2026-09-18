import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { query } from "@/lib/railway/client";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`login-username-ip:${clientIp}`, 20, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();

    if (!/^[a-z0-9]{3,30}$/.test(username)) {
      return NextResponse.json({ error: "Enter a valid username." }, { status: 400 });
    }

    if (await isRateLimited(`login-username:${username}`, 10, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const { rows } = await query<{ email: string }>(
      `SELECT email FROM profiles WHERE LOWER(username) = $1 LIMIT 1`,
      [username],
    );

    if (!rows[0]?.email) {
      return NextResponse.json({ error: "Username was not found." }, { status: 404 });
    }

    return NextResponse.json({ email: rows[0].email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve username.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
