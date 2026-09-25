# Me2U Railway Deployment Automation Script
# Purpose: Automate Railway deployment with checks and validations
# Usage: .\scripts\deploy-railway.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Me2U Railway Deployment Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Function to prompt user confirmation
function Get-UserConfirmation {
    param($Message)
    $response = Read-Host "$Message (y/n)"
    return $response -eq 'y' -or $response -eq 'Y'
}

# Step 1: Pre-flight checks
Write-Host "📋 Step 1: Pre-flight Checks" -ForegroundColor Yellow
Write-Host ""

# Check Node.js
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check Railway CLI
if (Test-Command "railway") {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI installed: $railwayVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Railway CLI not found." -ForegroundColor Red
    Write-Host "   Install with: npm install -g @railway/cli" -ForegroundColor Yellow
    
    if (Get-UserConfirmation "   Install Railway CLI now?") {
        Write-Host "   Installing Railway CLI..." -ForegroundColor Cyan
        npm install -g @railway/cli
        Write-Host "✅ Railway CLI installed!" -ForegroundColor Green
    } else {
        exit 1
    }
}

Write-Host ""

# Step 2: Code quality checks
Write-Host "🔍 Step 2: Code Quality Checks" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Are you in the project root?" -ForegroundColor Red
    exit 1
}

# Record the exact source that is about to be deployed.
if (-not (Test-Command "git")) {
    Write-Host "❌ Git is required to verify the production source." -ForegroundColor Red
    exit 1
}

$expectedBranch = if ($env:RAILWAY_PRODUCTION_BRANCH) { $env:RAILWAY_PRODUCTION_BRANCH } else { "main" }
$sourceBranch = (git branch --show-current).Trim()
$sourceCommit = (git rev-parse HEAD).Trim()
$workingTree = git status --porcelain

Write-Host "📌 Source branch: $sourceBranch" -ForegroundColor Gray
Write-Host "📌 Source commit: $sourceCommit" -ForegroundColor Gray

if ($sourceBranch -ne $expectedBranch) {
    Write-Host "❌ Refusing deployment from '$sourceBranch'. Expected '$expectedBranch'." -ForegroundColor Red
    Write-Host "   Set RAILWAY_PRODUCTION_BRANCH to override this intentionally." -ForegroundColor Yellow
    exit 1
}

if ($workingTree) {
    Write-Host "❌ Refusing deployment with uncommitted changes:" -ForegroundColor Red
    Write-Host $workingTree -ForegroundColor Yellow
    Write-Host "   Commit the exact release source before deploying." -ForegroundColor Yellow
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# TypeScript check
Write-Host "🔍 Running TypeScript check..." -ForegroundColor Cyan
$tscResult = npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript check passed" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript check failed" -ForegroundColor Red
    if (-not (Get-UserConfirmation "   Continue anyway?")) {
        exit 1
    }
}

# Build check
Write-Host "🏗️  Running production build..." -ForegroundColor Cyan
$buildResult = npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Production build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Production build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Environment configuration check
Write-Host "⚙️  Step 3: Environment Configuration" -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
    
    # Check critical variables
    $envContent = Get-Content .env -Raw
    
    $criticalVars = @(
        "AUTH_TOKEN_SECRET",
        "RESEND_API_KEY",
        "PAYSTACK_SECRET_KEY",
        "VTPASS_API_KEY"
    )
    
    $missingVars = @()
    foreach ($var in $criticalVars) {
        if ($envContent -match "$var=(.+)") {
            $value = $matches[1].Trim()
            if ($value -eq "" -or $value -match "your-.*-key") {
                $missingVars += $var
            }
        } else {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "⚠️  Missing or placeholder values:" -ForegroundColor Yellow
        foreach ($var in $missingVars) {
            Write-Host "   - $var" -ForegroundColor Yellow
        }
        
        if (-not (Get-UserConfirmation "   Continue anyway?")) {
            exit 1
        }
    } else {
        Write-Host "✅ All critical environment variables configured" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    if (-not (Get-UserConfirmation "   Continue anyway?")) {
        exit 1
    }
}

Write-Host ""

# Step 4: Railway authentication
Write-Host "🔐 Step 4: Railway Authentication" -ForegroundColor Yellow
Write-Host ""

# Check if already logged in
$loginCheck = railway whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Already logged in to Railway" -ForegroundColor Green
} else {
    Write-Host "🔐 Please log in to Railway..." -ForegroundColor Cyan
    railway login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Railway login failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Logged in to Railway" -ForegroundColor Green
}

Write-Host ""

# Step 5: Project initialization
Write-Host "🎯 Step 5: Railway Project Setup" -ForegroundColor Yellow
Write-Host ""

