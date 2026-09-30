import assert from "node:assert/strict";
import test from "node:test";

import { Wallet } from "ethers";

import {
  calculateMarketScenario,
  formatCurrencyMinorUnits,
  formatWalletError,
  isSepoliaChainId,
} from "../lib/me2u-testnet.mjs";

test("USD and NGN test scenarios use user-entered rates and exact decimal arithmetic", () => {
  const sell = calculateMarketScenario({ tokenAmount: "5.25", rate: "1500", side: "sell" });
  const buy = calculateMarketScenario({ tokenAmount: "0.5", rate: "2.25", side: "buy" });

  assert.equal(formatCurrencyMinorUnits(sell.currencyMinorUnits), "7,875.00");
  assert.equal(formatCurrencyMinorUnits(buy.currencyMinorUnits), "1.13");
});

test("test scenario calculator rejects unsafe or invalid amounts", () => {
  for (const tokenAmount of ["0", "-1", "1e6", "1.123456789", "NaN", ""]) {
    assert.throws(
      () => calculateMarketScenario({ tokenAmount, rate: "2", side: "sell" }),
      RangeError,
    );
  }
  assert.throws(
    () => calculateMarketScenario({ tokenAmount: "1", rate: "2", side: "swap" }),
    RangeError,
  );
});

test("Sepolia chain gate accepts only chain ID 11155111", () => {
  assert.equal(isSepoliaChainId(11_155_111), true);
  assert.equal(isSepoliaChainId("11155111"), true);
  assert.equal(isSepoliaChainId("0xaa36a7"), true);
  assert.equal(isSepoliaChainId(1), false);
  assert.equal(isSepoliaChainId(undefined), false);
});

test("in-app wallet keystore can be recovered without storing the phrase in plaintext", async () => {
  const generated = Wallet.createRandom();
  assert.ok(generated.mnemonic?.phrase);

  const encrypted = await generated.encrypt("local test password");
  assert.equal(encrypted.includes(generated.privateKey), false);
  assert.equal(encrypted.includes(generated.mnemonic.phrase), false);

  const restored = await Wallet.fromEncryptedJson(encrypted, "local test password");
  const phraseRestored = Wallet.fromPhrase(generated.mnemonic.phrase);
  assert.equal(restored.address, generated.address);
  assert.equal(phraseRestored.address, generated.address);
  await assert.rejects(Wallet.fromEncryptedJson(encrypted, "incorrect password"));
});

test("wallet error formatting falls back and limits oversized messages", () => {
  assert.equal(
    formatWalletError("not an error", "Wallet action failed."),
    "Wallet action failed.",
  );
  assert.equal(
    formatWalletError(new Error("Network unavailable"), "failed"),
    "Network unavailable",
  );
  assert.equal(formatWalletError(new Error("x".repeat(300)), "failed").length, 240);
});
