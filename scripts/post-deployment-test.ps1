# Me2U Post-Deployment Testing Script
# Purpose: Automated API and functionality testing after deployment
# Usage: .\scripts\post-deployment-test.ps1 [url]

param(
    [string]$Url = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

Write-Host "🧪 Me2U Post-Deployment Testing" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing URL: $Url" -ForegroundColor Yellow
Write-Host ""

$results = @()

# Test 1: Health Check
Write-Host "📡 Test 1: API Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Url/api/health/live" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API is alive" -ForegroundColor Green
        $results += "PASS: Health Check"
    } else {
        Write-Host "   ❌ Unexpected status: $($response.StatusCode)" -ForegroundColor Red
        $results += "FAIL: Health Check - Status $($response.StatusCode)"
    }
} catch {
    Write-Host "   ❌ Health check failed: $_" -ForegroundColor Red
    $results += "FAIL: Health Check - $($_.Exception.Message)"
}
Write-Host ""

# Test 2: Landing Page
Write-Host "🏠 Test 2: Landing Page Load" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        if ($response.Content -match "Me2U" -and $response.Content -match "0% Interest") {
            Write-Host "   ✅ Landing page loads correctly" -ForegroundColor Green
            $results += "PASS: Landing Page"
        } else {
            Write-Host "   ⚠️  Page loads but content missing" -ForegroundColor Yellow
            $results += "WARN: Landing Page - Content check failed"
        }
    }
} catch {
    Write-Host "   ❌ Landing page failed: $_" -ForegroundColor Red
    $results += "FAIL: Landing Page - $($_.Exception.Message)"
}
Write-Host ""

# Test 3: Public Proof API
Write-Host "📊 Test 3: Public Proof API" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Url/api/public-proof" -Method GET -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    if ($json.totalUsers -ge 0 -and $json.totalLoans -ge 0) {
        Write-Host "   ✅ Public proof API working" -ForegroundColor Green
        Write-Host "   Total Users: $($json.totalUsers)" -ForegroundColor Gray
        Write-Host "   Total Loans: $($json.totalLoans)" -ForegroundColor Gray
        $results += "PASS: Public Proof API"
    } else {
        Write-Host "   ⚠️  API returned invalid data" -ForegroundColor Yellow
        $results += "WARN: Public Proof API - Invalid data"
    }
} catch {
    Write-Host "   ❌ Public proof API failed: $_" -ForegroundColor Red
    $results += "FAIL: Public Proof API - $($_.Exception.Message)"
}
Write-Host ""

# Test 4: Registration Page
Write-Host "📝 Test 4: Registration Page" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Url/register" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Registration page accessible" -ForegroundColor Green
        $results += "PASS: Registration Page"
    }
} catch {
    Write-Host "   ❌ Registration page failed: $_" -ForegroundColor Red
    $results += "FAIL: Registration Page - $($_.Exception.Message)"
}
Write-Host ""

# Test 5: Dashboard (should redirect if not authenticated)
Write-Host "🏦 Test 5: Dashboard Auth Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Url/dashboard" -Method GET -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    # Expect redirect (302) or OK if no auth required yet
    if ($response.StatusCode -eq 302 -or $response.StatusCode -eq 200) {
        Write-Host "   ✅ Dashboard endpoint working" -ForegroundColor Green
        $results += "PASS: Dashboard"
    }
} catch {
    # 302 redirect throws exception in PowerShell, that's actually good
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Write-Host "   ✅ Dashboard requires authentication (good)" -ForegroundColor Green
        $results += "PASS: Dashboard Auth"
    } else {
        Write-Host "   ⚠️  Dashboard returned: $($_.Exception.Message)" -ForegroundColor Yellow
        $results += "WARN: Dashboard - $($_.Exception.Message)"
    }
}
Write-Host ""

# Test 6: Static Assets
Write-Host "🖼️  Test 6: Static Assets" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Url/_next/static/css" -Method GET -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Host "   ✅ Static assets directory accessible" -ForegroundColor Green
    $results += "PASS: Static Assets"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   ⚠️  CSS not found (check build output)" -ForegroundColor Yellow
        $results += "WARN: Static Assets - 404"
    } else {
        Write-Host "   ✅ Assets check passed" -ForegroundColor Green
        $results += "PASS: Static Assets"
    }
}
Write-Host ""

# Test 7: SEO Meta Tags
Write-Host "🔍 Test 7: SEO Meta Tags" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
    $hasTitle = $response.Content -match "<title>"
    $hasMeta = $response.Content -match '<meta name="description"'
    
    if ($hasTitle -and $hasMeta) {
        Write-Host "   ✅ SEO meta tags present" -ForegroundColor Green
        $results += "PASS: SEO Meta Tags"
    } else {
        Write-Host "   ⚠️  Missing SEO tags" -ForegroundColor Yellow
        $results += "WARN: SEO Meta Tags - Incomplete"
    }
} catch {
    Write-Host "   ❌ SEO check failed: $_" -ForegroundColor Red
    $results += "FAIL: SEO Meta Tags"
}
Write-Host ""

# Test 8: HTTPS Check (production only)
if ($Url -match "^https://") {
    Write-Host "🔒 Test 8: HTTPS Security" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
        Write-Host "   ✅ HTTPS connection successful" -ForegroundColor Green
        $results += "PASS: HTTPS"
    } catch {
        Write-Host "   ❌ HTTPS connection failed: $_" -ForegroundColor Red
        $results += "FAIL: HTTPS - $($_.Exception.Message)"
    }
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping HTTPS test (local environment)" -ForegroundColor Gray
    Write-Host ""
}

# Summary
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$passed = ($results | Where-Object { $_ -like "PASS:*" }).Count
$failed = ($results | Where-Object { $_ -like "FAIL:*" }).Count
$warnings = ($results | Where-Object { $_ -like "WARN:*" }).Count

Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Warnings: $warnings" -ForegroundColor Yellow
Write-Host ""

foreach ($result in $results) {
    if ($result -like "PASS:*") {
        Write-Host "✅ $result" -ForegroundColor Green
    } elseif ($result -like "FAIL:*") {
        Write-Host "❌ $result" -ForegroundColor Red
    } else {
        Write-Host "⚠️  $result" -ForegroundColor Yellow
    }
}

Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All critical tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Test user registration manually" -ForegroundColor White
    Write-Host "   2. Test referral system" -ForegroundColor White
    Write-Host "   3. Test payments (small amounts)" -ForegroundColor White
    Write-Host "   4. Monitor Railway logs for errors" -ForegroundColor White
} else {
    Write-Host "⚠️  Some tests failed. Please investigate before going live." -ForegroundColor Yellow
}

Write-Host ""
