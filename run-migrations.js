#!/usr/bin/env node
/**
 * Migration Runner - Executes SQL migrations on Railway PostgreSQL
 * Usage: node run-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database URL from Railway
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  console.error('Run this script with: railway run node run-migrations.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrations = [
  'migrations/migrations/20260916100000_enhanced_viral_referral_system.sql',
  'migrations/migrations/20260916120000_upgrade_unlock_subscriptions.sql',
  'migrations/migrations/20260916130000_in_app_otp_system.sql'
];

async function runMigrations() {
  console.log('🚀 Starting Me2U Database Migrations...\n');
  
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < migrations.length; i++) {
      const migrationPath = path.join(__dirname, migrations[i]);
      const migrationName = path.basename(migrationPath);
      
      console.log(`📋 Migration ${i + 1}/${migrations.length}: ${migrationName}`);
      
      if (!fs.existsSync(migrationPath)) {
        console.error(`   ❌ File not found: ${migrationPath}`);
        process.exit(1);
      }
      
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`   ⏳ Executing...`);
      
      try {
        await client.query(sql);
        console.log(`   ✅ Success!\n`);
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        throw error;
      }
    }
    
    console.log('✨ All migrations completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Verify tables: SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';');
    console.log('  2. Test OTP system: curl -X POST https://your-app.railway.app/api/auth/send-otp');
    console.log('  3. Monitor deployment: railway logs --tail');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
