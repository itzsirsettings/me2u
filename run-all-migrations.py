#!/usr/bin/env python3
"""
Complete Migration Runner - Executes ALL SQL migrations on Railway PostgreSQL
Usage: railway run python run-all-migrations.py
"""

import os
import sys
import subprocess
from pathlib import Path
from urllib.parse import quote, urlparse, urlunparse

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2 not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "--quiet"])
    import psycopg2

# Railway-native migration files in chronological order
# These use native PostgreSQL tables (no auth.uid, no anon/authenticated roles, no external storage schema, no realtime publications)
MIGRATIONS = [
    '001_add_auth_tables.sql',
    '002_complete_schema.sql',
    '003_private_files.sql',
    '004_update_registration_deposit_to_2000.sql',
    '005_gamification_and_social_proof.sql',
    '006_enhanced_viral_referral_system.sql',
    '007_upgrade_unlock_subscriptions.sql',
    '008_in_app_otp_system.sql',
    '009_add_idempotency_sessions_tables.sql',
    '010_financial_unique_invariants.sql',
    '011_wallet_ledger_and_tx_refs.sql',
    '012_profile_otp_hardening.sql',
    '013_g4_fee_transparency.sql',
    '014_money_path_invariants.sql',
    '015_referral_reward_consolidation.sql',
    '016_badge_check_transactions_fix.sql',
    '017_registration_deposit_unlock_invariant.sql',
    '018_reclassify_legacy_registration_deposits.sql',
    '019_registration_identity_integrity.sql',
    '020_referral_challenge_integrity.sql',
    '021_security_event_session_revocations.sql',
    '022_repair_wallet_ledger_audit_columns.sql',
    '023_registration_deposit_paystack_transfer.sql',
]

def get_connection_params():
    """Get database connection parameters — prefer public Railway endpoint when running locally"""
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print('❌ DATABASE_URL environment variable not set')
        print('Run this script with: railway run python run-all-migrations.py')
        return None

    tunnel_host = os.getenv('MIGRATION_DB_HOST')
    tunnel_port = os.getenv('MIGRATION_DB_PORT')
    if tunnel_host:
        parsed = urlparse(database_url)
        if not parsed.username or not parsed.password or not parsed.path:
            print('❌ DATABASE_URL is missing required connection fields')
            return None
        user = quote(parsed.username, safe='')
        password = quote(parsed.password, safe='')
        port_suffix = f':{int(tunnel_port)}' if tunnel_port else ''
        rebuilt = parsed._replace(netloc=f'{user}:{password}@{tunnel_host}{port_suffix}')
        print('🔐 Using the Railway SSH database tunnel')
        return urlunparse(rebuilt)

    # Railway exposes two hostnames:
    #   - postgres.railway.internal  -> private network (only works inside Railway)
    #   - RAILWAY_SERVICE_POSTGRES_URL -> public hostname (works from local `railway run`)
    # When running locally we must swap to the public host while keeping user/password/db.
    public_host = os.getenv('RAILWAY_SERVICE_POSTGRES_URL') or os.getenv('PGHOST_PUBLIC')
    if public_host and 'postgres.railway.internal' in database_url:
        parsed = urlparse(database_url)
        # Public port on Railway Postgres is usually 5432 (same as internal)
        port = os.getenv('PGPORT', parsed.port or 5432)
        rebuilt = parsed._replace(
            netloc=f"{parsed.username}:{parsed.password}@{public_host}:{port}"
        )
        database_url = urlunparse(rebuilt)
        print(f'🔁 Using public Railway endpoint: postgresql://****@{public_host}:{port}/{parsed.path.lstrip("/")}')

    return database_url

def check_migration_status(cursor):
    """Check if migrations tracking table exists"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'schema_migrations'
        );
    """)
    return cursor.fetchone()[0]

