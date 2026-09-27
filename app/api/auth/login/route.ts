import { NextResponse } from "next/server";

import { getUserByEmail, verifyPassword, generateToken } from "@/lib/railway/auth";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { tooManyRequestsResponse, withAuthCookiesForLogin } from "@/lib/server/auth";
import { requestMeta } from "@/lib/server/idempotency";

const DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const GENERIC_AUTH_ERROR = "Invalid email or password.";

export async function POST(request: Request) {
  try {
    const meta = requestMeta(request);
    const clientIp = getClientIp(request);

    if (await isRateLimited(`login-ip:${clientIp}`, 20, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const body: unknown = await request.json().catch(() => ({}));
    const payload =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (await isRateLimited(`login-email:${email}`, 10, 10 * 60_000)) {
      return tooManyRequestsResponse();
    }

    const account = await getUserByEmail(email);

    const hashToCheck = account?.password_hash || DUMMY_BCRYPT_HASH;
    const valid = await verifyPassword(password, hashToCheck);

    if (!account || !valid) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (account.accountLocked) {
      return NextResponse.json(
        {
          error:
            "Account is locked due to too many failed attempts. Reset your password or contact support.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { token } = await generateToken({
      userId: account.id,
      email: account.email,
      role: account.role,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const response = NextResponse.json(
      { success: true },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );

    return withAuthCookiesForLogin(response, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
