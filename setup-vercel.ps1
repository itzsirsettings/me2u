#!/usr/bin/env pwsh
# Me2U Vercel Deployment Helper Script

Write-Host "🚀 Me2U Vercel Deployment Helper" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
        Write-Host "Please install manually: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ Vercel CLI installed" -ForegroundColor Green
} else {
    Write-Host "✓ Vercel CLI found" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Deployment Checklist:" -ForegroundColor Yellow
Write-Host ""

# Check .env file
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
    
    # Check for AUTH_TOKEN_SECRET
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "AUTH_TOKEN_SECRET=\S{32,}") {
        Write-Host "✓ AUTH_TOKEN_SECRET configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  AUTH_TOKEN_SECRET not configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
}

# Check if git repo is initialized
if (Test-Path ".git") {
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git repository not initialized" -ForegroundColor Yellow
    Write-Host "   Run: git init" -ForegroundColor Gray
}

# Check if remote is set
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "✓ Git remote configured: $remote" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git remote not configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📧 Email Configuration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your app uses SMTP for instant email delivery." -ForegroundColor White
Write-Host ""
Write-Host "To use Gmail (recommended):" -ForegroundColor Cyan
Write-Host "1. Enable 2FA: https://myaccount.google.com/security" -ForegroundColor Gray
Write-Host "2. Generate App Password: https://myaccount.google.com/apppasswords" -ForegroundColor Gray
Write-Host "3. Add to Vercel environment variables:" -ForegroundColor Gray
Write-Host "   SMTP_HOST=smtp.gmail.com" -ForegroundColor White
Write-Host "   SMTP_PORT=587" -ForegroundColor White
Write-Host "   SMTP_SECURE=false" -ForegroundColor White
Write-Host "   SMTP_USER=your-email@gmail.com" -ForegroundColor White
Write-Host "   SMTP_PASSWORD=your-16-char-app-password" -ForegroundColor White
Write-Host "   EMAIL_FROM=\""Me2U\"" <your-email@gmail.com>" -ForegroundColor White
Write-Host ""

Write-Host "🔑 Required Environment Variables for Vercel:" -ForegroundColor Yellow
Write-Host ""
Write-Host "CRITICAL (App won't work without these):" -ForegroundColor Red
Write-Host "  • DATABASE_URL (from Railway)" -ForegroundColor White
Write-Host "  • AUTH_TOKEN_SECRET (generate a new random 64-char secret)" -ForegroundColor White
Write-Host "  • SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD" -ForegroundColor White
Write-Host "  • PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY" -ForegroundColor White
Write-Host "  • NEXT_PUBLIC_APP_URL" -ForegroundColor White
Write-Host ""
Write-Host "OPTIONAL:" -ForegroundColor Yellow
Write-Host "  • VTPASS_* (leave empty to disable bills)" -ForegroundColor White
Write-Host "  • OPENAI_API_KEY (leave empty to disable AI)" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Deployment Options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Vercel Dashboard (Recommended)" -ForegroundColor Cyan
Write-Host "  1. Visit: https://vercel.com/new" -ForegroundColor Gray
Write-Host "  2. Import from GitHub: itzsirsettings/me2u" -ForegroundColor Gray
Write-Host "  3. Add environment variables" -ForegroundColor Gray
Write-Host "  4. Deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Vercel CLI" -ForegroundColor Cyan
Write-Host "  1. Run: vercel login" -ForegroundColor Gray
Write-Host "  2. Run: vercel" -ForegroundColor Gray
Write-Host "  3. Follow prompts" -ForegroundColor Gray
Write-Host ""

$deploy = Read-Host "Would you like to deploy now via CLI? (yes/no)"

if ($deploy -eq "yes" -or $deploy -eq "y") {
    Write-Host ""
    Write-Host "🚀 Starting Vercel deployment..." -ForegroundColor Cyan
    Write-Host ""
    
    # Login to Vercel
    Write-Host "Step 1: Login to Vercel..." -ForegroundColor Yellow
    vercel login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Vercel login failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Step 2: Deploying to Vercel..." -ForegroundColor Yellow
    Write-Host "⚠️  You'll need to add environment variables in Vercel dashboard after deployment" -ForegroundColor Yellow
    Write-Host ""
    
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Deployment initiated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Go to Vercel dashboard: https://vercel.com/dashboard" -ForegroundColor Gray
        Write-Host "2. Open your me2u project" -ForegroundColor Gray
        Write-Host "3. Go to Settings → Environment Variables" -ForegroundColor Gray
        Write-Host "4. Add all required variables (see .env.vercel.template)" -ForegroundColor Gray
        Write-Host "5. Redeploy: vercel --prod" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        Write-Host "Check errors above or try deploying via Vercel dashboard" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "📖 Deployment Instructions:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Read: VERCEL_DEPLOYMENT.md (comprehensive guide)" -ForegroundColor Gray
    Write-Host "2. Use: .env.vercel.template (all environment variables)" -ForegroundColor Gray
    Write-Host "3. Deploy via: https://vercel.com/new" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ AUTH_TOKEN_SECRET: generate one locally (do NOT commit or share):" -ForegroundColor Green
    Write-Host "   node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"" -ForegroundColor White
    Write-Host ""
}

Write-Host "📚 Documentation Files:" -ForegroundColor Yellow
Write-Host "  • VERCEL_DEPLOYMENT.md - Full deployment guide" -ForegroundColor Gray
Write-Host "  • .env.vercel.template - Environment variables template" -ForegroundColor Gray
Write-Host "  • API_KEYS_GUIDE.md - How to get API keys" -ForegroundColor Gray
Write-Host ""
Write-Host "Good luck with your deployment! 🚀" -ForegroundColor Cyan
