# Me2U Visual Testing Checklist Script
# Purpose: Guide through comprehensive responsive testing
# Usage: .\scripts\visual-test.ps1 [url]

param(
    [string]$Url = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

Write-Host "🎨 Me2U Visual Testing Guide" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing URL: $Url" -ForegroundColor Yellow
Write-Host ""

# Function to prompt for test completion
function Test-Section {
    param(
        [string]$TestName,
        [string[]]$CheckPoints
    )
    
    Write-Host "📋 $TestName" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($check in $CheckPoints) {
        Write-Host "   [ ] $check" -ForegroundColor White
    }
    
    Write-Host ""
    $response = Read-Host "   All checks passed? (y/n/skip)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "   ✅ PASSED" -ForegroundColor Green
        return "PASSED"
    } elseif ($response -eq 'skip' -or $response -eq 's') {
        Write-Host "   ⏭️  SKIPPED" -ForegroundColor Yellow
        return "SKIPPED"
    } else {
        Write-Host "   ❌ FAILED" -ForegroundColor Red
        $issue = Read-Host "   Describe the issue"
        return "FAILED: $issue"
    }
}

# Initialize results
$results = @()

Write-Host "🚀 Starting Visual Testing..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Testing Instructions:" -ForegroundColor Yellow
Write-Host "   1. Open the URL in your browser: $Url" -ForegroundColor White
Write-Host "   2. Use browser DevTools to test responsive breakpoints" -ForegroundColor White
Write-Host "   3. Press Ctrl+Shift+M (Chrome/Edge) or Cmd+Option+M (Firefox) for device mode" -ForegroundColor White
Write-Host ""
$ready = Read-Host "Ready to start? (y/n)"

