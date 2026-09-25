# 🚀 Me2U Production Deployment Checklist

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Railway URL**: _______________

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Code Quality ✅ VERIFIED
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] Next.js build succeeds (`npm run build`)
- [x] Landing page professionally redesigned
- [x] No backend logic exposed on frontend
- [x] All API keys configured in `.env`

### 2. Environment Configuration
- [ ] **Redis URL** set to real instance (Upstash or Railway)
  - Current: `redis://localhost:6379` ❌
  - Required: `rediss://***REDACTED-USER:PASS***@host:port` ✅
- [ ] **Database URL** points to Railway Postgres
- [ ] **App URL** set to production domain
- [ ] **Email** configured with Resend API key
- [ ] **Paystack** using LIVE keys (starts with `sk_live_`)
- [ ] **VTpass** ready (sandbox OK for initial launch)

### 3. API Keys Validation
| Service | Key Status | Test Status |
|---------|-----------|-------------|
| Paystack | ✅ Live key configured | [ ] Tested |
| Resend | ✅ API key configured | [ ] Tested |
| VTpass | ✅ Sandbox configured | [ ] Tested |
| Platform Bank | ✅ Premium Trust Bank | [ ] Verified |

### 4. Database Preparation
- [ ] Railway Postgres provisioned
- [ ] Database migrations ready to run
- [ ] Viral referral migration file exists (`20260916100000_enhanced_viral_referral_system.sql`)
- [ ] Migration backup created

### 5. Security Review
- [ ] `AUTH_TOKEN_SECRET` is unique (not default)
- [ ] `ALLOW_DEMO_WALLET_FUNDING=false` set
- [ ] All environment variables use secure values
- [ ] No sensitive data in git history
- [ ] `.env` is in `.gitignore`

### 6. Feature Flags
- [ ] Demo wallet funding: **DISABLED** (`false`)
- [ ] Paystack DVA: **ENABLED** (`true`)
- [ ] Wema integration: **DISABLED** (not ready yet)
- [ ] Flutterwave: **DISABLED** (not ready yet)

---

## 🚂 RAILWAY DEPLOYMENT STEPS

### Step 1: Install Railway CLI (if not installed)
```powershell
npm install -g @railway/cli
railway --version
```
- [ ] Railway CLI installed
- [ ] Version confirmed

### Step 2: Login to Railway
```powershell
railway login
```
- [ ] Successfully logged in
- [ ] Browser authentication completed

### Step 3: Initialize Project
```powershell
cd d:\me2u
railway init
```
- [ ] Project initialized
- [ ] Linked to Railway account

### Step 4: Provision Services
**In Railway Dashboard:**
1. [ ] Add **PostgreSQL** database
   - Name: `me2u-postgres`
   - Plan: Hobby (starts at $0)
2. [ ] Add **Redis** database
   - Name: `me2u-redis`
   - Plan: Hobby (starts at $5/month)
   - Alternative: Use Upstash (free tier)

### Step 5: Configure Environment Variables
**Copy from `.env` and update these Railway variables:**

#### Core Configuration
- [ ] `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
- [ ] `REDIS_URL` → `${{Redis.REDIS_URL}}` or Upstash URL
- [ ] `NEXT_PUBLIC_APP_URL` → Your Railway URL
- [ ] `AUTH_TOKEN_SECRET` → (same as local)

#### API Keys
- [ ] `RESEND_API_KEY` → `YOUR_RESEND_API_KEY`
- [ ] `EMAIL_FROM` → `"Me2U" <noreply@me2ulend.online>`
- [ ] `PAYSTACK_SECRET_KEY` → `sk_live_***REDACTED***`
- [ ] `VTPASS_PUBLIC_KEY` → `PK_7320aa572c32f56a513b9bbbc5448793e54c774d67d`
- [ ] `VTPASS_SECRET_KEY` → `SK_9560ea2107f998e0dbe3a64044c93a3c25d20e227c4`
- [ ] `VTPASS_API_KEY` → `c23a828645ea641249b4343a40f0872c`

#### Feature Flags
- [ ] `ALLOW_DEMO_WALLET_FUNDING` → `false`
- [ ] `PAYSTACK_DVA_ENABLED` → `true`
- [ ] `WEMA_ENABLED` → `false`
- [ ] `FLUTTERWAVE_BILLS_ENABLED` → `false`

#### Platform Bank Account
- [ ] `NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK` → `PREMIUM TRUST BANK`
- [ ] `NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME` → `MPT TECNOLOGIES AFRICA LIMITED`
- [ ] `NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER` → `0010245606`

#### Contact Info
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` → `wecare@me2ulend.online`
- [ ] `ADMIN_EMAIL` → `wecare@me2ulend.online`

