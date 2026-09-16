# Deploy to Railway Script
# Run this after pushing to GitHub

Write-Host "`n=== Me2U Railway Deployment Script ===" -ForegroundColor Cyan

# Check if Railway CLI is installed
Write-Host "`nStep 1: Checking Railway CLI..." -ForegroundColor Cyan
try {
    $railwayVersion = railway --version 2>&1
    Write-Host "✅ Railway CLI installed: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not installed" -ForegroundColor Red
    Write-Host "`nInstalling Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
    Write-Host "✅ Railway CLI installed" -ForegroundColor Green
}

# Login to Railway
Write-Host "`nStep 2: Logging in to Railway..." -ForegroundColor Cyan
Write-Host "This will open your browser for authentication" -ForegroundColor Yellow
railway login

# Link to project or create new one
Write-Host "`nStep 3: Linking to Railway project..." -ForegroundColor Cyan
Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host "1. Link to existing project" -ForegroundColor White
Write-Host "2. Create new project" -ForegroundColor White
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    railway link
} else {
    Write-Host "`nCreating new project..." -ForegroundColor Cyan
    railway init
}

# Deploy
Write-Host "`nStep 4: Deploying to Railway..." -ForegroundColor Cyan
railway up

Write-Host "`n✅ Deployment initiated!" -ForegroundColor Green

# Apply database migration
Write-Host "`nStep 5: Applying database migration..." -ForegroundColor Cyan
Write-Host "This will create the viral referral system tables and triggers" -ForegroundColor Yellow

$applyMigration = Read-Host "Apply database migration now? (y/n)"
if ($applyMigration -eq "y") {
    Write-Host "`nApplying migration..." -ForegroundColor Cyan
    railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
    
    Write-Host "`n✅ Database migration applied!" -ForegroundColor Green
} else {
    Write-Host "`nSkipping migration. Apply it later with:" -ForegroundColor Yellow
    Write-Host "railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql" -ForegroundColor White
}

# Summary
Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "`nYour app should be live at: https://your-app.railway.app" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set environment variables in Railway dashboard" -ForegroundColor White
Write-Host "   - AUTH_TOKEN_SECRET" -ForegroundColor Gray
Write-Host "   - PAYSTACK_SECRET_KEY" -ForegroundColor Gray
Write-Host "   - REDIS_URL (if not auto-provisioned)" -ForegroundColor Gray
Write-Host "2. Set up monthly cron job for leaderboard" -ForegroundColor White
Write-Host "3. Test the referral system:" -ForegroundColor White
Write-Host "   - Register with a referral code → Check ₦1,500 bonus" -ForegroundColor Gray
Write-Host "   - Try to withdraw → See unlock modal" -ForegroundColor Gray
Write-Host "4. Monitor deployment: railway logs" -ForegroundColor White

Write-Host "`n🎉 Your viral referral system is now live!" -ForegroundColor Green
