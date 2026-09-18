/**
 * Client-side Railway JWT token storage.
 *
 * HTTP-only cookie is the PRIMARY authentication mechanism (set by
 * `/api/auth/login` via `Set-Cookie`). This localStorage helper exists
 * ONLY as a backward-compatible fallback for consumers that directly
 * inject a Bearer token (e.g. API clients, SSR middleware that can't
 * read cookies from the browser store).
 *
 * `saveToken()` is intentionally a no-op — the server owns token
 * persistence via Set-Cookie to prevent XSS exfiltration.  getToken()
 * still reads localStorage so legacy Bearer-header flows keep working
 * if the app explicitly sets a token for debug/dev use.
 */

export const TOKEN_KEY = "me2u_token";

export function saveToken(_token: string) {
  return;
}

export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function clearToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function hasToken(): boolean {
  return Boolean(getToken());
}
