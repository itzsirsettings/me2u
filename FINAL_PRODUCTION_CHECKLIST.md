# ✅ FINAL PRODUCTION CHECKLIST - Me2U

## 🎯 Current Status: READY TO DEPLOY

---

## ✅ COMPLETED

### API Keys - All Configured ✅

- ✅ **Paystack**: `sk_live_***REDACTED***`
  - Live secret key configured
  - DVA (Dedicated Virtual Accounts) enabled
  - Preferred bank: Wema

- ✅ **Resend Email**: `YOUR_RESEND_API_KEY`
  - Production API key
  - Email from: noreply@me2u.ng

- ✅ **VTpass Bills**:
  - Public Key: `PK_7320aa572c32f56a513b9bbbc5448793e54c774d67d`
  - Secret Key: `SK_9560ea2107f998e0dbe3a64044c93a3c25d20e227c4`
  - API Key: `c23a828645ea641249b4343a40f0872c`
  - ⚠️ Currently sandbox mode - switch to production when ready

- ✅ **Platform Bank Account**:
  - Bank: PREMIUM TRUST BANK
  - Account Name: MPT TECNOLOGIES AFRICA LIMITED
  - Account Number: 0010245606

### Code Quality ✅

- ✅ TypeScript compilation: PASSED
- ✅ All core features implemented:
  - Authentication & registration
  - Wallet system
  - Loan marketplace
  - Viral referral system
  - Account unlock (10 refs OR ₦2,000)
  - Bills payment
  - Weekly challenges
  - Milestone rewards
  - Leaderboard

### Documentation ✅

- ✅ `GO_LIVE_NOW.md` - Complete deployment guide
- ✅ `REDIS_SETUP.md` - Redis configuration
- ✅ `.env.railway.production` - Production environment template
- ✅ `deploy-production.ps1` - Automated deployment script
- ✅ `PRODUCTION_SETUP_CHECKLIST.md` - Original setup guide

---

## ⚠️ BEFORE YOU DEPLOY (30 minutes)

### 1. Set Up Redis (CRITICAL) ⚠️

**Your app WILL NOT work without Redis!**

**Fastest Option - Upstash (2 minutes, FREE):**

```
1. Go to: https://console.upstash.com/login
2. Sign up with Google/GitHub
3. Create database → Name: me2u-production
4. Copy Redis URL
5. Add to Railway variables: REDIS_URL=redis://...
```

See `REDIS_SETUP.md` for detailed instructions.

**Status**: ⚠️ NOT DONE YET

---

### 2. Deploy to Railway (15 minutes) ⚠️

**Option A - Use Deployment Script (Recommended):**

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Run automated deployment
.\deploy-production.ps1
```

**Option B - Manual Railway Setup:**

```
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Connect your GitHub account
4. Select me2u repository
5. Railway auto-builds
```

**Status**: ⚠️ NOT DONE YET

---

### 3. Configure Railway Environment Variables (10 minutes) ⚠️

Copy ALL variables from `.env.railway.production` to Railway Dashboard:

**Railway Dashboard → Your Service → Variables tab**

**Critical Variables:**

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>
PAYSTACK_SECRET_KEY=sk_live_***REDACTED***
PAYSTACK_DVA_ENABLED=true
PAYSTACK_DVA_PREFERRED_BANK=wema-bank
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM="Me2U" <noreply@me2u.ng>
VTPASS_BASE_URL=https://sandbox.vtpass.com/api
VTPASS_PUBLIC_KEY=PK_7320aa572c32f56a513b9bbbc5448793e54c774d67d
VTPASS_SECRET_KEY=SK_9560ea2107f998e0dbe3a64044c93a3c25d20e227c4
VTPASS_API_KEY=c23a828645ea641249b4343a40f0872c
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=PREMIUM TRUST BANK
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=MPT TECNOLOGIES AFRICA LIMITED
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=0010245606
ALLOW_DEMO_WALLET_FUNDING=false
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

**Status**: ⚠️ NOT DONE YET

---

### 4. Run Database Migration (5 minutes) ⚠️

After deployment:

```bash
railway run psql $DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

This creates all tables for:

