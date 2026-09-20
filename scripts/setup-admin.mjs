#!/usr/bin/env node

// Setup admin account for Me2U
// Creates admin user in Railway PostgreSQL database

import { execSync } from 'node:child_process';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Admin credentials
const ADMIN_EMAIL = 'stechnoology309@gmail.com';
const ADMIN_PASSWORD = 'qwerT1*y34';
const ADMIN_FIRST_NAME = 'System';
const ADMIN_LAST_NAME = 'Administrator';

// Get DATABASE_URL from Railway CLI
// The output format is a boxed table where values can span multiple lines
// Example:
// ║ DATABASE_URL  │ postgresql://           ║
// ║               │ user:pass@host:port/db  ║
// ║───────────────┼────────────────────────╣
function getDatabaseUrl(railwayOutput) {
  const output = railwayOutput;
  const lines = output.split('\n');
  
  let capture = false;
  let parts = [];
  
  for (const line of lines) {
    // Detect start of DATABASE_URL row
    if (line.includes('║ DATABASE_URL')) {
      capture = true;
      // Extract value after the first │
      const idx = line.indexOf('│');
      if (idx !== -1) {
        const val = line.slice(idx + 1).trim();
        // Remove trailing ║ and whitespace
        const clean = val.replace(/║/g, '').trim();
        if (clean) parts.push(clean);
      }
      continue;
    }
    
    if (capture) {
      // Stop at separator or end of box
      if (line.startsWith('╚') || line.startsWith('║─')) {
        break;
      }
      
      // Check if this is a continuation line (starts with space and has │)
      if (line.includes('│')) {
        const idx = line.indexOf('│');
        const val = line.slice(idx + 1).trim();
        const clean = val.replace(/║/g, '').trim();
        if (clean) {
          // Check if this looks like a new variable (has uppercase name before │)
          const beforePipe = line.slice(0, idx).trim();
          if (/^[A-Z_]+$/.test(beforePipe) && beforePipe !== '') {
            // This is a new variable, stop capturing
            break;
          }
          parts.push(clean);
        }
      }
    }
  }
  
  if (parts.length === 0) {
    throw new Error('Could not extract DATABASE_URL from Railway CLI output');
  }
  
  let dbUrl = parts.join('');
  
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error('Invalid DATABASE_URL format: ' + dbUrl.substring(0, 50));
  }
  
  // If the internal hostname doesn't work, try replacing with public URL
  // Railway provides postgres.railway.internal for internal, 
  // and postgres-production-xxx.up.railway.app for external access
  if (dbUrl.includes('postgres.railway.internal')) {
    // Get public hostname from RAILWAY_SERVICE_POSTGRES_URL
    const publicHost = getPublicPostgresHost(output);
    if (publicHost) {
      dbUrl = dbUrl.replace('postgres.railway.internal', publicHost);
      console.log('Using public PostgreSQL host:', publicHost);
    }
  }
  
  return dbUrl;
}

function getPublicPostgresHost(railwayOutput) {
  const lines = railwayOutput.split('\n');
  let capture = false;
  let hostParts = [];
  
  for (const line of lines) {
    if (line.includes('║ RAILWAY_SERVICE_POSTGRES_URL')) {
      capture = true;
      const idx = line.indexOf('│');
      if (idx !== -1) {
        const val = line.slice(idx + 1).trim();
        const clean = val.replace(/║/g, '').trim();
        if (clean) hostParts.push(clean);
      }
      continue;
    }
    
    if (capture) {
      if (line.startsWith('╚') || line.startsWith('║─')) break;
      if (line.includes('│')) {
        const idx = line.indexOf('│');
        const val = line.slice(idx + 1).trim();
        const clean = val.replace(/║/g, '').trim();
        if (clean) {
          const beforePipe = line.slice(0, idx).trim();
          if (/^[A-Z_]+$/.test(beforePipe) && beforePipe !== '') break;
          hostParts.push(clean);
        }
      }
    }
  }
  
  // This is just the hostname (e.g., postgres-production-742b2.up.railway.app)
  return hostParts.join('');
}

async function setupAdmin() {
  console.log('🔐 Setting up admin account...');
  console.log('   Email:', ADMIN_EMAIL);

  // DATABASE_URL should be set by 'railway run' or available in env
  // Priority: env var > file > Railway CLI
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    try {
      const { readFileSync } = await import('node:fs');
      databaseUrl = readFileSync('db_url.txt', 'utf8').trim();
      console.log('   Loaded DATABASE_URL from db_url.txt');
    } catch (e) {
      console.log('   Fetching DATABASE_URL from Railway CLI...');
      const railwayOutput = execSync('railway variable list --environment production', { encoding: 'utf8', timeout: 60000 });
      databaseUrl = getDatabaseUrl(railwayOutput);
    }
  } else {
    console.log('   Loaded DATABASE_URL from environment (railway run)');
  }

  console.log('   Database URL:', databaseUrl.substring(0, 60) + '...');
  console.log('   Database: Connected via Railway');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000
  });
  
  try {
    // Check if admin already exists
    const existing = await pool.query(
      `SELECT a.id, a.email, p.role
         FROM auth_users a
         JOIN profiles p ON p.id = a.id
        WHERE a.email = $1`,
      [ADMIN_EMAIL.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      console.log('\n⚠️  Admin account already exists:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      
      if (user.role !== 'admin') {
        // Update role to admin
        await pool.query(
          'UPDATE profiles SET role = $1 WHERE id = $2',
          ['admin', user.id]
        );
        console.log('\n✅ Updated role to admin');
      } else {
        console.log('\n✅ Admin account already configured');
      }
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    console.log('   Password: Hashed (bcrypt)');
    
    // Create admin user in transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Create auth_users entry
      const authResult = await client.query(
        `INSERT INTO auth_users (email, password_hash, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, NULL)
         RETURNING id`,
        [ADMIN_EMAIL.toLowerCase(), passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME]
      );
      const userId = authResult.rows[0].id;
      console.log('   Auth User ID:', userId);
      
      // 2. Create profiles entry with admin role
      await client.query(
        `INSERT INTO profiles (
          id, first_name, last_name, email, phone,
          username, referral_code, referred_by,
          country_code, preferred_currency, preferred_language,
          kyc_verified, trust_score, role,
          registration_deposit_paid, registration_deposit_amount,
          affiliate_earnings, group_lending_enabled,
          password_changed_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          true, 100, 'admin',
          false, 0,
          0, false,
          NOW(),
          NOW(), NOW()
        )`,
        [
          userId, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL.toLowerCase(), null,
          null, null, null,
          'NG', 'NGN', 'en'
        ]
      );
      console.log('   Profile: Created (role=admin)');
      
      // 3. Create wallet entry
      await client.query(
        `INSERT INTO wallets (user_id, balance, locked, updated_at)
         VALUES ($1, 0, 0, NOW())`,
        [userId]
      );
      console.log('   Wallet: Created (balance=0)');
      
      await client.query('COMMIT');
      
      console.log('\n✅ Admin account created successfully!');
      console.log('\n📋 Admin Credentials:');
      console.log('   Email:', ADMIN_EMAIL);
      console.log('   Password:', ADMIN_PASSWORD);
      console.log('   User ID:', userId);
      console.log('   Role: admin');
      console.log('\n🔗 Login URL: https://me2ulend.online/api/auth/login');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('\n❌ Failed to create admin account:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupAdmin();

