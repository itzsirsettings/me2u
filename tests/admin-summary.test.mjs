import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const { getAdminSummary } = loadSource("lib/server/admin-summary.ts");

test("admin totals use complete source aggregates and serialize numeric values", async () => {
  const summary = await getAdminSummary({
    query: async (sql) => {
      assert.doesNotMatch(sql, /LIMIT/i);
      assert.match(sql, /SUM\(security_deposit\)/);
      assert.match(sql, /FROM transactions WHERE type = 'affiliate_reward'/);
      return { rows: [{ users: "600", income: "12500.50", retained_float: "2500.00" }] };
    },
  });
  assert.deepEqual(summary, { users: 600, income: 12500.5, retained_float: 2500 });
});

test("missing admin aggregates are an error, not fabricated zero balances", async () => {
  await assert.rejects(getAdminSummary({ query: async () => ({ rows: [] }) }), /unavailable/);
});
