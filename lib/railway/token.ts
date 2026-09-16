/**
 * Client-side Railway JWT token storage.
 * Replaces Supabase Auth session on the browser side.
 */

export const TOKEN_KEY = "me2u_token";

export function saveToken(token: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
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
