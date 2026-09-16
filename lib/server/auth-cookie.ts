/**
 * Shared authenticated-user cookie helpers.
 * Enables httpOnly `me2u_token` cookies alongside the legacy
 * Authorization: Bearer header so XSS cannot read the JWT from JS.
 */

export const AUTH_COOKIE_NAME = "me2u_token";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export function buildAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SEVEN_DAYS_SECONDS}${secure}`;
}

export function buildClearedAuthCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
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

export function withClearedAuthCookie(response: Response): Response {
  response.headers.append("Set-Cookie", buildClearedAuthCookie());
  return response;
}
