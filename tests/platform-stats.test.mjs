import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadStats(row) {
  const exports = {};
  const source = ts.transpileModule(readFileSync("lib/server/platform-stats.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      assert.equal(name, "@/lib/railway/client");
      return { query: async () => ({ rows: row ? [row] : [] }) };
    },
  });
  return exports;
}

const empty = {
  total_borrowed: "0",
  total_repaid: "0",
  successful_loans: "0",
  active_loans: "0",
  active_circles: "0",
  total_users: "0",
  trust_score_avg: null,
};

test("an empty community has no fabricated trust score", async () => {
  const stats = await loadStats(empty).getPlatformStats();
  assert.equal(stats.trustScoreAvg, null);
  assert.equal(stats.totalUsers, 0);
  assert.equal(stats.totalBorrowed, 0);
});

test("a real zero trust score and decimal financial totals survive serialization", async () => {
  const stats = await loadStats({
    ...empty,
    total_borrowed: "12000.50",
    total_users: "2",
    trust_score_avg: "0",
  }).getPlatformStats();
  assert.equal(stats.trustScoreAvg, 0);
  assert.equal(stats.totalBorrowed, 12000.5);
  assert.equal(stats.totalLent, 12000.5);
  assert.equal(stats.totalUsers, 2);
});

test("missing source results fail instead of manufacturing statistics", async () => {
  await assert.rejects(loadStats(null).getPlatformStats(), /no result/);
});
