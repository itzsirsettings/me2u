import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { randomUUID } from "node:crypto";

function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    Request,
    Response,
    File,
    FormData,
    Buffer,
    Uint8Array,
    console: { error() {} },
    require(name) {
      if (name === "@/lib/private-images") return images;
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "crypto") return { randomUUID };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports;
}

const images = load("lib/private-images.ts");
const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const fileId = "b96e30ed-dcf8-4faf-b18a-02559d8f8b21";
const imagePath = `${ownerId}/${fileId}-passport-photo.png`;
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function authDependencies(user, query = async () => ({ rows: [] })) {
  return {
    "@/lib/server/auth": {
      requireAuthenticatedUser: async () => ({ user, db: { query } }),
      tooManyRequestsResponse: () => Response.json({ error: "Rate limited" }, { status: 429 }),
    },
    "@/lib/rate-limit": { isRateLimited: async () => false, getClientIp: () => "test-ip" },
    "@/lib/server/logger": { logApiError() {} },
  };
}

test("private image paths preserve the entire hyphenated UUID for owner and admin previews", () => {
  assert.equal(images.privateImageFileId(imagePath), fileId);
  assert.equal(images.privateImageUrl(imagePath), `/api/uploads/file/${fileId}`);
  assert.equal(images.privateImageUrl(`${ownerId}/${fileId}`), `/api/uploads/file/${fileId}`);
  assert.equal(
    images.privateImageUrl("https://legacy.example/image.png"),
    "https://legacy.example/image.png",
  );
  for (const value of [
    null,
    "",
    "javascript:alert(1)",
    `other/${fileId}-x.png`,
    `${ownerId}/------------------------------------`,
    `${imagePath}/extra`,
    `${ownerId}/${fileId}x`,
    `${ownerId}/${fileId}-`,
  ]) {
    assert.equal(images.privateImageUrl(value), null, String(value));
  }
});

test("image validation rejects empty, oversized, executable and spoofed image payloads", () => {
  assert.equal(images.privateImageValidationError({ type: "image/png", size: 1 }), null);
  assert.equal(
    images.privateImageValidationError({ type: "image/webp", size: 5 * 1024 * 1024 }),
    null,
  );
  assert.match(images.privateImageValidationError({ type: "image/png", size: 0 }), /empty/);
  assert.match(
    images.privateImageValidationError({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    /5MB/,
  );
  assert.match(
    images.privateImageValidationError({ type: "image/svg+xml", size: 10 }),
    /JPG, PNG or WebP/,
  );
  assert.equal(images.privateImageContentType(png), "image/png");
  assert.equal(
    images.privateImageContentType(new Uint8Array([255, 216, 255, 1])),
    "image/jpeg",
  );
  assert.equal(
    images.privateImageContentType(new TextEncoder().encode("RIFF1234WEBP")),
    "image/webp",
  );
  assert.equal(
    images.privateImageContentType(new TextEncoder().encode("<svg onload='alert(1)'/>")),
    null,
  );
});

test("upload accepts a validated image and rejects forged MIME before database writes", async () => {
  const writes = [];
  const route = load(
    "app/api/uploads/private-image/route.ts",
    authDependencies({ id: ownerId }, async (...args) => {
      writes.push(args);
      return { rows: [] };
    }),
  );
  const upload = (bytes, type) => {
    const body = new FormData();
    body.set("bucket", "kyc-documents");
    body.set("file", new File([bytes], "my photo.png", { type }));
    return route.POST(
      new Request("http://localhost/api/uploads/private-image", { method: "POST", body }),
    );
  };
  assert.equal((await upload("<html>not an image</html>", "image/png")).status, 400);
  assert.equal(writes.length, 0);
  const response = await upload(png, "image/png");
  assert.equal(response.status, 201);
  assert.ok((await response.json()).path.startsWith(`${ownerId}/`));
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1][1], ownerId);
  assert.equal(writes[0][1][4], "image/png");
});