### Step 6: Deploy Application
```powershell
railway up
```
- [ ] Build started
- [ ] Build completed successfully
- [ ] Deployment live
- [ ] Railway URL obtained: _______________

### Step 7: Run Database Migration
```powershell
railway run --service me2u psql $DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```
- [ ] Migration executed
- [ ] No errors reported
- [ ] Tables verified

### Step 8: Update App URL
1. [ ] Copy Railway deployment URL
2. [ ] Update `NEXT_PUBLIC_APP_URL` in Railway variables
3. [ ] Wait for auto-redeploy (~2 minutes)

---

## 🧪 POST-DEPLOYMENT TESTING

### Test 1: Landing Page (5 minutes)
- [ ] Open Railway URL in browser
- [ ] Landing page loads without errors
- [ ] All sections visible: Hero, HowItWorks, Features, TrustScore, AdvancedTools, CommunityCircles, PublicProof, Comparison, FAQ
- [ ] Mobile responsive (test on phone)
- [ ] Footer shows © 2026 Me2U — MPT TECNOLOGIES AFRICA LIMITED
- [ ] Email shows `wecare@me2ulend.online`

### Test 2: User Registration (5 minutes)
- [ ] Navigate to `/auth/register`
- [ ] Register with test phone: `080########`
- [ ] Email received with OTP
- [ ] Account created successfully
- [ ] Signup bonus (₦1,500) credited to wallet
- [ ] Can access dashboard

### Test 3: Referral System (10 minutes)
- [ ] Login to first account
- [ ] Navigate to `/referrals`
- [ ] Copy referral link
- [ ] Open in incognito mode
- [ ] Register second user with referral code
- [ ] Second user gets ₦1,500 bonus
- [ ] First user (referrer) gets ₦250 reward
- [ ] After second user verifies, first user gets another ₦250
- [ ] Referral appears in referrer's dashboard

### Test 4: Platform Bank Transfer (5 minutes)
- [ ] Navigate to `/wallet`
- [ ] Click "Fund Wallet"
- [ ] Platform account details displayed correctly:
  - Premium Trust Bank
  - MPT TECNOLOGIES AFRICA LIMITED
  - 0010245606
- [ ] Can upload transfer receipt
- [ ] Pending status shows

### Test 5: Account Unlock Payment (10 minutes)
- [ ] Login as user with <10 referrals
- [ ] Try to withdraw funds
- [ ] "Unlock Account" modal appears
- [ ] Shows ₦2,000 payment required
- [ ] Click "Pay Now"
- [ ] Redirected to Paystack payment page
- [ ] Complete payment with test card:
  - Card: 4084084084084081
  - Expiry: Any future date
  - CVV: 408
  - OTP: 123456
- [ ] Payment successful
- [ ] Redirected back to app
- [ ] Account unlocked (can now withdraw)
- [ ] Payment appears in Paystack dashboard

### Test 6: Bills Payment (10 minutes)
- [ ] Navigate to `/bills`
- [ ] Select "Airtime" category
- [ ] Enter amount: ₦100
- [ ] Enter test phone number
- [ ] Complete purchase
- [ ] Wallet balance decreases by ₦100
- [ ] Transaction appears in history
- [ ] Airtime delivered (if live mode)

