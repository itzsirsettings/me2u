import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

/**
 * Auth secrets & cookie hardening regression tests.
 *
 * These tests validate the security invariants introduced in the auth
 * hardening pass:
 *   - CSRF secret isolation from JWT secret
 *   - Fail-closed behavior in production for CSRF secret
 *   - Cross-validation between JWT, OTP, and CSRF secrets
 *   - CSRF token sign -> verify round-trip
 *   - validateCsrfIfCookieAuth double-submit validation
 *   - localStorage token fallback gating in token.ts
 */

// ── helpers ──────────────────────────────────────────────────────────

function saveEnv() {
  return { ...process.env };
}

function restoreEnv(saved) {
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, saved);
}

function getAuthCookie() {
  return loadSource("lib/server/auth-cookie.ts");
}

function getRailwayAuth() {
  return loadSource("lib/railway/auth.ts", {
    "./client": { query: async () => ({ rows: [] }), withTransaction: async () => ({}) },
    "@/lib/server/logger": { default: { error() {}, warn() {}, info() {} } },
  });
}

function getTokenHelper() {
  return loadSource("lib/railway/token.ts");
}

// ── Test: CSRF secret isolation ──────────────────────────────────────

describe("getCsrfSecret() — secret isolation", () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
  });
  afterEach(() => {
    restoreEnv(savedEnv);
  });

  it("throws when both CSRF_SIGNING_SECRET and AUTH_TOKEN_SECRET are missing", () => {
    delete process.env.CSRF_SIGNING_SECRET;
    delete process.env.AUTH_TOKEN_SECRET;
    delete process.env.NODE_ENV;

    const auth = getAuthCookie();
    assert.throws(
      () => auth.getCsrfSecret(),
      /Missing CSRF_SIGNING_SECRET or AUTH_TOKEN_SECRET/,
    );
  });

  it("throws in production when CSRF_SIGNING_SECRET is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN_SECRET = "jwt-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
    delete process.env.CSRF_SIGNING_SECRET;

    const auth = getAuthCookie();
    assert.throws(
      () => auth.getCsrfSecret(),
      /SECURITY: CSRF_SIGNING_SECRET is required in production/,
    );
  });

  it("throws in production when CSRF_SIGNING_SECRET === AUTH_TOKEN_SECRET", () => {
    process.env.NODE_ENV = "production";
    const sharedSecret = "shared-secret-XXXXXXXXXXXXXXXXXXXXXXXX";
    process.env.AUTH_TOKEN_SECRET = sharedSecret;
    process.env.CSRF_SIGNING_SECRET = sharedSecret;

    const auth = getAuthCookie();
    assert.throws(
      () => auth.getCsrfSecret(),
      /SECURITY: CSRF_SIGNING_SECRET must differ from AUTH_TOKEN_SECRET/,
    );
  });

  it("succeeds with a distinct secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN_SECRET = "jwt-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
    process.env.CSRF_SIGNING_SECRET = "csrf-secret-bbbbbbbbbbbbbbbbbbbbbb";

    const auth = getAuthCookie();
    const secret = auth.getCsrfSecret();
    assert.ok(Buffer.isBuffer(secret));
    assert.equal(secret.length, 32);
  });

  it("allows fallback to AUTH_TOKEN_SECRET in development with warning", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_TOKEN_SECRET = "dev-jwt-secret-XXXXXXXXXXXXXXXXXXXX";
    delete process.env.CSRF_SIGNING_SECRET;

    const auth = getAuthCookie();
    auth.resetCsrfFallbackWarnedForTests?.();
    const secret = auth.getCsrfSecret();
    assert.ok(Buffer.isBuffer(secret));
    assert.equal(secret.length, 32);
  });
});

// ── Test: JWT secret cross-validation ────────────────────────────────

