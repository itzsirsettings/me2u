import { randomBytes, createHmac, timingSafeEqual } from "crypto";

/**
 * Shared authenticated-user cookie + CSRF helpers.
 *
 * Security model:
 *  - Primary authentication: httpOnly SameSite=Strict `me2u_token` cookie
 *    (XSS cannot read the JWT from JS document.cookie)
 *  - Fallback: Authorization: Bearer header (for native / non-browser clients)
 *  - CSRF: Double-submit cookie pattern. State-changing endpoints that accept
 *    cookie-based auth MUST also require `x-csrf-token` header matching the
 *    signed `me2u_csrf` cookie.
 */

export const AUTH_COOKIE_NAME = "me2u_token";
export const CSRF_COOKIE_NAME = "me2u_csrf";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
const CSRF_TTL_SECONDS = 60 * 60 * 6; // 6 hours

function getCookieDomain() {
  return process.env.AUTH_COOKIE_DOMAIN
    ? `; Domain=${process.env.AUTH_COOKIE_DOMAIN}`
    : "";
}

function secureSuffix(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function buildAuthCookie(token: string): string {
  return (
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}` +
    `; Path=/; HttpOnly; SameSite=Strict` +
    `; Max-Age=${SEVEN_DAYS_SECONDS}` +
    `${getCookieDomain()}${secureSuffix()}`
  );
}

export function buildClearedAuthCookie(): string {
  return (
    `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` +
    `${getCookieDomain()}${secureSuffix()}`
  );
}

export function readTokenFromRequest(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";");
  for (const part of cookies) {
    const [name, ...rest] = part.trim().split("=");
    if (name === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rest.join("=").trim());
    }
  }
  return "";
}

export function withAuthCookie(response: Response, token: string): Response {
  response.headers.append("Set-Cookie", buildAuthCookie(token));
  return response;
}

export function withClearedAuthCookie<T extends Response>(response: T): T {
  response.headers.append("Set-Cookie", buildClearedAuthCookie());
  return response;
}

// ── CSRF double-submit ────────────────────────────────────────────────
function getCsrfSecret(): Buffer {
  const raw = process.env.CSRF_SIGNING_SECRET || process.env.AUTH_TOKEN_SECRET;
  if (!raw) {
    throw new Error("Missing CSRF_SIGNING_SECRET or AUTH_TOKEN_SECRET.");
  }
  return Buffer.from(raw.substring(0, 32).padEnd(32, "0"), "utf8");
}

export function buildSignedCsrfToken(nonce: string, issuedAt: number): string {
  const payload = `${nonce}:${issuedAt}`;
  const signature = createHmac("sha256", getCsrfSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifySignedCsrfToken(token: string): { nonce: string; issuedAt: number } | null {
  try {
    const idx = token.lastIndexOf(".");
    if (idx < 0) return null;
    const payload = token.substring(0, idx);
    const providedSig = token.substring(idx + 1);
    const [nonce, issuedAtRaw] = payload.split(":");
    const issuedAt = Number(issuedAtRaw);
    if (!nonce || !Number.isFinite(issuedAt)) return null;

    const expectedSig = createHmac("sha256", getCsrfSecret())
      .update(payload)
      .digest("base64url");

    const a = Buffer.from(providedSig, "base64url");
    const b = Buffer.from(expectedSig, "base64url");
    const sigOk = a.length === b.length && timingSafeEqual(a, b);
    if (!sigOk) return null;
    return { nonce, issuedAt };
  } catch {
    return null;
  }
}

export function issueCsrfCookie(): { cookie: string; headerValue: string } {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Math.floor(Date.now() / 1000);
  const signed = buildSignedCsrfToken(nonce, issuedAt);
  const cookie =
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(signed)}` +
    `; Path=/; SameSite=Lax; Max-Age=${CSRF_TTL_SECONDS}` +
    `${getCookieDomain()}${secureSuffix()}`;
  return { cookie, headerValue: signed };
}

export function buildClearedCsrfCookie(): string {
  return (
    `${CSRF_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0` +
    `${getCookieDomain()}${secureSuffix()}`
  );
}

export function readCsrfFromRequest(request: Request): {
  headerToken: string;
  cookieToken: string;
} {
  const headerToken = request.headers.get("x-csrf-token") || "";
  const cookieHeader = request.headers.get("cookie") || "";
  let cookieToken = "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      cookieToken = decodeURIComponent(rest.join("=").trim());
      break;
    }
  }
  return { headerToken, cookieToken };
}

/**
 * Validate CSRF double-submit for endpoints that authenticate via cookie.
 *
 * Rules:
 *  - If authentication came from Authorization: Bearer header (not cookie),
 *    CSRF is NOT required (the header is a same-origin policy protected channel
 *    in typical browser clients; non-browser clients manage their own tokens).
 *  - If authentication came from cookie, both x-csrf-token header and
 *    me2u_csrf cookie must match and carry a valid signature within TTL.
 */
export function validateCsrfIfCookieAuth(
  request: Request,
  tokenFromCookie: boolean,
): boolean {
  if (!tokenFromCookie) return true;

  const { headerToken, cookieToken } = readCsrfFromRequest(request);
  if (!headerToken || !cookieToken) return false;

  const headerParsed = verifySignedCsrfToken(headerToken);
  const cookieParsed = verifySignedCsrfToken(cookieToken);
  if (!headerParsed || !cookieParsed) return false;

  const now = Math.floor(Date.now() / 1000);
  if (
    headerParsed.issuedAt < now - CSRF_TTL_SECONDS ||
    cookieParsed.issuedAt < now - CSRF_TTL_SECONDS
  ) {
    return false;
  }

  // Tokens must be identical (same nonce + same issuedAt + same sig).
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True iff the active token was read from cookie (not Bearer header). */
export function isTokenFromCookie(request: Request): boolean {
  const header = request.headers.get("authorization") || "";
  if (header.replace(/^Bearer\s+/i, "").trim()) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}
