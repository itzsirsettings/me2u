import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const { safeNextPath } = loadSource("lib/navigation.ts");
const { readPositiveAmount } = loadSource("lib/server/validation.ts");

test("login destinations reject external, encoded, and auth-loop URLs", () => {
  for (const path of [
    null,
    "//evil.example",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/login?next=/dashboard",
    "/register/",
    "/%",
    "/\nevil",
  ]) {
    assert.equal(safeNextPath(path), null, String(path));
  }
  assert.equal(safeNextPath("/referrals?panel=qr#invite"), "/referrals?panel=qr#invite");
  assert.equal(safeNextPath("/wallet"), "/wallet");
});

test("currency validation rejects coercion and fractional kobo", () => {
  for (const value of [
    true,
    false,
    null,
    [],
    [500],
    {},
    NaN,
    Infinity,
    -1,
    0,
    0.001,
    1.999,
    "",
    " ",
    "0x10",
    "1e2",
    "2.333",
    10_000_001,
  ]) {
    assert.throws(() => readPositiveAmount(value), undefined, String(value));
  }
  for (const value of [0.01, 1.1, 2000, 10_000_000, "0.01", "2000.50"]) {
    assert.equal(readPositiveAmount(value), Number(value));
  }
});

test("CSRF renewal repairs expired forms while rejecting malformed and future tokens", () => {
  const previous = process.env.AUTH_TOKEN_SECRET;
  process.env.AUTH_TOKEN_SECRET = "test-only-session-token-secret-32-characters";
  try {
    const auth = loadSource("lib/server/auth-cookie.ts");
    const malformed = new Request("https://example.test", {
      headers: { cookie: "me2u_token=%broken; me2u_csrf=%broken" },
    });
    assert.equal(auth.readTokenFromRequest(malformed), "");
    assert.equal(auth.validateCsrfIfCookieAuth(malformed, true), false);
    const response = auth.withFreshCsrfCookie(malformed, new Response());
    assert.ok(response.headers.get("set-cookie").startsWith("me2u_csrf="));
    const token = response.headers.get("x-csrf-token");
    const requestFor = (value) =>
      new Request("https://example.test", {
        method: "POST",
        headers: { cookie: `me2u_csrf=${encodeURIComponent(value)}`, "x-csrf-token": value },
      });
    assert.equal(auth.validateCsrfIfCookieAuth(requestFor(token), true), true);
    assert.equal(
      auth.withFreshCsrfCookie(requestFor(token), new Response()).headers.get("set-cookie"),
      null,
    );
    const now = Math.floor(Date.now() / 1000);
    assert.equal(
      auth.validateCsrfIfCookieAuth(
        requestFor(auth.buildSignedCsrfToken("nonce", now - 21601)),
        true,
      ),
      false,
    );
    assert.equal(
      auth.validateCsrfIfCookieAuth(
        requestFor(auth.buildSignedCsrfToken("nonce", now + 300)),
        true,
      ),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.AUTH_TOKEN_SECRET;
    else process.env.AUTH_TOKEN_SECRET = previous;
  }
});

test("cancelled API requests never reach fetch and custom content types survive", async () => {
  const fetchModule = loadSource("lib/fetch.ts", {
    "@/lib/railway/token": { getToken: () => null },
  });
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(new Headers(init.headers).get("content-type"), "text/plain");
    assert.equal(init.credentials, "include");
    return new Response("ok");
  };
  try {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      fetchModule.authorizedFetch("/api/action", { method: "POST", signal: controller.signal }),
      { name: "AbortError" },
    );
    assert.equal(calls, 0);
    await fetchModule.authorizedFetch("/api/action", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "value",
    });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous;
  }
});