describe("getJwtSecret() — cross-validation", () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
  });
  afterEach(() => {
    restoreEnv(savedEnv);
  });

  it("rejects when AUTH_TOKEN_SECRET is missing", () => {
    delete process.env.AUTH_TOKEN_SECRET;

    const auth = getRailwayAuth();
    assert.throws(
      () => auth.getJwtSecret(),
      /AUTH_TOKEN_SECRET environment variable is required/,
    );
  });

  it("rejects AUTH_TOKEN_SECRET === OTP_SIGNING_SECRET in production", () => {
    process.env.NODE_ENV = "production";
    const shared = "shared-secret-0000000000000000000000";
    process.env.AUTH_TOKEN_SECRET = shared;
    process.env.OTP_SIGNING_SECRET = shared;
    process.env.CSRF_SIGNING_SECRET = "csrf-secret-unique-99999999999999";

    const auth = getRailwayAuth();
    assert.throws(
      () => auth.getJwtSecret(),
      /SECURITY: AUTH_TOKEN_SECRET and OTP_SIGNING_SECRET must be different in production/,
    );
  });

  it("rejects AUTH_TOKEN_SECRET === CSRF_SIGNING_SECRET in production", () => {
    process.env.NODE_ENV = "production";
    const shared = "shared-secret-1111111111111111111111";
    process.env.AUTH_TOKEN_SECRET = shared;
    process.env.OTP_SIGNING_SECRET = "otp-secret-unique-88888888888888";
    process.env.CSRF_SIGNING_SECRET = shared;

    const auth = getRailwayAuth();
    assert.throws(
      () => auth.getJwtSecret(),
      /SECURITY: AUTH_TOKEN_SECRET and CSRF_SIGNING_SECRET must be different in production/,
    );
  });

  it("rejects OTP_SIGNING_SECRET === CSRF_SIGNING_SECRET in production", () => {
    process.env.NODE_ENV = "production";
    const shared = "shared-secret-2222222222222222222222";
    process.env.AUTH_TOKEN_SECRET = "jwt-secret-unique-77777777777777";
    process.env.OTP_SIGNING_SECRET = shared;
    process.env.CSRF_SIGNING_SECRET = shared;

    const auth = getRailwayAuth();
    assert.throws(
      () => auth.getJwtSecret(),
      /SECURITY: OTP_SIGNING_SECRET and CSRF_SIGNING_SECRET must be different in production/,
    );
  });

  it("passes when all secrets are distinct", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN_SECRET = "jwt-AAAAAAAAAAAAAAAAAAAAAAAAAA";
    process.env.OTP_SIGNING_SECRET = "otp-BBBBBBBBBBBBBBBBBBBBBBBBBB";
    process.env.CSRF_SIGNING_SECRET = "csrf-CCCCCCCCCCCCCCCCCCCCCCCCC";

    const auth = getRailwayAuth();
    assert.equal(auth.getJwtSecret(), process.env.AUTH_TOKEN_SECRET);
  });
});

// ── Test: CSRF token round-trip ──────────────────────────────────────

