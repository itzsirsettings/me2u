/**
 * Client-side auth helpers.
 *
 * Browser auth is cookie-only by default. This helper intentionally refuses to
 * use localStorage unless an explicit development-only override is enabled.
 */

export const TOKEN_KEY = "me2u_token";
export const CSRF_KEY = "me2u_csrf_value";

const legacyTokenFallbackEnabled = () =>
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK === "true";

function readLegacyToken(): string | null {
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || null;
}

function writeLegacyToken(token: string) {
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

function clearLegacyToken() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function saveToken(_token: string) {
  if (legacyTokenFallbackEnabled()) {
    writeLegacyToken(_token);
  }
}

export function saveCsrfHeaderValue(_value: string) {
  if (legacyTokenFallbackEnabled() && typeof localStorage !== "undefined") {
    localStorage.setItem(CSRF_KEY, _value);
  }
}

export function getCsrfHeaderValue(): string | null {
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return null;
  return localStorage.getItem(CSRF_KEY) || null;
}

export function clearCsrfHeaderValue() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(CSRF_KEY);
}

export function getToken(): string | null {
  return readLegacyToken();
}

export function clearToken() {
  clearLegacyToken();
  clearCsrfHeaderValue();
}

export function hasToken(): boolean {
  return Boolean(getToken());
}
