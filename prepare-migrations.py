#!/usr/bin/env python3
"""
Prepare migrations for Railway web console
Reads all migration files and displays instructions
"""

from pathlib import Path

MIGRATIONS = [
    ('Migration 1: Enhanced Referral System',
     'migrations/migrations/20260916100000_enhanced_viral_referral_system.sql'),
    ('Migration 2: 15-Day Unlock + Subscriptions',
     'migrations/migrations/20260916120000_upgrade_unlock_subscriptions.sql'),
    ('Migration 3: In-App OTP System',
     'migrations/migrations/20260916130000_in_app_otp_system.sql'),
]

def main():
    print('=' * 80)
    print('Me2U Database Migrations - Ready to Deploy')
    print('=' * 80)
    print()
    print('📍 Railway Project: https://railway.app/project/c2ac2e8b-c3a9-4c67-9547-b458b0272d2e')
    print('📍 Steps: Postgres service → Data tab → Query button')
    print()
    print('='  * 80)
    print()
    
    for i, (title, filepath) in enumerate(MIGRATIONS, 1):
        migration_file = Path(filepath)
        
        print(f'\n{"="  * 80}')
        print(f'{title}')
        print(f'File: {filepath}')
        print('=' * 80)
        
        if not migration_file.exists():
            print(f'❌ ERROR: File not found!')
            continue
        
        # Read and display file size
        sql = migration_file.read_text(encoding='utf-8')
        lines = sql.count('\n') + 1
        size_kb = len(sql) / 1024
        
        print(f'📊 Size: {lines:,} lines ({size_kb:.1f} KB)')
        print()
        print(f'✅ Ready to copy - Open file and copy ALL contents:')
        print(f'   {migration_file.absolute()}')
        print()
        print('Then paste into Railway Query console and click "Run"')
        print()
        
        # Show first few lines as preview
        preview_lines = sql.split('\n')[:10]
        print('📝 Preview (first 10 lines):')
        print('-' * 80)
        for line in preview_lines:
            print(line)
        print('...')
        print('-' * 80)
    
    print()
    print('=' * 80)
    print('Verification Query (run after all migrations):')
    print('=' * 80)
    print()
    print("""SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'otp_codes',
    'subscriptions',
    'feature_entitlements',
    'user_metrics',
    'account_unlock_payments',
    'referral_challenges',
    'referral_milestones',
    'referral_leaderboard'
  )
ORDER BY table_name;""")
    print()
    print('Expected: 8 tables listed')
    print()
    print('=' * 80)
    print('✨ After migrations complete, Railway will auto-deploy your app!')
    print('=' * 80)

if __name__ == '__main__':
    main()