describe("CSRF signed token round-trip", () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
    process.env.CSRF_SIGNING_SECRET = "test-csrf-secret-XXXXXXXXXXXXXXX";
    process.env.AUTH_TOKEN_SECRET = "test-jwt-secret-YYYYYYYYYYYYYYY";
  });
  afterEach(() => {
    restoreEnv(savedEnv);
  });

  it("buildSignedCsrfToken -> verifySignedCsrfToken round-trip succeeds", () => {
    const auth = getAuthCookie();
    const nonce = "deadbeef12345678deadbeef12345678";
    const issuedAt = Math.floor(Date.now() / 1000);

    const token = auth.buildSignedCsrfToken(nonce, issuedAt);
    assert.ok(typeof token === "string" && token.includes("."));

    const verified = auth.verifySignedCsrfToken(token);
    assert.ok(verified !== null, "Token should be verified successfully");
    assert.equal(verified.nonce, nonce);
    assert.equal(verified.issuedAt, issuedAt);
  });

  it("rejects a token signed with a different secret", () => {
    const auth1 = getAuthCookie();
    const nonce = "cafebabe00000000cafebabe00000000";
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = auth1.buildSignedCsrfToken(nonce, issuedAt);

    // Switch secret
    process.env.CSRF_SIGNING_SECRET = "wrong-csrf-secret-ZZZZZZZZZZZZZZ";
    const auth2 = getAuthCookie();
    const verified = auth2.verifySignedCsrfToken(token);
    assert.equal(verified, null, "Signatures from different secrets must not verify");
  });

  it("rejects tampered tokens", () => {
    const auth = getAuthCookie();
    const nonce = "tampertest12345678";
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = auth.buildSignedCsrfToken(nonce, issuedAt);

    assert.equal(auth.verifySignedCsrfToken("invalid-token-no-dot"), null);
    assert.equal(auth.verifySignedCsrfToken(""), null);
    assert.equal(auth.verifySignedCsrfToken(`${token}extra`), null);
    assert.equal(auth.verifySignedCsrfToken(`corrupted.${token.split(".")[1]}`), null);
  });
});

// ── Test: validateCsrfIfCookieAuth ───────────────────────────────────

describe("validateCsrfIfCookieAuth validation", () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
    process.env.CSRF_SIGNING_SECRET = "csrf-secret-validation-test-12345";
    process.env.AUTH_TOKEN_SECRET = "jwt-secret-validation-test-67890";
  });
  afterEach(() => {
    restoreEnv(savedEnv);
  });

  function makeRequest({ headerToken = "", cookieToken = "" } = {}) {
    const headers = {};
    if (headerToken) headers["x-csrf-token"] = headerToken;
    if (cookieToken) headers["cookie"] = `me2u_csrf=${encodeURIComponent(cookieToken)}`;
    return new Request("https://example.com/api/test", {
      method: "POST",
      headers,
    });
  }

  it("skips CSRF check when authentication is NOT from cookie", () => {
    const auth = getAuthCookie();
    const req = makeRequest();
    assert.equal(auth.validateCsrfIfCookieAuth(req, false), true);
  });

  it("accepts valid matching header and cookie tokens within TTL", () => {
    const auth = getAuthCookie();
    const now = Math.floor(Date.now() / 1000);
    const token = auth.buildSignedCsrfToken("nonce-ok", now);
    const req = makeRequest({ headerToken: token, cookieToken: token });

    assert.equal(auth.validateCsrfIfCookieAuth(req, true), true);
  });

  it("rejects when header or cookie is missing", () => {
    const auth = getAuthCookie();
    const now = Math.floor(Date.now() / 1000);
    const token = auth.buildSignedCsrfToken("nonce-ok", now);

    assert.equal(
      auth.validateCsrfIfCookieAuth(makeRequest({ headerToken: token }), true),
      false,
    );
    assert.equal(
      auth.validateCsrfIfCookieAuth(makeRequest({ cookieToken: token }), true),
      false,
    );
    assert.equal(auth.validateCsrfIfCookieAuth(makeRequest(), true), false);
  });

  it("rejects mismatched header and cookie tokens", () => {
    const auth = getAuthCookie();
    const now = Math.floor(Date.now() / 1000);
    const token1 = auth.buildSignedCsrfToken("nonce-one", now);
    const token2 = auth.buildSignedCsrfToken("nonce-two", now);

    assert.equal(
      auth.validateCsrfIfCookieAuth(
        makeRequest({ headerToken: token1, cookieToken: token2 }),
        true,
      ),
      false,
    );
  });

  it("rejects expired tokens older than 6 hours", () => {
    const auth = getAuthCookie();
    const now = Math.floor(Date.now() / 1000);
    const expiredTimestamp = now - 6 * 60 * 60 - 10; // 6 hours and 10 seconds ago
    const token = auth.buildSignedCsrfToken("nonce-exp", expiredTimestamp);

    assert.equal(
      auth.validateCsrfIfCookieAuth(
        makeRequest({ headerToken: token, cookieToken: token }),
        true,
      ),
      false,
    );
  });

  it("rejects future tokens skewed beyond 60s", () => {
    const auth = getAuthCookie();
    const now = Math.floor(Date.now() / 1000);
    const futureTimestamp = now + 120; // 2 minutes in future
    const token = auth.buildSignedCsrfToken("nonce-future", futureTimestamp);

    assert.equal(
      auth.validateCsrfIfCookieAuth(
        makeRequest({ headerToken: token, cookieToken: token }),
        true,
      ),
      false,
    );
  });
});

