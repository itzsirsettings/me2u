import { NextResponse } from "next/server";
import { getRailwayDbClient, query } from "@/lib/railway/client";
import { verifyToken, getUserById, isTokenRevoked } from "@/lib/railway/auth";
import type { JWTPayload } from "@/lib/railway/auth";
import {
  readTokenFromRequest,
  isTokenFromCookie,
  validateCsrfIfCookieAuth,
  issueCsrfCookie,
  withClearedAuthCookie,
} from "@/lib/server/auth-cookie";
import { logApiError, logWarn } from "@/lib/server/logger";
import type { User } from "@/lib/store";

const maxMoneyAmount = 10_000_000;

type AuthContext =
  | {
      db: ReturnType<typeof getRailwayDbClient>;
      user: User;
      accessToken: string;
      jwtPayload: JWTPayload;
    }
  | {
      response: NextResponse;
    };

type AdminAuthContext =
  | {
      db: ReturnType<typeof getRailwayDbClient>;
      user: User;
      accessToken: string;
      jwtPayload: JWTPayload;
    }
  | {
      response: NextResponse;
    };

function csrfFailureResponse(): NextResponse {
  const res = NextResponse.json(
    { error: "CSRF validation failed. Refresh the page and try again." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
  return withClearedAuthCookie(res);
}

function expiredSessionResponse(): NextResponse {
  const res = NextResponse.json(
    { error: "Session expired. Please log in again." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
  return withClearedAuthCookie(res);
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthContext> {
  const token = readTokenFromRequest(request);

  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Please log in first." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { response: expiredSessionResponse() };
  }

  // Revocation check (Redis fast-path + auth_sessions DB truth + password_changed_at)
  const revoked = await isTokenRevoked(payload);
  if (revoked) {
    try {
      logWarn("revoked_token_rejected", { jti: payload.jti, userId: payload.userId });
    } catch {
      // ignore
    }
    return { response: expiredSessionResponse() };
  }

  // CSRF: required for state-changing HTTP methods authenticated via cookie
  const method = request.method.toUpperCase();
  const usingCookie = isTokenFromCookie(request);
  if (
    (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH") &&
    usingCookie &&
    !validateCsrfIfCookieAuth(request, true)
  ) {
    try {
      logWarn("csrf_validation_failed", { method, usingCookie });
    } catch {
      // ignore
    }
    return { response: csrfFailureResponse() };
  }

  const db = getRailwayDbClient();
  const user = await getUserById(payload.userId);

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "User not found." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  return { db, user, accessToken: token, jwtPayload: payload };
}

/**
 * Attach CSRF + auth cookies to a login/auth response.
 * Pass the raw NextResponse; returns the same response with headers set.
 */
export function withAuthCookiesForLogin(response: NextResponse, token: string): NextResponse {
  const csrf = issueCsrfCookie();
  response.headers.append("Set-Cookie", buildAuthCookieRaw(token));
  response.headers.append("Set-Cookie", csrf.cookie);
  response.headers.set("x-csrf-token", csrf.headerValue);
  return response;
}

function buildAuthCookieRaw(token: string): string {
  // Reuse the same logic as buildAuthCookie without cyclic import issues.
  const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const domain = process.env.AUTH_COOKIE_DOMAIN
    ? `; Domain=${process.env.AUTH_COOKIE_DOMAIN}`
    : "";
  return `me2u_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SEVEN_DAYS_SECONDS}${domain}${secure}`;
}

export async function requireAdminUser(request: Request): Promise<AdminAuthContext> {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth;

  if (auth.user.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  return auth;
}

export function readPositiveAmount(value: unknown, label = "Amount", max = maxMoneyAmount) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  if (amount > max) {
    throw new Error(`${label} must not exceed ₦${max.toLocaleString()}.`);
  }

  return Math.round(amount * 100) / 100;
}

export function errorResponse(
  error: unknown,
  fallback = "Unable to complete request.",
  route?: string,
) {
  if (route) logApiError(route, error);
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export function tooManyRequestsResponse(
  message = "Too many attempts. Please wait and try again.",
  retryAfterSeconds?: number,
) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (
    retryAfterSeconds !== undefined &&
    Number.isFinite(retryAfterSeconds) &&
    retryAfterSeconds > 0
  ) {
    // RFC 6585: tell well-behaved clients when to come back.
    headers["Retry-After"] = String(Math.ceil(retryAfterSeconds));
  }
  return NextResponse.json({ error: message }, { status: 429, headers });
}