def create_migrations_table(cursor):
    """Create migrations tracking table"""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
            id serial PRIMARY KEY,
            migration_name text NOT NULL UNIQUE,
            applied_at timestamptz NOT NULL DEFAULT NOW()
        );
    """)
    print('✅ Created schema_migrations tracking table\n')

def get_applied_migrations(cursor):
    """Get list of already applied migrations"""
    cursor.execute("SELECT migration_name FROM public.schema_migrations ORDER BY id;")
    return {row[0] for row in cursor.fetchall()}

def main():
    print('🚀 Me2U Complete Database Setup')
    print('=' * 80)
    print()
    
    # Get connection
    conn_params = get_connection_params()
    if not conn_params:
        sys.exit(1)
    
    # Connect to database
    try:
        conn = psycopg2.connect(conn_params)
        conn.set_session(autocommit=False)
        cursor = conn.cursor()
        
        cursor.execute('SELECT version();')
        version = cursor.fetchone()[0]
        print(f'✅ Connected to PostgreSQL')
        print(f'   Version: {version.split()[0]} {version.split()[1]}')
        print()
    except Exception as e:
        print(f'❌ Failed to connect to database: {e}')
        sys.exit(1)
    
    try:
        # Setup migrations tracking
        if not check_migration_status(cursor):
            create_migrations_table(cursor)
            conn.commit()
        
        applied = get_applied_migrations(cursor)
        
        if applied:
            print(f'📊 Found {len(applied)} previously applied migrations')
            print()
        
        # Run migrations - Railway-native set (native PostgreSQL only)
        migrations_dir = Path('railway/migrations')
        total = len(MIGRATIONS)
        skipped = 0
        applied_count = 0
        
        for i, migration_file in enumerate(MIGRATIONS, 1):
            migration_path = migrations_dir / migration_file
            
            # Check if already applied
            if migration_file in applied:
                print(f'⏭️  [{i}/{total}] SKIP: {migration_file} (already applied)')
                skipped += 1
                continue
            
            print(f'📋 [{i}/{total}] Running: {migration_file}')
            
            if not migration_path.exists():
                print(f'   ❌ File not found: {migration_path}')
                conn.rollback()
                sys.exit(1)
            
            # Read migration SQL
            sql = migration_path.read_text(encoding='utf-8')

            # Postgres versions used by Railway don't allow enum labels added
            # inside a transaction to be used until that transaction commits.
            # Add the prerequisite in its own transaction before migration 010
            # updates withdrawal rows to the new status.
            if migration_file == '010_financial_unique_invariants.sql':
                cursor.execute("""
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
                """)
                conn.commit()
            
            try:
                # Execute migration
                cursor.execute(sql)
                
                # Record migration
                cursor.execute(
                    "INSERT INTO public.schema_migrations (migration_name) VALUES (%s);",
                    (migration_file,)
                )
                
                conn.commit()
                print(f'   ✅ Success')
                applied_count += 1
                
            except Exception as e:
                conn.rollback()
                print(f'   ❌ Failed: {e}')
                print(f'\n❌ Migration stopped at: {migration_file}')
                print(f'   Error: {str(e)[:200]}')
                sys.exit(1)
        
        print()
        print('=' * 80)
        print(f'✨ Migration Summary:')
        print(f'   Total migrations: {total}')
        print(f'   Newly applied: {applied_count}')
        print(f'   Skipped (already applied): {skipped}')
        print('=' * 80)
        print()
        
        # Verify final state
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        """)
        table_count = cursor.fetchone()[0]
        
        print(f'📊 Database now has {table_count} tables')
        print()
        print('✅ All migrations completed successfully!')
        print()
        print('Next steps:')
        print('  1. Railway will auto-deploy your app')
        print('  2. Test OTP system: POST /api/auth/send-otp')
        print('  3. Test unlock API: GET /api/account/unlock')
        print('  4. Monitor: railway logs --tail')
        
    except Exception as e:
        conn.rollback()
        print(f'\n❌ Unexpected error: {e}')
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
