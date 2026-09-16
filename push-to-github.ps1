# Push to GitHub Script
# Run this after creating your GitHub repository

# STEP 1: Update this with your GitHub username and repository name
$GITHUB_USERNAME = "YOUR_GITHUB_USERNAME"  # Replace with your username
$REPO_NAME = "me2u"

# Construct the repository URL
$GITHUB_REPO = "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

Write-Host "`n=== Me2U GitHub Push Script ===" -ForegroundColor Cyan
Write-Host "`nBefore running this script:" -ForegroundColor Yellow
Write-Host "1. Go to https://github.com/new" -ForegroundColor Yellow
Write-Host "2. Create a repository named: $REPO_NAME" -ForegroundColor Yellow
Write-Host "3. DO NOT initialize with README, .gitignore, or license" -ForegroundColor Yellow
Write-Host "4. Update GITHUB_USERNAME in this script (line 4)" -ForegroundColor Yellow
Write-Host "`nPress any key to continue or Ctrl+C to cancel..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

try {
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        throw "Not in me2u directory! Please run this from d:\me2u"
    }

    Write-Host "`nStep 1: Checking git status..." -ForegroundColor Cyan
    git status

    Write-Host "`nStep 2: Adding GitHub remote..." -ForegroundColor Cyan
    git remote remove origin 2>$null  # Remove if exists
    git remote add origin $GITHUB_REPO
    
    Write-Host "`nStep 3: Verifying remote..." -ForegroundColor Cyan
    git remote -v

    Write-Host "`nStep 4: Pushing to GitHub (main branch)..." -ForegroundColor Cyan
    git push -u origin main

    Write-Host "`n✅ SUCCESS! Code pushed to GitHub" -ForegroundColor Green
    Write-Host "`nRepository URL: $GITHUB_REPO" -ForegroundColor Cyan
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Visit your repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor White
    Write-Host "2. Deploy to Railway: railway login && railway link && railway up" -ForegroundColor White
    Write-Host "3. Apply database migration: railway run psql < migrations/migrations/20260916100000_enhanced_viral_referral_system.sql" -ForegroundColor White

} catch {
    Write-Host "`n❌ ERROR: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "- Make sure you created the GitHub repository first" -ForegroundColor White
    Write-Host "- Update GITHUB_USERNAME in this script (line 4)" -ForegroundColor White
    Write-Host "- Check your GitHub authentication (PAT or SSH key)" -ForegroundColor White
    exit 1
}