test("file reads are owner-scoped, allow admins and return safe image headers", async () => {
  for (const [viewer, expected] of [
    [{ id: ownerId, role: "user" }, 200],
    [{ id: otherId, role: "user" }, 404],
    [{ id: otherId, role: "admin" }, 200],
  ]) {
    const route = load(
      "app/api/uploads/file/[id]/route.ts",
      authDependencies(viewer, async (sql, values) => {
        assert.match(sql, /user_id = \$2 OR \$3 = true/);
        assert.equal(values[0], fileId);
        assert.equal(values[1], viewer.id);
        assert.equal(values[2], viewer.role === "admin");
        return {
          rows:
            values[1] === ownerId || values[2]
              ? [
                  {
                    user_id: ownerId,
                    content_type: "image/png",
                    file_name: "photo.png",
                    data: Buffer.from(png),
                    size_bytes: png.length,
                  },
                ]
              : [],
        };
      }),
    );
    const response = await route.GET(new Request("http://localhost/api/uploads/file/x"), {
      params: Promise.resolve({ id: fileId }),
    });
    assert.equal(response.status, expected);
    if (expected === 200) {
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.match(response.headers.get("content-security-policy"), /sandbox/);
    }
  }
});

test("malformed file IDs fail before querying storage", async () => {
  const route = load(
    "app/api/uploads/file/[id]/route.ts",
    authDependencies({ id: ownerId }, () => assert.fail("must not query")),
  );
  const response = await route.GET(new Request("http://localhost/api/uploads/file/x"), {
    params: Promise.resolve({ id: "not-a-uuid" }),
  });
  assert.equal(response.status, 400);
});

test("private file reads reject unauthenticated requests before reading storage", async () => {
  const dependencies = authDependencies({ id: ownerId }, () => assert.fail("must not query"));
  dependencies["@/lib/server/auth"].requireAuthenticatedUser = async () => ({
    response: Response.json({ error: "Please log in first." }, { status: 401 }),
  });
  const route = load("app/api/uploads/file/[id]/route.ts", dependencies);
  const response = await route.GET(new Request("http://localhost/api/uploads/file/x"), {
    params: Promise.resolve({ id: fileId }),
  });
  assert.equal(response.status, 401);
});

test("payment proof cannot attach another user's file or an arbitrary URL", async () => {
  for (const [receiptImageUrl, exists, expected] of [
    ["https://external.example/receipt.png", true, 400],
    [`${otherId}/${fileId}-receipt.png`, true, 400],
    [imagePath, false, 400],
    [imagePath, true, 200],
  ]) {
    let writes = 0;
    const dependencies = authDependencies(
      { id: ownerId, registrationDepositPaid: false },
      async (sql, values) => {
        if (sql.includes("SELECT id FROM private_files")) {
          assert.match(sql, /user_id = \$2 AND bucket = 'receipts'/);
          assert.equal(values[0], fileId);
          assert.equal(values[1], ownerId);
          return { rows: exists ? [{ id: fileId }] : [] };
        }
        assert.match(sql, /INSERT INTO payment_proofs/);
        writes += 1;
        return { rows: [] };
      },
    );
    dependencies["@/lib/server/platform-account"] = { getPlatformAccountDetails: () => ({}) };
    dependencies["@/lib/server/auth"].errorResponse = () =>
      Response.json({ error: "Request failed." }, { status: 400 });
    const route = load("app/api/onboarding/registration-deposit/route.ts", dependencies);
    const response = await route.POST(
      new Request("http://localhost/api/onboarding/registration-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: "test-reference", receiptImageUrl }),
      }),
    );
    assert.equal(response.status, expected);
    assert.equal(writes, expected === 200 ? 1 : 0);
  }
});

test("KYC requires a real, owned KYC document and a confirmed registration payment", async () => {
  for (const [paid, documentExists, expected] of [
    [false, true, 403],
    [true, false, 400],
    [true, true, 200],
  ]) {
    let updates = 0;
    const route = load(
      "app/api/onboarding/kyc/route.ts",
      authDependencies({ id: ownerId, registrationDepositPaid: paid }, async (sql, values) => {
        if (sql.includes("SELECT id FROM private_files")) {
          assert.match(sql, /user_id = \$2 AND bucket = 'kyc-documents'/);
          assert.equal(values[0], fileId);
          assert.equal(values[1], ownerId);
          return { rows: documentExists ? [{ id: fileId }] : [] };
        }
        assert.match(sql, /UPDATE profiles/);
        updates += 1;
        return { rows: [], rowCount: 1 };
      }),
    );
    const response = await route.POST(
      new Request("http://localhost/api/onboarding/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: "Test Bank",
          accountNumber: "0123456789",
          passportPhotoUrl: imagePath,
        }),
      }),
    );
    assert.equal(response.status, expected);
    assert.equal(updates, expected === 200 ? 1 : 0);
  }
});
