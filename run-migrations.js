#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/**
 * Migration Runner - Executes SQL migrations on Railway PostgreSQL
 * Usage: node run-migrations.js
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Get database URL from Railway
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  console.error("Run this script with: railway run node run-migrations.js");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const migrationsDir = path.join(__dirname, "railway", "migrations");
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

async function runMigrations() {
  console.log("🚀 Starting Me2U Database Migrations...\n");

  const client = await pool.connect();

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

    for (let i = 0; i < migrations.length; i++) {
      const migrationName = migrations[i];
      if (applied.has(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName}`);
        continue;
      }

      const migrationPath = path.join(migrationsDir, migrationName);

      console.log(`📋 Migration ${i + 1}/${migrations.length}: ${migrationName}`);

      if (!fs.existsSync(migrationPath)) {
        console.error(`   ❌ File not found: ${migrationPath}`);
        process.exit(1);
      }

      const sql = fs.readFileSync(migrationPath, "utf8");

      console.log(`   ⏳ Executing...`);

      try {
        if (migrationName === "010_financial_unique_invariants.sql") {
          await client.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                  FROM pg_enum
                 WHERE enumlabel = 'cancelled'
                   AND enumtypid = 'public.withdrawal_request_status'::regtype
              ) THEN
                EXECUTE 'ALTER TYPE public.withdrawal_request_status ADD VALUE ''cancelled''';
              END IF;
            END $$;
          `);
        }
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO public.schema_migrations (migration_name) VALUES ($1)",
          [migrationName],
        );
        await client.query("COMMIT");
        console.log(`   ✅ Success!\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`   ❌ Failed: ${error.message}`);
        throw error;
      }
    }

    console.log("✨ All migrations completed successfully!\n");
    console.log("Next steps:");
    console.log(
      "  1. Verify tables: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
    );
    console.log(
      "  2. Test OTP system: curl -X POST https://your-app.railway.app/api/auth/send-otp",
    );
    console.log("  3. Monitor deployment: railway logs --tail");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