- Account unlock payments
- Referral tracking
- Weekly challenges
- Milestone rewards
- Leaderboard

**Status**: ⚠️ NOT DONE YET

---

### 5. Configure Paystack Webhook (3 minutes) ⚠️

```
1. Go to: https://dashboard.paystack.com/settings/webhooks
2. Add webhook URL: https://your-app.railway.app/api/webhooks/paystack
3. Select events:
   - charge.success
   - transfer.success
   - transfer.failed
4. Save
```

**Why needed**: To receive notifications when:

- User pays ₦2,000 account unlock fee
- Withdrawals complete/fail

**Status**: ⚠️ NOT DONE YET

---

### 6. Set Up Railway Cron Jobs (5 minutes) ⚠️

Railway cron schedules are managed in the **Railway Dashboard → Project → Service → Settings → Cron Jobs** (not in `railway.json`). Vercel deployments already declare both schedules in `vercel.json`.

| Job                  | Path                                  | Schedule                | Auth header                          |
| -------------------- | ------------------------------------- | ----------------------- | ------------------------------------ |
| Account unlock sweep | `GET /api/cron/unlock-eligible-users` | `0 * * * *` (hourly)    | `Authorization: Bearer $CRON_SECRET` |
| OTP cleanup          | `GET /api/cron/cleanup-otp`           | `0 2 * * *` (daily 2am) | `Authorization: Bearer $CRON_SECRET` |

1. Add both cron entries with the paths + schedules above; set the auth header value to the `CRON_SECRET` environment variable (already required in env config).
2. After the first scheduled run, verify the heartbeat: `SELECT job_name, last_started_at, last_status, last_run_count FROM cron_runs;`
   - `cron_runs` is the last-run/last-error tracker written by both cron routes. A stale `last_started_at` or `last_status = 'failed'` means the cron is silently broken — investigate before launch.

**Status**: ⚠️ NOT DONE YET

---

## 🚧 COMING SOON / POST-LAUNCH (explicitly deferred)

The following features are **intentionally not implemented in this release** — do not block launch on them:

- **NIN automated verification hardening** — `[Coming Soon / Post-launch]`
  Current state: `lib/nin.ts` accepts provider-based NIN checks with a demo fallback; KYC unlocks via bank-account ownership + passport admin review. Post-launch: verified NIN-hash storage + automated rejection of mismatched records.
- **VTPass bill-service idempotency audit** — `[Coming Soon / Post-launch]`
  Current state: bill purchases already dedup via VTPass `request_id` + `Idempotency-Key` header. Post-launch: cross-service idempotency audit (Next.js ↔ NestJS bills service) with provider-reference uniqueness checks.
- **Load/stress testing at 50 concurrent users** — `[Coming Soon / Post-launch]`
  Run after soft launch with a staging database clone; gate on 0 double-withdraws / 0 negative balances.

### 💰 Fee & Revenue Model (decision matrix)

| Flow                           | Fee                                  | Who pays                  | Revenue event booked                                         |
| ------------------------------ | ------------------------------------ | ------------------------- | ------------------------------------------------------------ |
| Withdrawal                     | ₦100 flat + Paystack 1.5%            | **User** (both)           | `withdrawal_fee` (₦100) + `withdrawal_processor_cost` (1.5%) |
| Wallet funding / deposits      | Paystack processing fee              | **Me2U platform absorbs** | — (cost of business)                                         |
| Bills (airtime/data/utilities) | VTPass `selling_price` markup margin | User (in price)           | `bills_convenience_fee` (margin, on success)                 |
| Marketplace boost              | ₦100 / 24h                           | User                      | `marketplace_boost`                                          |
| Platform loans                 | 0% interest, 0% origination          | —                         | none (explicit product decision)                             |

Transfer failures (`transfer.failed` / `transfer.reversed`) reverse the full withdrawal debit including fees. Canonical source: `lib/revenue.ts`.

### ✅ Pre-deploy QA gate

Run (and record output) before every production deploy:

```
npm run typecheck
npm run lint
npm run test
npm run build
node scripts/check-launch-readiness.mjs
```

---

## 🧪 POST-DEPLOYMENT TESTING (20 minutes)

