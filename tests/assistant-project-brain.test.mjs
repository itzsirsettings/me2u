import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("project-brain knowledge covers the whole app surface", () => {
  const knowledge = read("lib/assistant/knowledge.ts");

  for (const rule of [
    "trust-tiers",
    "fees",
    "savings",
    "circles",
    "bills",
    "learn",
    "deals",
    "referrals",
  ]) {
    assert.match(knowledge, new RegExp(`"${rule}"`), `knowledge is missing rule: ${rule}`);
  }

  assert.match(knowledge, /defaultTrustTiers/);
  assert.match(knowledge, /marketplaceBoostFeeAmount/);
  assert.match(knowledge, /withdrawalProcessorFeeRate/);
});

test("session memory stays per-conversation and secret-free", () => {
  const memory = read("lib/assistant/memory.ts");

  assert.match(memory, /extractSessionMemory/);
  assert.match(memory, /formatMemorySummary/);
  // No browser storage, no network calls, and no captured secret values.
  // (Bare /\bpin\b/ would false-positive on the "pin" security-topic keyword.)
  assert.doesNotMatch(memory, /localStorage|indexedDB|fetch\(/);
  assert.doesNotMatch(memory, /\b(password|otp|pin)\b\s*[:=]/i);
});

test("guide actions are navigation-only deep links", () => {
  const actions = read("lib/assistant/guide-actions.ts");

  assert.match(actions, /getGuideActions/);
  assert.match(actions, /\/withdraw/);
  assert.match(actions, /\/kyc/);
  assert.match(actions, /\/loans/);
  assert.match(actions, /\/referrals/);
  // Word boundaries: a bare /PUT/i would match "dispute" in the rules below.
  assert.doesNotMatch(actions, /\bPOST\b|\bPUT\b|\bDELETE\b|\btransfer\b|\bapprove\b/i);
});

test("assistant route wires memory and actions without touching money flows", () => {
  const route = read("app/api/assistant/chat/route.ts");

  assert.match(route, /extractSessionMemory|sessionMemory/);
  assert.match(route, /getGuideActions|guideActions/);
  assert.doesNotMatch(route, /wallet\/withdraw|loans\/request|onboarding\/kyc/);

  assert.ok(
    existsSync(new URL("../lib/assistant/memory.ts", import.meta.url)),
    "memory module must exist",
  );
  assert.ok(
    existsSync(new URL("../lib/assistant/guide-actions.ts", import.meta.url)),
    "guide actions module must exist",
  );
});
