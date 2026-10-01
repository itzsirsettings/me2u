import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

function loadOverview(requireAdminUser) {
  return loadSource("app/api/admin/overview/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/server/auth": { requireAdminUser },
    "@/lib/server/admin-summary": {
      getAdminSummary: async () => ({ users: 1, wallet_liability: 2500 }),
    },
    "@/lib/private-images": { privateImageUrl: () => null },
  });
}

test("admin overview loads wallets without optional timestamp columns", async () => {
  const db = {
    query: async (sql) => {
      if (/FROM wallets w/.test(sql)) {
        // The deployed wallets schema does not have created_at.
        if (/w\.(created_at|updated_at)/.test(sql)) {
          throw new Error("column w.created_at does not exist");
        }
        return { rows: [{ id: "wallet", user_id: "admin", balance: "2500", locked: "0" }] };
      }
      if (/FROM profiles ORDER/.test(sql)) {
        return { rows: [{ id: "admin", first_name: "Admin", role: "admin" }] };
      }
      return { rows: [] };
    },
  };
  const { GET } = loadOverview(async () => ({ db, user: { id: "admin", role: "admin" } }));
  const response = await GET(new Request("http://localhost/api/admin/overview"));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.users[0].wallet_balance, 2500);
  assert.equal(data.users[0].wallet_locked, 0);
  assert.equal(data.summary.wallet_liability, 2500);
});

test("admin overview preserves server-side access denial without querying financial data", async () => {
  const { GET } = loadOverview(async () => ({
    response: Response.json({ error: "Admin access required." }, { status: 403 }),
  }));
  const response = await GET(new Request("http://localhost/api/admin/overview"));
  assert.equal(response.status, 403);
});
