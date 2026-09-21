import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadClient(failQuery = false) {
  const calls = [];
  let currentUser = null;
  let inTransaction = false;
  const client = {
    async query(sql, parameters) {
      calls.push(sql);
      if (sql === "BEGIN") inTransaction = true;
      else if (sql.startsWith("SELECT set_config")) {
        assert.equal(inTransaction, true, "RLS identity must be set inside its transaction");
        currentUser = parameters[0];
      } else if (sql === "COMMIT" || sql === "ROLLBACK") {
        currentUser = null;
        inTransaction = false;
      } else {
        if (failQuery) throw new Error("query failed");
        return { rows: [{ user_id: currentUser }] };
      }
      return { rows: [] };
    },
    release() {
      assert.equal(currentUser, null, "A pooled connection cannot retain an RLS identity");
      calls.push("release");
    },
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync("lib/railway/client.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    process: { env: { DATABASE_URL: "postgres://test" } },
    console,
    require(name) {
      if (name === "pg")
        return {
          Pool: class {
            on() {}
            async connect() {
              return client;
            }
          },
        };
      if (name === "pg-connection-string") return { parse: () => ({}) };
      if (name === "../server/logger") return { default: { error() {} } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return { exports, calls };
}

test("user-scoped queries retain identity during execution and clear it before pool reuse", async () => {
  const { exports, calls } = loadClient();
  for (const userId of ["member-a", "member-b"]) {
    const result = await exports.queryAsUser(userId, "SELECT user_id FROM wallets", []);
    assert.equal(result.rows[0].user_id, userId);
  }
  assert.deepEqual(
    calls,
    Array(2)
      .fill([
        "BEGIN",
        "SELECT set_config('app.current_user_id', $1, true)",
        "SELECT user_id FROM wallets",
        "COMMIT",
        "release",
      ])
      .flat(),
  );
});

test("failed user queries roll back before releasing their connection", async () => {
  const { exports, calls } = loadClient(true);
  await assert.rejects(exports.queryAsUser("member-a", "SELECT fail"), /query failed/);
  assert.deepEqual(calls.slice(-2), ["ROLLBACK", "release"]);
  assert.equal(calls.includes("COMMIT"), false);
});
