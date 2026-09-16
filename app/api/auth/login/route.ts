import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { getUserByEmail, verifyPassword, generateToken } from "@/lib/railway/auth";
import { tooManyRequestsResponse } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`login-ip:${clientIp}`, 20, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (isRateLimited(`login-email:${email}`, 10, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const account = await getUserByEmail(email);
    if (!account) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = generateToken({
      userId: account.id,
      email: account.email,
      role: account.role,
    });

    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
