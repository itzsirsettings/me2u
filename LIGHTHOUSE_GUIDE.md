# ⚡ Lighthouse Performance Audit Guide

## Quick Start

### Install Lighthouse
```powershell
npm install -g lighthouse
```

### Run Audit (Local)
```powershell
lighthouse http://localhost:3000 --view
```

### Run Audit (Production)
```powershell
lighthouse https://your-railway-url.up.railway.app --view
```

---

## Production Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Performance | ≥85 | ✅ Yes |
| Accessibility | ≥90 | ✅ Yes |
| Best Practices | ≥90 | ⚠️ Recommended |
| SEO | ≥85 | ⚠️ Recommended |

---

## Core Web Vitals

### LCP (Largest Contentful Paint)
- **Target**: <2.5 seconds
- **What it measures**: Loading performance
- **How to improve**:
  - Optimize images (WebP format)
  - Use Next.js Image component
  - Preload critical resources
  - Remove render-blocking resources

### FID (First Input Delay)
- **Target**: <100ms
- **What it measures**: Interactivity
- **How to improve**:
  - Minimize JavaScript execution
  - Code splitting
  - Remove unused JavaScript
  - Use web workers

### CLS (Cumulative Layout Shift)
- **Target**: <0.1
- **What it measures**: Visual stability
- **How to improve**:
  - Set image dimensions
  - Reserve space for ads/embeds
  - Avoid inserting content above existing content
  - Use CSS transform instead of changing layout properties

---

## Test All Key Pages

```powershell
# Landing page
lighthouse https://your-url.com --view

# Dashboard
lighthouse https://your-url.com/dashboard --view

# Registration
lighthouse https://your-url.com/auth/register --view
```

---

## Generate Full Report

```powershell
lighthouse https://your-url.com `
  --output html,json `
  --output-path ./reports/lighthouse-report `
  --chrome-flags="--headless" `
  --view
```

---

## Online Testing (No Install)

### PageSpeed Insights
- URL: https://pagespeed.web.dev/
- Paste your Railway URL
- Click "Analyze"
- Get mobile + desktop scores

### WebPageTest
- URL: https://www.webpagetest.org/
- Advanced testing with filmstrip
- Multiple locations testing

---

## Quick Fixes for Common Issues

### Performance
- ✅ Enable Next.js Image Optimization
- ✅ Use `next/image` instead of `<img>`
- ✅ Add `loading="lazy"` to images
- ✅ Minimize unused CSS/JS
- ✅ Enable gzip compression on Railway

### Accessibility
- ✅ Add `alt` attributes to all images
- ✅ Use ARIA labels on buttons/links
- ✅ Ensure color contrast ≥4.5:1
- ✅ Make all interactive elements keyboard-accessible
- ✅ Add skip-to-content link

### Best Practices
- ✅ Use HTTPS (automatic on Railway)
- ✅ Fix console errors
- ✅ Use HTTP/2
- ✅ Serve images in modern formats (WebP)
- ✅ Add CSP headers

### SEO
- ✅ Add meta descriptions
- ✅ Use semantic HTML
- ✅ Add Open Graph tags
- ✅ Create sitemap.xml
- ✅ Mobile-responsive design

---

## Automated Testing Script

Use the provided script:
```powershell
.\scripts\lighthouse-audit.ps1 https://your-railway-url.com
```

---

## Continuous Monitoring

### Lighthouse CI
```powershell
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=https://your-url.com
```

### Add to CI/CD
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

---

## Interpreting Scores

### 90-100 (Green)
✅ Excellent - Production ready

### 50-89 (Orange)
⚠️ Needs improvement - Review recommendations

### 0-49 (Red)
❌ Poor - Significant issues need fixing

---

## Next Steps

1. Run Lighthouse on local build
2. Fix critical issues (Performance, Accessibility)
3. Deploy to Railway
4. Run Lighthouse on production URL
5. Verify all targets met
6. Set up continuous monitoring
