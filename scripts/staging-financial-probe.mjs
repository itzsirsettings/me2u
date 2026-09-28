#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const STAGING_HOST = "me2u-staging.up.railway.app";
const environmentName = process.env.RAILWAY_ENVIRONMENT_NAME;
const stagingPassword = process.env.STAGING_BASIC_AUTH?.trim();
const authSecret = process.env.AUTH_TOKEN_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const userCount = Math.min(40, Math.max(1, Number(process.env.FINANCIAL_PROBE_USERS) || 30));
const concurrency = Math.min(
  userCount,
  Math.max(1, Number(process.env.FINANCIAL_PROBE_CONCURRENCY) || 10),
);

if (environmentName !== "staging") throw new Error("Financial probe is staging-only.");
if (!stagingPassword || !authSecret || !databaseUrl || !appUrl) {
  throw new Error("Staging auth, database, and app URL variables are required.");
}
if (new URL(appUrl).hostname !== STAGING_HOST) {
  throw new Error(`Financial probe only permits ${STAGING_HOST}.`);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 5_000,
});
const fixtures = Array.from({ length: userCount }, () => {
  const userId = randomUUID();
  const loanId = randomUUID();
  const jwtId = randomUUID();
  const key = `financial-probe:${randomUUID()}`;
  const email = `financial-probe-${userId}@example.invalid`;
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { sub: userId, userId, email, role: "user", jti: jwtId, iat: issuedAt },
    authSecret,
    { expiresIn: "7d", issuer: "me2u", audience: "app.me2u" },
  );
  return { userId, loanId, jwtId, key, email, token };
});
const userIds = fixtures.map(({ userId }) => userId);
const loanIds = fixtures.map(({ loanId }) => loanId);
const keys = fixtures.map(({ key }) => key);
const latencies = [];
const failures = [];
let nextFixture = 0;

async function withFixtureTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await work(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function requestRepayment(fixture, idempotencyKey) {
  const startedAt = performance.now();
  const response = await fetch(`${appUrl}/api/loans/repay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-staging-access": stagingPassword,
      authorization: `Bearer ${fixture.token}`,
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({ loanId: fixture.loanId }),
    signal: globalThis.AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  return {
    status: response.status,
    latencyMs: performance.now() - startedAt,
    body: body.slice(0, 200),
  };
}

async function cleanup() {
  await withFixtureTransaction(async (client) => {
    await client.query(
      "DELETE FROM transactions WHERE loan_id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])",
      [loanIds, userIds],
    );
    await client.query("DELETE FROM wallet_ledger WHERE user_id = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM api_idempotency_cache WHERE key = ANY($1::text[])", [keys]);
    await client.query("DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM loans WHERE id = ANY($1::uuid[])", [loanIds]);
    await client.query("DELETE FROM wallets WHERE user_id = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM profiles WHERE id = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM auth_users WHERE id = ANY($1::uuid[])", [userIds]);
  });
}

try {
  await withFixtureTransaction(async (client) => {
    for (const fixture of fixtures) {
      await client.query(
        `INSERT INTO auth_users (id, email, password_hash, first_name, last_name)
         VALUES ($1, $2, 'probe-only-no-login', 'Load', 'Probe')`,
        [fixture.userId, fixture.email],
      );
      await client.query(
        `INSERT INTO profiles (id, first_name, last_name, email)
         VALUES ($1, 'Load', 'Probe', $2)`,
        [fixture.userId, fixture.email],
      );
      await client.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 100)", [
        fixture.userId,
      ]);
      await client.query(
        `INSERT INTO loans (id, borrower_id, amount, rate, days, due_date, status)
         VALUES ($1, $2, 100, 0, 1, NOW() + INTERVAL '1 day', 'active')`,
        [fixture.loanId, fixture.userId],
      );
      await client.query(
        `INSERT INTO auth_sessions (user_id, jwt_id, user_agent, ip, expires_at)
         VALUES ($1, $2, 'staging-financial-probe', '127.0.0.1', NOW() + INTERVAL '7 days')`,
        [fixture.userId, fixture.jwtId],
      );
    }
  });

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = nextFixture++;
        if (index >= fixtures.length) return;
        const fixture = fixtures[index];
        try {
          const first = await requestRepayment(fixture, fixture.key);
          latencies.push(first.latencyMs);
          if (first.status !== 200) failures.push({ status: first.status, body: first.body });

          const replay = await requestRepayment(fixture, fixture.key);
          if (replay.status !== 200)
            failures.push({ status: replay.status, body: replay.body });
        } catch {
          failures.push("network");
        }
      }
    }),
  );

  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE l.status = 'completed')::int AS completed_loans,
       COUNT(wl.id)::int AS repayment_ledger_entries,
       COUNT(t.id)::int AS repayment_transactions,
       COUNT(*) FILTER (WHERE w.balance = 0)::int AS debited_wallets
     FROM loans l
     JOIN wallets w ON w.user_id = l.borrower_id
     LEFT JOIN wallet_ledger wl
       ON wl.user_id = l.borrower_id AND wl.reference = 'loan-repay:' || l.id::text
     LEFT JOIN transactions t
       ON t.loan_id = l.id AND t.type = 'loan_repayment'
     WHERE l.id = ANY($1::uuid[])`,
    [loanIds],
  );

  latencies.sort((a, b) => a - b);
  const percentile = (p) =>
    latencies[Math.min(latencies.length - 1, Math.ceil(p * latencies.length) - 1)] || 0;
  const result = rows[0];
  const integrityPassed =
    result.completed_loans === userCount &&
    result.repayment_ledger_entries === userCount &&
    result.repayment_transactions === userCount &&
    result.debited_wallets === userCount;

  console.log(
    `Staging financial probe: ${userCount} synthetic repayments; concurrency ${concurrency}`,
  );
  console.log(
    `p50 ${percentile(0.5).toFixed(1)}ms; p95 ${percentile(0.95).toFixed(1)}ms; p99 ${percentile(0.99).toFixed(1)}ms`,
  );
  console.log(
    `Request failures: ${failures.length}; integrity: ${integrityPassed ? "passed" : "failed"}`,
  );
  if (failures.length)
    console.log(`Failure statuses: ${JSON.stringify(failures.slice(0, 10))}`);

  if (failures.length || !integrityPassed) process.exitCode = 1;
} finally {
  try {
    await cleanup();
    console.log("Synthetic staging records cleaned up.");
  } finally {
    await pool.end();
  }
}