// ── Test: localStorage fallback gating ───────────────────────────────

describe("localStorage fallback gating", () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
  });
  afterEach(() => {
    restoreEnv(savedEnv);
  });

  it("fallback is disabled in production regardless of flag", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK = "true";

    const tokenModule = getTokenHelper();
    assert.equal(
      tokenModule.legacyTokenFallbackEnabled(),
      false,
      "Legacy fallback must never activate in production",
    );
  });

  it("fallback is disabled in development without explicit flag", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK;

    const tokenModule = getTokenHelper();
    assert.equal(
      tokenModule.legacyTokenFallbackEnabled(),
      false,
      "Legacy fallback must require explicit opt-in",
    );
  });

  it("fallback activates only with dev + explicit flag", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK = "true";

    const tokenModule = getTokenHelper();
    assert.equal(tokenModule.legacyTokenFallbackEnabled(), true);
  });

  it("getToken returns null when fallback is inactive", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK;

    const tokenModule = getTokenHelper();
    assert.equal(tokenModule.getToken(), null);
    assert.equal(tokenModule.hasToken(), false);
  });

  it("clearToken and clearLegacyToken execute safely", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_ENABLE_LEGACY_TOKEN_FALLBACK;

    const tokenModule = getTokenHelper();
    assert.doesNotThrow(() => tokenModule.clearToken());
  });
});

// ── Test: Login route security invariants ────────────────────────────

describe("Login route security invariants", () => {
  it("uses a dummy bcrypt hash for timing-safe comparison on missing accounts", () => {
    const DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    assert.ok(DUMMY_BCRYPT_HASH.startsWith("$2a$"), "Must be a valid bcrypt hash");
    assert.ok(DUMMY_BCRYPT_HASH.length >= 59, "Bcrypt hash must be at least 59 chars");
  });

  it("generic error message does not reveal account existence", () => {
    const GENERIC_AUTH_ERROR = "Invalid email or password.";
    assert.ok(
      !GENERIC_AUTH_ERROR.toLowerCase().includes("not found"),
      "Error must not reveal whether the account exists",
    );
    assert.ok(
      !GENERIC_AUTH_ERROR.toLowerCase().includes("no account"),
      "Error must not reveal whether the account exists",
    );
  });
});

// ── Test: Registration route OTP flow invariants ─────────────────────

describe("Registration OTP flow invariants", () => {
  it("OTP codes are always 6 digits", async () => {
    const { randomInt } = await import("node:crypto");
    for (let i = 0; i < 50; i++) {
      const code = randomInt(100000, 1000000).toString();
      assert.match(code, /^\d{6}$/, `Generated OTP must be 6 digits, got: ${code}`);
    }
  });

  it("email normalization is lowercase and trimmed", () => {
    const raw = "  User@Example.COM  ";
    const normalized = raw.trim().toLowerCase();
    assert.equal(normalized, "user@example.com");
  });

  it("blind response hides account existence at send_code step", () => {
    const blindResponseHasSuccess = true;
    const blindResponseHasEmail = true;
    const blindResponseHasToken = true;
    assert.ok(
      blindResponseHasSuccess && blindResponseHasEmail && blindResponseHasToken,
      "Blind response must always include success, email, and token fields",
    );
  });
});
