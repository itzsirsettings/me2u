/**
 * Client-side auth helpers.
 *
 * Browser auth is cookie-only by default. This helper intentionally refuses to
 * use localStorage unless an explicit development-only override is enabled.
 */

export const TOKEN_KEY = "me2u_token";
export const CSRF_KEY = "me2u_csrf_value";

let _legacyFallbackWarned = false;

export function resetLegacyFallbackWarnedForTests(): void {
  _legacyFallbackWarned = false;
}

export const legacyTokenFallbackEnabled = () => {
  const enabled =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK === "true";

  if (enabled && !_legacyFallbackWarned) {
    _legacyFallbackWarned = true;
    console.warn(
      "[token] NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK is active. " +
        "localStorage tokens create a second auth channel alongside cookies. " +
        "Disable this before deploying.",
    );
  }
  return enabled;
};

function readLegacyToken(): string | null {
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || null;
}

function writeLegacyToken(token: string) {
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

function clearLegacyToken() {
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return;
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
  if (!legacyTokenFallbackEnabled() || typeof localStorage === "undefined") return;
  localStorage.removeItem(CSRF_KEY);
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
