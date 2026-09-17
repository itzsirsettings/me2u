#!/usr/bin/env pwsh
# Me2U Production Deployment Script
# Run this after setting up Redis and Railway Postgres

Write-Host "🚀 Me2U Production Deployment" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Railway CLI is installed
Write-Host "Checking Railway CLI..." -ForegroundColor Yellow
try {
    railway --version | Out-Null
    Write-Host "✅ Railway CLI installed`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g @railway/cli`n" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to Railway
Write-Host "Checking Railway login..." -ForegroundColor Yellow
try {
    railway whoami | Out-Null
    Write-Host "✅ Logged in to Railway`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host "Run: railway login`n" -ForegroundColor Yellow
    exit 1
}

# Pre-deployment checklist
Write-Host "📋 Pre-Deployment Checklist:" -ForegroundColor Cyan
Write-Host "============================`n" -ForegroundColor Cyan

$checklist = @(
    "✅ Paystack API keys configured",
    "✅ Resend email API key set",
    "✅ VTpass bills keys configured",
    "✅ Platform bank account details added",
    "⚠️  Redis instance set up (Upstash or Railway)",
    "⚠️  Railway Postgres database provisioned",
    "⚠️  Environment variables copied to Railway"
)

foreach ($item in $checklist) {
    if ($item -like "*⚠️*") {
        Write-Host $item -ForegroundColor Yellow
    } else {
        Write-Host $item -ForegroundColor Green
    }
}

Write-Host "`n"
$confirm = Read-Host "Have you completed all steps marked with ⚠️? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Please complete all setup steps first!" -ForegroundColor Red
    Write-Host "See REDIS_SETUP.md and GO_LIVE_NOW.md for details`n" -ForegroundColor Yellow
    exit 1
}

# Verify critical files exist
Write-Host "`nVerifying project structure..." -ForegroundColor Yellow
$criticalFiles = @(
    "package.json",
    "next.config.ts",
    ".env.railway.production",
    "migrations/migrations/20260916100000_enhanced_viral_referral_system.sql"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🚀 Starting deployment...`n" -ForegroundColor Cyan

# Initialize Railway project if needed
Write-Host "Initializing Railway project..." -ForegroundColor Yellow
railway init

# Deploy to Railway
Write-Host "`n📦 Deploying to Railway..." -ForegroundColor Cyan
Write-Host "This may take 3-5 minutes...`n" -ForegroundColor Yellow
railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check logs with: railway logs`n" -ForegroundColor Yellow
    exit 1
}

# Post-deployment steps
Write-Host "📋 Post-Deployment Steps:`n" -ForegroundColor Cyan

Write-Host "1️⃣  Get your app URL:" -ForegroundColor Yellow
Write-Host "   railway open`n"

Write-Host "2️⃣  Update NEXT_PUBLIC_APP_URL in Railway:" -ForegroundColor Yellow
Write-Host "   - Go to Railway dashboard → Variables"
Write-Host "   - Set NEXT_PUBLIC_APP_URL to your Railway URL"
Write-Host "   - Railway will auto-redeploy`n"

Write-Host "3️⃣  Run database migration:" -ForegroundColor Yellow
Write-Host "   railway run psql `$DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql`n"

Write-Host "4️⃣  Configure Paystack webhook:" -ForegroundColor Yellow
Write-Host "   - Dashboard: https://dashboard.paystack.com/settings/webhooks"
Write-Host "   - Webhook URL: https://your-app.railway.app/api/webhooks/paystack"
Write-Host "   - Events: charge.success, transfer.success`n"

Write-Host "5️⃣  Test your app:" -ForegroundColor Yellow
Write-Host "   - Register new user"
Write-Host "   - Test referral system"
Write-Host "   - Test account unlock payment"
Write-Host "   - Test bills payment (small amount)`n"

Write-Host "✅ Deployment complete! Monitor with:" -ForegroundColor Green
Write-Host "   railway logs --follow`n" -ForegroundColor Cyan

Write-Host "🎉 Your app is LIVE! Go make money! 💰`n" -ForegroundColor Green
