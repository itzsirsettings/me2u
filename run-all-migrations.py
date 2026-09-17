#!/usr/bin/env python3
"""
Complete Migration Runner - Executes ALL SQL migrations on Railway PostgreSQL
Usage: railway run python run-all-migrations.py
"""

import os
import sys
import subprocess
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2 not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "--quiet"])
    import psycopg2

# Railway-adapted migration files in chronological order
# These have ALL Supabase references removed (no auth.uid, anon/authenticated roles, storage schema, supabase_realtime)
MIGRATIONS = [
    '001_add_auth_tables.sql',
    '002_complete_schema.sql',
    '003_private_files.sql',
    '004_update_registration_deposit_to_2000.sql',
    '005_gamification_and_social_proof.sql',
    '006_enhanced_viral_referral_system.sql',
    '007_upgrade_unlock_subscriptions.sql',
    '008_in_app_otp_system.sql',
]

def get_connection_params():
    """Get database connection parameters — prefer public Railway endpoint when running locally"""
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print('❌ DATABASE_URL environment variable not set')
        print('Run this script with: railway run python run-all-migrations.py')
        return None

    # Railway exposes two hostnames:
    #   - postgres.railway.internal  -> private network (only works inside Railway)
    #   - RAILWAY_SERVICE_POSTGRES_URL -> public hostname (works from local `railway run`)
    # When running locally we must swap to the public host while keeping user/password/db.
    public_host = os.getenv('RAILWAY_SERVICE_POSTGRES_URL') or os.getenv('PGHOST_PUBLIC')
    if public_host and 'postgres.railway.internal' in database_url:
        from urllib.parse import urlparse, urlunparse
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
        
        # Run migrations - Railway-adapted set (no Supabase references)
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