if ($ready -ne 'y' -and $ready -ne 'Y') {
    Write-Host "Testing cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📱 MOBILE TESTING (360px - 480px)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Mobile - Landing Page
$result = Test-Section "Landing Page (Mobile)" @(
    "Hero section fits screen without horizontal scroll",
    "All text is readable without zooming",
    "Trust badges stack vertically",
    "CTA buttons are easily tappable (≥44px)",
    "Navigation menu opens with hamburger icon",
    "Images load and scale properly",
    "No content cutoff or overflow"
)
$results += [PSCustomObject]@{
    Category = "Mobile"
    Test = "Landing Page"
    Result = $result
}
Write-Host ""

# Mobile - Navigation
$result = Test-Section "Navigation (Mobile)" @(
    "Hamburger menu icon visible and clickable",
    "Menu opens smoothly with animation",
    "All nav links accessible",
    "Close button works",
    "Menu overlay covers page properly",
    "Tap targets ≥44px for all links"
)
$results += [PSCustomObject]@{
    Category = "Mobile"
    Test = "Navigation"
    Result = $result
}
Write-Host ""

# Mobile - Forms
$result = Test-Section "Forms (Mobile)" @(
    "Input fields span full width (with padding)",
    "Labels clearly visible above inputs",
    "Error messages display below fields",
    "Submit buttons easy to tap",
    "Keyboard doesn't cover submit button",
    "Phone number input shows numeric keyboard"
)
$results += [PSCustomObject]@{
    Category = "Mobile"
    Test = "Forms"
    Result = $result
}
Write-Host ""

# Mobile - Dashboard
$result = Test-Section "Dashboard (Mobile)" @(
    "Wallet balance card fits screen",
    "Quick actions grid (2 columns max)",
    "Transaction list scrollable",
    "Bottom navigation visible",
    "No horizontal scrolling anywhere",
    "Touch targets properly sized"
)
$results += [PSCustomObject]@{
    Category = "Mobile"
    Test = "Dashboard"
    Result = $result
}
Write-Host ""

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📱 TABLET TESTING (768px - 1024px)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Tablet - Landing Page
$result = Test-Section "Landing Page (Tablet)" @(
    "2-column layouts for features/benefits",
    "Hero section uses ~60% viewport",
    "Images scale appropriately",
    "Trust badges in 2-3 columns",
    "Proper spacing between sections",
    "Footer columns laid out horizontally"
)
$results += [PSCustomObject]@{
    Category = "Tablet"
    Test = "Landing Page"
    Result = $result
}
Write-Host ""

# Tablet - Dashboard
$result = Test-Section "Dashboard (Tablet)" @(
    "Sidebar navigation visible (not hamburger)",
    "Content area uses remaining space",
    "Cards in 2-column grid",
    "Charts/graphs readable",
    "Spacing feels comfortable",
    "No wasted white space"
)
$results += [PSCustomObject]@{
    Category = "Tablet"
    Test = "Dashboard"
    Result = $result
}
Write-Host ""

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💻 DESKTOP TESTING (1024px - 1440px)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Desktop - Landing Page
$result = Test-Section "Landing Page (Desktop)" @(
    "Hero section full viewport height",
    "3-column layouts for features/benefits",
    "Trust badges in single row",
    "All sections use max-width constraint",
    "Content centered on page",
    "Hover effects work on interactive elements",
    "Animations smooth and professional"
)
$results += [PSCustomObject]@{
    Category = "Desktop"
    Test = "Landing Page"
    Result = $result
}
Write-Host ""

# Desktop - Navigation
$result = Test-Section "Navigation (Desktop)" @(
    "Horizontal menu bar",
    "All links visible (no hamburger)",
    "Dropdown menus work on hover",
    "Active page highlighted",
    "Logo links to homepage",
    "CTA button prominent in header"
)
$results += [PSCustomObject]@{
    Category = "Desktop"
    Test = "Navigation"
    Result = $result
}
Write-Host ""

# Desktop - Dashboard
$result = Test-Section "Dashboard (Desktop)" @(
    "Sidebar fixed/sticky on left",
    "3-4 column card grid",
    "Charts/graphs full-featured",
    "Modals centered on screen",
    "Tooltips appear on hover",
    "Data tables fully visible"
)
$results += [PSCustomObject]@{
    Category = "Desktop"
    Test = "Dashboard"
    Result = $result
}
Write-Host ""

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🖥️  LARGE DESKTOP (1440px+)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Large Desktop
$result = Test-Section "Large Screens (1440px+)" @(
    "Content max-width enforced (~1400px)",
    "Content centered horizontally",
    "No excessive white space on sides",
    "Images don't pixelate",
    "Text line-length comfortable (<75 chars)",
    "Hero section scales beautifully",
    "No layout breaking"
)
$results += [PSCustomObject]@{
    Category = "Large Desktop"
    Test = "All Pages"
    Result = $result
}
Write-Host ""

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎯 ACCESSIBILITY TESTING" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Keyboard Navigation
$result = Test-Section "Keyboard Navigation" @(
    "Can navigate entire site with Tab key",
    "Focus indicators clearly visible (green outline)",
    "Skip-to-content link appears on Tab",
    "Modal traps focus correctly",
    "Escape key closes modals/menus",
    "Enter/Space activates buttons",
    "Shift+Tab goes backwards"
)
$results += [PSCustomObject]@{
    Category = "Accessibility"
    Test = "Keyboard Navigation"
    Result = $result
}
Write-Host ""

# Screen Reader
$result = Test-Section "Screen Reader Compatibility" @(
    "ARIA labels present on interactive elements",
    "Form inputs have associated labels",
    "Error messages announced",
    "Loading states announced",
    "Images have alt text",
    "Landmark regions defined (header, main, nav, footer)"
)
$results += [PSCustomObject]@{
    Category = "Accessibility"
    Test = "Screen Reader"
    Result = $result
}
Write-Host ""

# Color Contrast
$result = Test-Section "Color Contrast" @(
    "All text readable (4.5:1 ratio minimum)",
    "Buttons have sufficient contrast",
    "Links distinguishable from text",
    "Form inputs have visible borders",
    "Error states clearly visible",
    "Success states clearly visible"
)
$results += [PSCustomObject]@{
    Category = "Accessibility"
    Test = "Color Contrast"
    Result = $result
}
Write-Host ""

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🌐 CROSS-BROWSER TESTING" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Chrome
$result = Test-Section "Chrome/Chromium" @(
    "Page loads without errors",
    "All features functional",
    "Animations smooth",
    "Forms submit correctly",
    "No console errors"
)
$results += [PSCustomObject]@{
    Category = "Browsers"
    Test = "Chrome"
    Result = $result
}
Write-Host ""

# Firefox
$result = Test-Section "Firefox" @(
    "Page loads without errors",
    "All features functional",
    "Animations smooth",
    "Forms submit correctly",
    "No console errors"
)
$results += [PSCustomObject]@{
    Category = "Browsers"
    Test = "Firefox"
    Result = $result
}
Write-Host ""

# Safari (if available)
Write-Host "⚠️  Safari testing requires macOS/iOS device" -ForegroundColor Yellow
$hasSafari = Read-Host "   Can you test on Safari? (y/n)"

if ($hasSafari -eq 'y' -or $hasSafari -eq 'Y') {
    $result = Test-Section "Safari (macOS/iOS)" @(
        "Page loads without errors",
        "All features functional",
        "Animations smooth",
        "Forms submit correctly",
        "Date pickers work",
        "No console errors"
    )
    $results += [PSCustomObject]@{
        Category = "Browsers"
        Test = "Safari"
        Result = $result
    }
} else {
    $results += [PSCustomObject]@{
        Category = "Browsers"
        Test = "Safari"
        Result = "SKIPPED: No Safari device available"
    }
}
Write-Host ""

# Edge
$result = Test-Section "Microsoft Edge" @(
    "Page loads without errors",
    "All features functional",
    "Animations smooth",
    "Forms submit correctly",
    "No console errors"
)
$results += [PSCustomObject]@{
    Category = "Browsers"
    Test = "Edge"
    Result = $result
}
Write-Host ""

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎨 SPECIFIC UI COMPONENTS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Landing Page Sections
$result = Test-Section "Landing Page Sections" @(
    "Hero: Headline, subtext, CTA visible",
    "HowItWorks: 3 steps with visual connectors",
    "Features: 8 benefit cards with icons",
    "TrustScore: 6 signal cards + 4 credit levels",
    "AdvancedTools: 3 tool cards",
    "CommunityCircles: 5 circle types",
    "PublicProof: Live metrics animating",
    "Comparison: 3-column table readable",
    "FAQ: Accordion expands/collapses",
    "Footer: All links working"
)
$results += [PSCustomObject]@{
    Category = "Components"
    Test = "Landing Sections"
    Result = $result
}
Write-Host ""

# Generate report
Write-Host ""
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$passed = ($results | Where-Object { $_.Result -eq "PASSED" }).Count
$failed = ($results | Where-Object { $_.Result -like "FAILED*" }).Count
$skipped = ($results | Where-Object { $_.Result -like "SKIPPED*" }).Count
$total = $results.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Skipped: $skipped" -ForegroundColor Yellow
Write-Host ""

if ($failed -gt 0) {
    Write-Host "❌ Failed Tests:" -ForegroundColor Red
    Write-Host ""
    $results | Where-Object { $_.Result -like "FAILED*" } | ForEach-Object {
        Write-Host "   $($_.Category) - $($_.Test)" -ForegroundColor Red
        Write-Host "   Issue: $($_.Result)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Save report to file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = "test-reports\visual-test-$timestamp.txt"

if (-not (Test-Path "test-reports")) {
    New-Item -ItemType Directory -Path "test-reports" | Out-Null
}

$report = @"
Me2U Visual Testing Report
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Testing URL: $Url

SUMMARY
=======
Total Tests: $total
Passed: $passed
Failed: $failed
Skipped: $skipped

DETAILED RESULTS
================

"@

foreach ($result in $results) {
    $report += "$($result.Category) - $($result.Test): $($result.Result)`n"
}

$report | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "📄 Report saved to: $reportPath" -ForegroundColor Cyan
Write-Host ""

# Final verdict
if ($failed -eq 0) {
    Write-Host "🎉 All tests passed! Visual testing complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Your Me2U app is visually ready for production!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Please fix issues before deploying." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Review failed tests above and retest after fixes." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Fix any failed tests" -ForegroundColor White
Write-Host "   2. Run performance audit: .\scripts\lighthouse-audit.ps1" -ForegroundColor White
Write-Host "   3. Deploy to production: .\scripts\deploy-railway.ps1" -ForegroundColor White
Write-Host ""
