#!/usr/bin/env pwsh
# Run Railway PostgreSQL Migration for Me2U Viral Referral System

Write-Host "🚀 Me2U Database Migration Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if railway CLI is installed
if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "Install: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Railway CLI found" -ForegroundColor Green

# Check if migration file exists
$migrationFile = "migrations/migrations/20260916100000_enhanced_viral_referral_system.sql"
if (!(Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Migration file found" -ForegroundColor Green
Write-Host ""

# Show what will be created
Write-Host "📋 This migration will create:" -ForegroundColor Yellow
Write-Host "  • account_unlock_payments table"
Write-Host "  • referral_challenges table"
Write-Host "  • referral_milestones table"
Write-Host "  • referral_leaderboard table"
Write-Host "  • share_template_usage table"
Write-Host "  • Add columns to profiles table:"
Write-Host "    - account_unlocked (boolean)"
Write-Host "    - account_unlock_paid_at (timestamp)"
Write-Host "    - verified_referral_count (integer)"
Write-Host "    - weekly_referral_count (integer)"
Write-Host "    - last_referral_week (timestamp)"
Write-Host "  • Triggers for automatic referral tracking"
Write-Host "  • Functions for milestone rewards"
Write-Host ""

# Confirm before running
$confirm = Read-Host "Continue with migration? (yes/no)"
if ($confirm -ne "yes" -and $confirm -ne "y") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Running migration..." -ForegroundColor Cyan

# Run migration
try {
    railway run psql -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Your viral referral system is now active!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Features enabled:" -ForegroundColor Yellow
        Write-Host "  ✓ ₦1,500 signup bonus (referee)"
        Write-Host "  ✓ ₦500 total referrer bonus (₦250+₦250)"
        Write-Host "  ✓ Weekly challenge (3 refs = ₦4,500)"
        Write-Host "  ✓ Milestone rewards (10/25/50/100 refs)"
        Write-Host "  ✓ Monthly leaderboard (₦165K prizes)"
        Write-Host "  ✓ Withdrawal lock (10 refs OR ₦2,000)"
        Write-Host "  ✓ Share tracking system"
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Deploy your app: railway up"
        Write-Host "  2. Test referral signup"
        Write-Host "  3. Check bonuses in wallet"
        Write-Host "  4. Try account unlock flow"
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host "Check errors above for details" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}