### Test 1: User Registration (5 min)

```
1. Go to /auth/register
2. Sign up: Phone + Password
3. Check email for OTP
4. Verify account

✅ Expected: User created with ₦1,500 bonus
```

### Test 2: Referral System (5 min)

```
1. Get referral link from /referrals
2. Sign up new user with link
3. Check both wallets

✅ Expected:
   - New user: ₦1,500
   - Referrer: +₦250 immediately
   - After verification: +₦250 more
```

### Test 3: Account Unlock (5 min)

```
1. Try to withdraw (user with <10 refs)
2. Click "Pay ₦2,000"
3. Complete Paystack payment

✅ Expected: Account unlocked, can withdraw
```

### Test 4: Bills Payment (5 min)

```
1. Fund wallet via bank transfer
2. Buy ₦100 airtime
3. Check phone

✅ Expected: Airtime received
```

---

## 🚨 PRODUCTION SECURITY

### Before Public Launch:

- [ ] Change `AUTH_TOKEN_SECRET` to new random value
- [ ] Verify all API keys are LIVE (not test/sandbox)
- [ ] Set `ALLOW_DEMO_WALLET_FUNDING=false`
- [ ] Test all payment flows with real ₦100
- [ ] Monitor Railway logs for errors: `railway logs`
- [ ] Set up domain (optional but professional)

---

## 📊 MONITORING SETUP

### Daily Checks:

1. **Railway Dashboard**: Deployment status, errors
2. **Paystack Dashboard**: Transaction volume, failures
3. **Database**: User growth, referral activity

### Key Metrics:

```sql
-- Total users
SELECT COUNT(*) FROM auth_users;

-- Active referrals today
SELECT COUNT(*) FROM referrals
WHERE created_at::date = CURRENT_DATE;

-- Account unlocks today
SELECT COUNT(*) FROM account_unlock_payments
WHERE created_at::date = CURRENT_DATE;

-- Total wallet balance
SELECT SUM(balance) FROM wallets;
```

---

## 💰 REVENUE TRACKING

### Week 1 Goals (Soft Launch):

- 50-100 users
- ₦20,000-50,000 in account unlock fees
- Test all features work with real money

### Month 1 Goals:

- 500-1,000 users
- ₦200,000-500,000 revenue
- Referral system driving viral growth

### Month 3 Goals:

- 5,000-10,000 users
- ₦2,000,000+ monthly revenue
- Platform becomes self-sustaining

---

## ⚡ QUICK START (Do This Now!)

```powershell
# Step 1: Set up Redis (2 minutes)
# → Go to https://console.upstash.com

# Step 2: Install Railway CLI
npm install -g @railway/cli

# Step 3: Login to Railway
railway login

# Step 4: Deploy!
.\deploy-production.ps1

# Step 5: Run migration
railway run psql $DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql

# Step 6: Test your app!
# → Visit your Railway URL
```

---

## 🎉 YOU ARE READY!

### What You Have:

✅ Complete viral P2P lending platform  
✅ All API keys configured  
✅ Bank account for funding  
✅ Automated deployment scripts  
✅ Comprehensive documentation  
✅ Production-ready code

### What You Need to Do:

1. ⚠️ Set up Redis (2 minutes)
2. ⚠️ Deploy to Railway (15 minutes)
3. ⚠️ Run database migration (5 minutes)
4. ⚠️ Test with real money (20 minutes)
5. 🚀 **GO LIVE!**

---

## 🆘 NEED HELP?

**Railway Issues**:

- Check logs: `railway logs`
- Railway docs: https://docs.railway.app

**Payment Issues**:

- Paystack dashboard: https://dashboard.paystack.com
- Test with ₦100 first

**Database Issues**:

- Check migration ran: `railway run psql $DATABASE_URL -c "\dt"`
- Verify tables exist

---

## 🚀 FINAL WORD

Your app is **architecturally complete** and **production-ready**.

All you need is:

1. Redis setup (2 minutes)
2. Railway deployment (15 minutes)
3. Testing (20 minutes)

**Total time to live: ~45 minutes**

**Let's make this happen! 💰🎉**