# Check if project is already linked
$linkCheck = railway status 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project already linked to Railway" -ForegroundColor Green
    Write-Host $linkCheck -ForegroundColor Gray
} else {
    Write-Host "❌ No Railway project is linked to this workspace." -ForegroundColor Red
    Write-Host "   Link the existing production project with 'railway link', then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 6: Service dependencies
Write-Host "🗄️  Step 6: Service Dependencies" -ForegroundColor Yellow
Write-Host ""

Write-Host "⚠️  Before deploying, ensure these services are provisioned in Railway:" -ForegroundColor Yellow
Write-Host "   1. PostgreSQL database" -ForegroundColor White
Write-Host "   2. Redis database (or use Upstash)" -ForegroundColor White
Write-Host ""
Write-Host "   To add services in Railway Dashboard:" -ForegroundColor Cyan
Write-Host "   - Click 'New' → 'Database' → 'Add PostgreSQL'" -ForegroundColor Cyan
Write-Host "   - Click 'New' → 'Database' → 'Add Redis'" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-UserConfirmation "   Have you provisioned PostgreSQL and Redis?")) {
    Write-Host ""
    Write-Host "📖 Please provision services first:" -ForegroundColor Yellow
    Write-Host "   1. Open Railway Dashboard" -ForegroundColor White
    Write-Host "   2. Add PostgreSQL database" -ForegroundColor White
    Write-Host "   3. Add Redis database (or set up Upstash)" -ForegroundColor White
    Write-Host "   4. Run this script again" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Host "✅ Services confirmed" -ForegroundColor Green
Write-Host ""

# Step 7: Environment variables reminder
Write-Host "📝 Step 7: Environment Variables" -ForegroundColor Yellow
Write-Host ""

Write-Host "⚠️  After deployment, set these variables in Railway Dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Essential Variables:" -ForegroundColor Cyan
Write-Host "   - DATABASE_URL=`${{Postgres.DATABASE_URL}}" -ForegroundColor White
Write-Host "   - REDIS_URL=`${{Redis.REDIS_URL}} (or Upstash URL)" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_APP_URL=<your-railway-url>" -ForegroundColor White
Write-Host ""
Write-Host "   API Keys (copy from .env):" -ForegroundColor Cyan
Write-Host "   - RESEND_API_KEY" -ForegroundColor White
Write-Host "   - PAYSTACK_SECRET_KEY" -ForegroundColor White
Write-Host "   - VTPASS_API_KEY, VTPASS_PUBLIC_KEY, VTPASS_SECRET_KEY" -ForegroundColor White
Write-Host "   - AUTH_TOKEN_SECRET" -ForegroundColor White
Write-Host ""
Write-Host "   See .env.railway.production for complete list" -ForegroundColor Gray
Write-Host ""

if (-not (Get-UserConfirmation "   Ready to deploy?")) {
    Write-Host "   Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Step 8: Deploy
Write-Host "🚀 Step 8: Deploying to Railway" -ForegroundColor Yellow
Write-Host ""

Write-Host "📤 Uploading and deploying..." -ForegroundColor Cyan
railway up

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check Railway logs: railway logs" -ForegroundColor White
    Write-Host "   2. Verify environment variables in Railway Dashboard" -ForegroundColor White
    Write-Host "   3. Ensure PostgreSQL and Redis are running" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""

# Step 9: Get deployment URL
Write-Host "🌐 Step 9: Getting Deployment URL" -ForegroundColor Yellow
Write-Host ""

$domainInfo = railway domain 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment URL:" -ForegroundColor Green
    Write-Host "   $domainInfo" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Could not retrieve domain automatically" -ForegroundColor Yellow
    Write-Host "   Check Railway Dashboard for your deployment URL" -ForegroundColor White
}

Write-Host ""

# Step 10: Post-deployment instructions
Write-Host "📋 Step 10: Post-Deployment Tasks" -ForegroundColor Yellow
Write-Host ""

Write-Host "⚠️  Important next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Configure environment variables in Railway Dashboard" -ForegroundColor White
Write-Host "      - Go to: Variables tab" -ForegroundColor Gray
Write-Host "      - Add all variables from .env" -ForegroundColor Gray
Write-Host "      - Update NEXT_PUBLIC_APP_URL with Railway URL" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Run database migration:" -ForegroundColor White
Write-Host "      railway run psql `$DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Test the deployment:" -ForegroundColor White
Write-Host "      - Open the Railway URL" -ForegroundColor Gray
Write-Host "      - Test user registration" -ForegroundColor Gray
Write-Host "      - Test referral system" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Monitor logs:" -ForegroundColor White
Write-Host "      railway logs --tail" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Deployment Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Next steps documentation:" -ForegroundColor Cyan
Write-Host "   - DEPLOYMENT_CHECKLIST.md (complete testing checklist)" -ForegroundColor White
Write-Host "   - GO_LIVE_NOW.md (production setup guide)" -ForegroundColor White
Write-Host "   - REDIS_SETUP.md (Redis configuration)" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your Me2U app is now deployed!" -ForegroundColor Green
Write-Host ""