### Test 7: Email Delivery (5 minutes)
- [ ] Register new user
- [ ] Check email inbox (noreply@me2ulend.online sender)
- [ ] OTP code received
- [ ] Email formatting professional
- [ ] Links work correctly
- [ ] Unsubscribe link present (if applicable)

### Test 8: API Endpoints (5 minutes)
**Test with Postman or curl:**
```powershell
# Health check
curl https://your-railway-url.up.railway.app/api/health

# Public proof (should return statistics)
curl https://your-railway-url.up.railway.app/api/public-proof
```
- [ ] Health endpoint responds
- [ ] Public proof returns statistics
- [ ] No 500 errors

---

## 📊 VISUAL TESTING (30 minutes)

### Mobile (360px - 480px)
- [ ] **iPhone SE / Small phones**
  - Landing page: All sections stack correctly
  - Navigation: Hamburger menu works
  - Forms: Input fields fully visible
  - Buttons: Touch targets ≥44px
  - Text: Readable without zooming

### Tablet (768px - 1024px)
- [ ] **iPad / Tablets**
  - Landing page: 2-column layouts
  - Dashboard: Sidebar navigation works
  - Cards: Proper spacing and alignment
  - Images: Scale appropriately

### Desktop (1024px - 1440px)
- [ ] **Laptop / Desktop**
  - Landing page: Full hero section visible
  - Dashboard: 3-column layouts
  - Navigation: Horizontal menu
  - Hover states: Working on interactive elements

### Large Desktop (1440px+)
- [ ] **4K / Large monitors**
  - Content centered (max-width constraints)
  - Images: No pixelation
  - White space: Balanced
  - Text: Not too wide (reading comfort)

### Cross-Browser Testing
- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Safari** (iOS + macOS)
- [ ] **Edge** (latest)

### Accessibility Testing
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen reader friendly (ARIA labels present)
- [ ] Focus indicators visible
- [ ] Color contrast ≥4.5:1 (WCAG AA)
- [ ] Skip-to-content link works

---

## ⚡ PERFORMANCE AUDIT (15 minutes)

### Lighthouse Audit
Run on: https://pagespeed.web.dev/

#### Landing Page (`/`)
- [ ] **Performance**: Target ≥90
- [ ] **Accessibility**: Target ≥95
- [ ] **Best Practices**: Target ≥95
- [ ] **SEO**: Target ≥90

#### Dashboard (`/dashboard`)
- [ ] **Performance**: Target ≥85
- [ ] **Accessibility**: Target ≥95
- [ ] **Best Practices**: Target ≥95

### Core Web Vitals
- [ ] **LCP** (Largest Contentful Paint): <2.5s
- [ ] **FID** (First Input Delay): <100ms
- [ ] **CLS** (Cumulative Layout Shift): <0.1

### Network Analysis
- [ ] Total page size <2MB
- [ ] Images optimized (WebP/AVIF)
- [ ] JavaScript bundles <500KB
- [ ] CSS optimized and minified
- [ ] Fonts preloaded

### Database Performance
```sql
-- Check query performance
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 10;
```
- [ ] No missing indexes on frequently queried tables
- [ ] Query execution times <100ms

---

## 🔐 SECURITY VERIFICATION

### Environment Variables
- [ ] No secrets in git history
- [ ] All API keys are server-side only
- [ ] No `NEXT_PUBLIC_` prefix on sensitive values
- [ ] `.env` file in `.gitignore`

### API Endpoints
- [ ] Rate limiting active (Redis required)
- [ ] Authentication required for protected routes
- [ ] Input validation on all forms
- [ ] SQL injection prevention (parameterized queries)

### Payment Security
- [ ] Paystack webhook signature verification
- [ ] No PCI data stored locally
- [ ] Payment amounts validated server-side
- [ ] Transaction logs auditable

---

## 📈 MONITORING SETUP

### Railway Monitoring
- [ ] **Logs**: `railway logs --tail`
- [ ] **Metrics**: CPU, Memory, Network usage
- [ ] **Alerts**: Set up error notifications
- [ ] **Deployment history**: Track rollbacks

