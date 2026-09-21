import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadRoute(path, query) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    URL,
    Date,
    require(name) {
      if (name === "next/server")
        return {
          NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) },
        };
      if (name === "@/lib/server/auth")
        return {
          requireAuthenticatedUser: async () => ({ user: { id: "member-a" }, db: { query } }),
          errorResponse: (error) => {
            throw error;
          },
        };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports;
}

test("referral earnings return numeric actual wallet credits, including milestone bonuses", async () => {
  const route = loadRoute("app/api/referrals/route.ts", async (sql, params) => {
    assert.equal(params[0], "member-a");
    if (sql.includes("total_earned")) {
      assert.match(sql, /SUM\(amount\) FROM referral_reward_events WHERE recipient_id = \$1/);
      return { rows: [{ total_referrals: 10, total_earned: "11500.00" }] };
    }
    return { rows: [] };
  });
  const result = await route.GET({});
  assert.equal(result.body.stats.total_earned, 11500);
});

test("previous leaderboard SQL binds every supplied parameter without an unused type slot", async () => {
  const route = loadRoute("app/api/referrals/leaderboard/route.ts", async (sql, params) => {
    assert.deepEqual([...new Set(sql.match(/\$\d+/g))].sort(), ["$1", "$2"]);
    assert.equal(params.length, 2);
    assert.equal(params[1], "member-a");
    assert.match(params[0], /^\d{4}-\d{2}-01$/);
    return { rows: [] };
  });
  assert.equal(
    (await route.GET({ url: "https://example.test/api/referrals/leaderboard?period=previous" }))
      .status,
    200,
  );
});

test("leaderboards reject unrecognized periods before querying", async () => {
  const route = loadRoute("app/api/referrals/leaderboard/route.ts", () =>
    assert.fail("Unexpected query"),
  );
  assert.equal(
    (await route.GET({ url: "https://example.test/api/referrals/leaderboard?period=invalid" }))
      .status,
    400,
  );
});
