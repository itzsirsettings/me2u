import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const migrations = [
  "001_add_auth_tables.sql",
  "002_complete_schema.sql",
  "003_private_files.sql",
  "004_update_registration_deposit_to_2000.sql",
  "005_gamification_and_social_proof.sql",
  "006_enhanced_viral_referral_system.sql",
  "007_upgrade_unlock_subscriptions.sql",
  "008_in_app_otp_system.sql",
  "009_add_idempotency_sessions_tables.sql",
  "010_financial_unique_invariants.sql",
  "011_wallet_ledger_and_tx_refs.sql",
  "012_profile_otp_hardening.sql",
  "013_g4_fee_transparency.sql",
  "014_money_path_invariants.sql",
  "015_referral_reward_consolidation.sql",
  "016_badge_check_transactions_fix.sql",
  "017_registration_deposit_unlock_invariant.sql",
  "018_reclassify_legacy_registration_deposits.sql",
  "019_registration_identity_integrity.sql",
  "020_referral_challenge_integrity.sql",
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id serial PRIMARY KEY,
      migration_name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);

  const applied = new Set(
    (await client.query("SELECT migration_name FROM public.schema_migrations")).rows.map(
      (row) => row.migration_name,
    ),
  );

  for (const migration of migrations) {
    if (applied.has(migration)) {
      console.log(`SKIP ${migration}`);
      continue;
    }
    console.log(`RUN ${migration}`);
    const sql = await fs.readFile(path.join("railway", "migrations", migration), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO public.schema_migrations (migration_name) VALUES ($1)",
        [migration],
      );
      await client.query("COMMIT");
      console.log(`OK ${migration}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`${migration}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log("All authoritative migrations completed.");
} finally {
  await client.end();
}
