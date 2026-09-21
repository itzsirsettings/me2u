#!/usr/bin/env node
/**
 * Audits (default) or repairs historical registration-deposit unlock drift.
 * Usage:
 *   node --env-file=.env scripts/reconcile-registration-deposit-unlocks.mjs
 *   node --env-file=.env scripts/reconcile-registration-deposit-unlocks.mjs --apply
 */
import pg from "pg";

const { Client } = pg;
const apply = process.argv.includes("--apply");
const hasConnectionConfig = Boolean(
  process.env.DATABASE_URL ||
  (process.env.PGHOST && process.env.PGPASSWORD && process.env.PGDATABASE),
);

if (!hasConnectionConfig) {
  console.error("DATABASE_URL or PostgreSQL connection variables are required.");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

const inconsistentWhere = `
  registration_deposit_paid IS TRUE
  AND COALESCE(account_unlocked, FALSE) IS FALSE
`;

try {
  await client.connect();

  const before = await client.query(
    `SELECT COUNT(*)::integer AS count FROM profiles WHERE ${inconsistentWhere}`,
  );
  const affectedBefore = before.rows[0].count;

  let repaired = 0;
  if (apply && affectedBefore > 0) {
    await client.query("BEGIN");
    try {
      const result = await client.query(
        `UPDATE profiles
            SET account_unlocked = TRUE,
                unlock_method = 'registration_deposit',
                account_unlock_paid_at = COALESCE(
                  account_unlock_paid_at,
                  registration_deposit_confirmed_at,
                  NOW()
                ),
                updated_at = NOW()
          WHERE ${inconsistentWhere}`,
      );
      repaired = result.rowCount ?? 0;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  const after = await client.query(
    `SELECT COUNT(*)::integer AS count FROM profiles WHERE ${inconsistentWhere}`,
  );
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "audit",
      affectedBefore,
      repaired,
      remaining: after.rows[0].count,
    }),
  );
} finally {
  await client.end();
}