### Paystack Dashboard
- [ ] Transaction monitoring enabled
- [ ] Webhook logs visible
- [ ] Settlement tracking configured
- [ ] Test vs Live mode clearly labeled

### Database Monitoring
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('railway'));

-- Slow queries (>1s)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```
- [ ] Connection pooling working
- [ ] No connection leaks
- [ ] Query performance acceptable

### Error Tracking
- [ ] Set up Sentry (optional but recommended)
- [ ] Railway error logs monitored
- [ ] Critical errors alert via email/Slack

---

## 🚨 ROLLBACK PLAN

### If Critical Issue Found:
1. [ ] **Immediate**: Roll back Railway deployment
   ```powershell
   railway rollback
   ```
2. [ ] **Investigate**: Check Railway logs
   ```powershell
   railway logs --tail 100
   ```
3. [ ] **Fix locally**: Reproduce and fix issue
4. [ ] **Test**: Run full test suite
5. [ ] **Redeploy**: `railway up`

### Known Issues Log
| Date | Issue | Resolution | Rollback? |
|------|-------|------------|-----------|
| | | | |

---

## ✅ LAUNCH CRITERIA

### Must-Have Before Public Launch:
- [ ] All tests passing (8/8 test suites)
- [ ] Landing page professional and responsive
- [ ] Real Redis instance connected
- [ ] Database migration successful
- [ ] Email delivery working (Resend)
- [ ] Paystack payments functional
- [ ] No backend logic exposed on frontend
- [ ] Mobile-responsive on all pages
- [ ] Lighthouse scores ≥85 across all metrics

### Nice-to-Have (Can defer):
- [ ] Custom domain (me2ulend.online)
- [ ] SSL certificate configured
- [ ] Monitoring dashboard (Sentry)
- [ ] Analytics (Google Analytics / Plausible)
- [ ] VTpass live mode (sandbox OK for now)
- [ ] Wema Bank integration (disabled for now)

---

## 📝 POST-LAUNCH TASKS

### Week 1 (Days 1-7)
- [ ] Monitor Railway logs daily
- [ ] Check Paystack dashboard for transactions
- [ ] Verify email delivery rates
- [ ] Track user registrations (target: 50-100)
- [ ] Respond to user feedback quickly

### Week 2 (Days 8-14)
- [ ] Review referral system performance
- [ ] Check account unlock conversion rate
- [ ] Optimize slow database queries
- [ ] Add missing indexes if needed
- [ ] Target: 500 users

### Week 3 (Days 15-21)
- [ ] Analyze bills payment usage
- [ ] Review loan request patterns
- [ ] Check wallet funding methods
- [ ] Improve UX based on analytics
- [ ] Target: 1,000+ users

### Month 2 Goals
- [ ] Switch VTpass to live mode
- [ ] Set up custom domain with SSL
- [ ] Implement advanced monitoring
- [ ] Optimize performance (>95 Lighthouse)
- [ ] Revenue target: ₦500,000

---

## 📞 SUPPORT CONTACTS

### Emergency Contacts:
- **Railway Support**: https://railway.app/help
- **Paystack Support**: help@paystack.com / +234 1 888 3888
- **Resend Support**: support@resend.com
- **VTpass Support**: support@vtpass.com

### Internal Team:
- **Developer**: _______________
- **Support**: wecare@me2ulend.online
- **On-call**: _______________

---

## ✨ FINAL SIGN-OFF

### Pre-Launch Approval:
- [ ] Technical lead approval
- [ ] Security review passed
- [ ] All tests passing
- [ ] Monitoring configured
- [ ] Rollback plan documented

**Signed by**: _______________  
**Date**: _______________  
**Time**: _______________

---

## 🎉 YOU'RE READY TO LAUNCH!

**All checklist items completed**: [ ] YES / [ ] NO

**Deployment URL**: _______________

**Go/No-Go Decision**: [ ] GO / [ ] NO-GO

**Next step**: Share with first 50 users and monitor closely.

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Document Owner**: Me2U Engineering Team
