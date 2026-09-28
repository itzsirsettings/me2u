import assert from "node:assert/strict";
import { test } from "node:test";

import { loadSource } from "./helpers/load-source.mjs";

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });

function loadNativeLogin(overrides = {}) {
  let generated = 0;
  const module = loadSource("app/api/auth/native/login/route.ts", {
    "next/server": { NextResponse: { json: jsonResponse } },
    "@/lib/railway/auth": {
      getUserByEmail: async () => ({
        id: "user-id",
        email: "user@example.com",
        password_hash: "hash",
        role: "user",
        accountLocked: false,
      }),
      verifyPassword: async (password, hash) => password === "pass" && hash === "hash",
      generateToken: async () => {
        generated += 1;
        return { token: "signed-session-token", jti: "jti" };
      },
      ...overrides.auth,
    },
    "@/lib/rate-limit": {
      getClientIp: () => "127.0.0.1",
      isRateLimited: async () => false,
      ...overrides.rateLimit,
    },
    "@/lib/server/logger": { logApiError: () => {} },
    "@/lib/server/auth": {
      tooManyRequestsResponse: () => jsonResponse({ error: "Rate limited." }, { status: 429 }),
    },
    "@/lib/server/idempotency": {
      requestMeta: () => ({ ip: "127.0.0.1", userAgent: "native-test" }),
    },
  });
  return { ...module, generated: () => generated };
}

test("native login returns a no-store seven-day bearer session without setting browser cookies", async () => {
  const route = loadNativeLogin();
  const response = await route.POST(
    new Request("https://example.test/api/auth/native/login", {
      method: "POST",
      body: JSON.stringify({ email: " USER@example.com ", password: "pass" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(await response.json(), {
    accessToken: "signed-session-token",
    tokenType: "Bearer",
    expiresIn: 604800,
  });
  assert.equal(route.generated(), 1);
});

test("native login keeps invalid credentials generic and does not issue a session", async () => {
  const route = loadNativeLogin();
  const response = await route.POST(
    new Request("https://example.test/api/auth/native/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "wrong" }),
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Invalid email or password." });
  assert.equal(route.generated(), 0);
});

test("deletion estimates require an approved positive configured period", () => {
  const deletion = loadSource("lib/server/account-deletion.ts");
  assert.equal(deletion.getAccountDeletionTargetDays(undefined), null);
  assert.equal(deletion.getAccountDeletionTargetDays("0"), null);
  assert.equal(deletion.getAccountDeletionTargetDays("1.5"), null);
  assert.equal(deletion.getAccountDeletionTargetDays("366"), null);
  assert.equal(deletion.getAccountDeletionTargetDays("30"), 30);
  assert.equal(
    deletion.deletionEstimateFrom(new Date("2026-09-28T00:00:00Z"), 30).toISOString(),
    "2026-10-28T00:00:00.000Z",
  );
});

test("deletion request re-verifies the password and persists no password value", async () => {
  const previousDays = process.env.ACCOUNT_DELETION_TARGET_DAYS;
  process.env.ACCOUNT_DELETION_TARGET_DAYS = "30";
  const expectedEstimate = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const queries = [];
  const deletionPolicy = loadSource("lib/server/account-deletion.ts");
  const module = loadSource("app/api/account/deletion/route.ts", {
    "next/server": { NextResponse: { json: jsonResponse } },
    "@/lib/railway/auth": {
      verifyPassword: async (password, hash) => password === "secret" && hash === "hash",
    },
    "@/lib/server/auth": {
      requireAuthenticatedUser: async () => ({
        user: { id: "user-id" },
        db: {
          query: async (sql, values) => {
            queries.push({ sql, values });
            if (sql.includes("SELECT password_hash"))
              return { rows: [{ password_hash: "hash" }] };
            return {
              rows: [
                {
                  id: "request-id",
                  status: "requested",
                  requested_at: "2026-09-28T00:00:00Z",
                  estimated_completion_at: values[1],
                },
              ],
            };
          },
        },
      }),
    },
    "@/lib/server/account-deletion": deletionPolicy,
    "@/lib/server/logger": { logApiError: () => {} },
  });

  try {
    const response = await module.POST(
      new Request("https://example.test/api/account/deletion", {
        method: "POST",
        body: JSON.stringify({ currentPassword: "secret", confirmation: "DELETE" }),
      }),
    );
    assert.equal(response.status, 202);
    const body = await response.json();
    assert.equal(body.request.status, "requested");
    assert.ok(
      Math.abs(Date.parse(body.request.estimatedCompletionAt) - expectedEstimate) < 5000,
    );
    assert.ok(queries.some(({ sql }) => sql.includes("INSERT INTO account_deletion_requests")));
    assert.ok(queries.every(({ values }) => !values.includes("secret")));
  } finally {
    if (previousDays === undefined) delete process.env.ACCOUNT_DELETION_TARGET_DAYS;
    else process.env.ACCOUNT_DELETION_TARGET_DAYS = previousDays;
  }
});

test("deletion request refuses to promise a completion date before policy configuration", async () => {
  const previousDays = process.env.ACCOUNT_DELETION_TARGET_DAYS;
  delete process.env.ACCOUNT_DELETION_TARGET_DAYS;
  let databaseCalls = 0;
  const deletionPolicy = loadSource("lib/server/account-deletion.ts");
  const module = loadSource("app/api/account/deletion/route.ts", {
    "next/server": { NextResponse: { json: jsonResponse } },
    "@/lib/railway/auth": { verifyPassword: async () => true },
    "@/lib/server/auth": {
      requireAuthenticatedUser: async () => ({
        user: { id: "user-id" },
        db: {
          query: async () => {
            databaseCalls += 1;
            return { rows: [] };
          },
        },
      }),
    },
    "@/lib/server/account-deletion": deletionPolicy,
    "@/lib/server/logger": { logApiError: () => {} },
  });

  try {
    const response = await module.POST(
      new Request("https://example.test/api/account/deletion", {
        method: "POST",
        body: JSON.stringify({ currentPassword: "secret", confirmation: "DELETE" }),
      }),
    );
    assert.equal(response.status, 503);
    assert.equal(databaseCalls, 0);
  } finally {
    if (previousDays === undefined) delete process.env.ACCOUNT_DELETION_TARGET_DAYS;
    else process.env.ACCOUNT_DELETION_TARGET_DAYS = previousDays;
  }
});
