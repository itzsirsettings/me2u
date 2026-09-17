import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function loadSender(env, send) {
  const source = ts.transpileModule(read("lib/server/email.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const logs = [];
  vm.runInNewContext(source, {
    exports,
    process: { env },
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    require(name) {
      assert.equal(name, "resend");
      return {
        Resend: class {
          emails = { send };
        },
      };
    },
  });
  return { ...exports, logs };
}

const env = { RESEND_API_KEY: "test-only-key", EMAIL_FROM: "Me2U <verify@example.test>" };

test("email fails closed without provider configuration", async () => {
  for (const config of [
    {},
    { EMAIL_FROM: env.EMAIL_FROM },
    { RESEND_API_KEY: env.RESEND_API_KEY },
  ]) {
    const sender = loadSender(config, () => assert.fail("must not send"));
    assert.equal((await sender.sendOtpEmail("member@example.test", "123456")).success, false);
    assert.equal((await sender.verifyEmailConfig()).configured, false);
    assert.equal(sender.logs.length, 0);
  }
});

test("email success requires provider message ID", async () => {
  let message;
  const sender = loadSender(env, async (input) => {
    message = input;
    return { data: { id: "test-message" }, error: null };
  });
  assert.equal((await sender.sendOtpEmail("member@example.test", "123456")).success, true);
  assert.equal(message.from, env.EMAIL_FROM);
  assert.equal(message.to[0], "member@example.test");
  assert.match(message.text, /123456/);
  assert.match(message.html, /123456/);
  assert.equal(sender.logs.length, 0);
  assert.equal((await sender.verifyEmailConfig()).connected, false);
});

test("provider rejection, empty responses and network failures never report success or leak errors", async () => {
  for (const send of [
    async () => ({ data: null, error: { message: "sensitive-provider-detail" } }),
    async () => ({ data: {}, error: null }),
    async () => {
      throw new Error("sensitive-provider-detail");
    },
  ]) {
    const sender = loadSender(env, send);
    const result = await sender.sendOtpEmail("member@example.test", "123456");
    assert.equal(result.success, false);
    assert.doesNotMatch(result.error, /sensitive-provider-detail|123456/);
    assert.equal(sender.logs.length, 0);
  }
});

test("invalid recipient or code is not sent", async () => {
  const sender = loadSender(env, () => assert.fail("must not send"));
  assert.equal((await sender.sendOtpEmail("invalid", "123456")).success, false);
  assert.equal((await sender.sendOtpEmail("member@example.test", "<script>")).success, false);
});

test("retired verification endpoints cannot issue or verify codes", () => {
  for (const route of ["send-otp", "verify-otp", "test-email"]) {
    const source = read(`app/api/auth/${route}/route.ts`);
    assert.match(source, /status: 410/);
    assert.doesNotMatch(source, /createOtp|verifyOtp|sendOtpEmail|registrationToken/);
  }
  for (const path of [
    "app/login/page.tsx",
    "app/register/page.tsx",
    "app/api/auth/register/route.ts",
    "app/api/auth/forgot-password/route.ts",
  ]) {
    assert.doesNotMatch(read(path), /loggedToConsole|Check server console/);
  }
});
