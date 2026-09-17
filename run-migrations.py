#!/usr/bin/env python3
"""
Migration Runner - Executes SQL migrations on Railway PostgreSQL
Usage: 
  Option 1 (Railway environment): railway run python run-migrations.py
  Option 2 (Local with Railway proxy): python run-migrations.py --proxy
"""

import os
import sys
import subprocess
import time
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2 not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

# Migration files in order
MIGRATIONS = [
    'migrations/migrations/20260916100000_enhanced_viral_referral_system.sql',
    'migrations/migrations/20260916120000_upgrade_unlock_subscriptions.sql',
    'migrations/migrations/20260916130000_in_app_otp_system.sql'
]

def get_connection_params():
    """Get database connection parameters from environment or Railway variables"""
    
    # First try DATABASE_URL
    database_url = os.getenv('DATABASE_URL')
    
    if database_url and 'railway.internal' not in database_url:
        # External URL works directly
        return database_url
    
    # Try individual parameters
    pghost = os.getenv('PGHOST', '')
    if pghost and 'railway.internal' in pghost:
        print('⚠️  Internal Railway hostname detected.')
        print('   This script must run inside Railway environment.')
        print('   Use: railway run python run-migrations.py')
        return None
    
    # Build connection from individual parameters
    if all([os.getenv('PGHOST'), os.getenv('PGPORT'), os.getenv('PGUSER'), 
            os.getenv('PGPASSWORD'), os.getenv('PGDATABASE')]):
        return {
            'host': os.getenv('PGHOST'),
            'port': os.getenv('PGPORT'),
            'user': os.getenv('PGUSER'),
            'password': os.getenv('PGPASSWORD'),
            'database': os.getenv('PGDATABASE')
        }
    
    return database_url

def main():
    print('🚀 Starting Me2U Database Migrations...\n')
    
    # Get connection parameters
    conn_params = get_connection_params()
    
    if not conn_params:
        print('❌ Database connection not available')
        print('\nTo run migrations, use one of these methods:')
        print('  1. railway run python run-migrations.py')
        print('  2. Use Railway web console (see DEPLOY_INSTRUCTIONS.md)')
        sys.exit(1)
    
    # Connect to database
    try:
        if isinstance(conn_params, str):
            conn = psycopg2.connect(conn_params)
        else:
            conn = psycopg2.connect(**conn_params)
        
        conn.set_session(autocommit=False)
        cursor = conn.cursor()
        
        # Test connection
        cursor.execute('SELECT version();')
        version = cursor.fetchone()[0]
        print(f'✅ Connected to database')
        print(f'   PostgreSQL version: {version.split()[0]} {version.split()[1]}\n')
    except Exception as e:
        print(f'❌ Failed to connect to database: {e}')
        print('\nTroubleshooting:')
        print('  - Ensure you\'re running: railway run python run-migrations.py')
        print('  - Or use Railway web console (see DEPLOY_INSTRUCTIONS.md)')
        sys.exit(1)
    
    # Run migrations
    try:
        for i, migration_path in enumerate(MIGRATIONS, 1):
            migration_file = Path(migration_path)
            migration_name = migration_file.name
            
            print(f'📋 Migration {i}/{len(MIGRATIONS)}: {migration_name}')
            
            if not migration_file.exists():
                print(f'   ❌ File not found: {migration_path}')
                sys.exit(1)
            
            # Read migration SQL
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            print(f'   ⏳ Executing...')
            
            try:
                cursor.execute(sql)
                conn.commit()
                print(f'   ✅ Success!\n')
            except Exception as e:
                conn.rollback()
                print(f'   ❌ Failed: {e}')
                raise
        
        print('✨ All migrations completed successfully!\n')
        print('Next steps:')
        print('  1. Verify tables: SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';')
        print('  2. Test OTP system: curl -X POST https://your-app.railway.app/api/auth/send-otp')
        print('  3. Monitor deployment: railway logs --tail')
        
    except Exception as e:
        print(f'\n❌ Migration failed: {e}')
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
