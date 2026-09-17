# 🚀 GO LIVE NOW - Me2U Production Deployment

**Status**: ✅ All API keys configured and ready for deployment

---

## ✅ PRE-FLIGHT CHECKLIST

### Critical APIs - All Configured ✅
- ✅ **Paystack**: `sk_live_***REDACTED***`
- ✅ **Resend Email**: `YOUR_RESEND_API_KEY`
- ✅ **VTpass Bills**: Keys configured (sandbox mode)
- ✅ **Platform Bank Account**: Premium Trust Bank - MPT TECNOLOGIES

### Missing/Required Before Going Live:
- ⚠️ **Redis**: Need real Redis instance (Railway Redis or Upstash)
- ⚠️ **Database**: Need to provision Railway Postgres
- ⚠️ **Domain**: Optional but recommended

---

## 🚀 DEPLOYMENT STEPS (15 minutes)

### Step 1: Set Up Redis (5 minutes)

**Option A: Railway Redis (Recommended)**
```bash
# In Railway dashboard:
1. Click "New" → "Database" → "Add Redis"
2. It will auto-generate REDIS_URL
3. Reference it in your app service: ${{Redis.REDIS_URL}}
```

**Option B: Upstash Redis (Free tier available)**
```bash
1. Sign up: https://upstash.com
2. Create Redis database
3. Copy REDIS_URL
4. Add to Railway variables
```

---

### Step 2: Deploy to Railway (5 minutes)

**Option A: Via Railway Dashboard (Easiest)**
```bash
1. Go to: https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select or connect your GitHub account
4. Choose the me2u repository
5. Railway auto-detects Next.js and configures build
```

**Option B: Via Railway CLI**
```powershell
# Install Railway CLI first
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

### Step 3: Configure Environment Variables (5 minutes)

In Railway Dashboard → Your Service → Variables tab, add these:

```env
# Database (link to Postgres service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (link to Redis service or paste Upstash URL)
REDIS_URL=${{Redis.REDIS_URL}}

# Copy ALL variables from .env.railway.production file
# Paste them one by one in Railway dashboard
```

**Quick copy-paste list:**
- AUTH_TOKEN_SECRET
- NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK
- NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME
- NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER
- RESEND_API_KEY
- EMAIL_FROM
- PAYSTACK_SECRET_KEY
- PAYSTACK_DVA_ENABLED
- PAYSTACK_DVA_PREFERRED_BANK
- VTPASS_BASE_URL
- VTPASS_PUBLIC_KEY
- VTPASS_SECRET_KEY
- VTPASS_API_KEY
- NEXT_PUBLIC_APP_URL (update after first deploy)
- ALLOW_DEMO_WALLET_FUNDING=false

---

### Step 4: Run Database Migration (2 minutes)

After deployment, run the viral referral system migration:

```bash
# Via Railway CLI
railway run psql $DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql

# OR via Railway Dashboard
# 1. Go to Postgres service → Data tab
# 2. Click "Query"
# 3. Copy-paste the SQL from the migration file
# 4. Execute
```

**Migration file**: `migrations/migrations/20260916100000_enhanced_viral_referral_system.sql`

---

### Step 5: Update App URL (1 minute)

After first deployment:
1. Railway provides URL like: `https://me2u-production-abc123.up.railway.app`
2. Update `NEXT_PUBLIC_APP_URL` variable in Railway
3. Redeploy (Railway auto-redeploys on variable change)

---

## 🧪 POST-DEPLOYMENT TESTING (15 minutes)

### Test 1: User Registration ✅
```
1. Go to your Railway URL/auth/register
2. Sign up with phone: 08012345678
3. Check email for OTP code
4. Verify account

Expected: User created with ₦1,500 signup bonus
```

### Test 2: Referral System ✅
```
1. Login to first user account
2. Go to /referrals
3. Copy referral link
4. Open in incognito/different browser
5. Register new user with referral code

Expected:
- New user gets ₦1,500 bonus
- Referrer gets ₦250 (first reward)
- After new user verifies, referrer gets ₦250 more
```

### Test 3: Platform Bank Transfer ✅
```
1. Go to /wallet
2. Click "Fund Wallet"
3. See Premium Trust Bank account details
4. Make test transfer of ₦100
5. Upload proof

Expected: Shows platform account for manual funding
```

### Test 4: Account Unlock Payment ✅
```
1. Login as user with <10 referrals
2. Try to withdraw money
3. Should show unlock modal
4. Click "Pay ₦2,000 to unlock"
5. Complete Paystack payment

Expected:
- Paystack payment page opens
- After payment, account unlocked
- Can now withdraw
```

### Test 5: Bills Payment ✅
```
1. Fund wallet (manual transfer or Paystack)
2. Go to /bills
3. Select "Airtime"
4. Enter ₦100, your phone number
5. Complete purchase

Expected:
- Wallet debited ₦100
- Airtime received on phone
- Transaction appears in history
```

---

## ⚠️ CRITICAL PRODUCTION SETTINGS

### Security Checklist:
- [ ] `AUTH_TOKEN_SECRET` is unique (not the default)
- [ ] `ALLOW_DEMO_WALLET_FUNDING=false` (disable test funding)
- [ ] All API keys are **LIVE** keys (not test/sandbox)
- [ ] Paystack webhook configured with production URL
- [ ] Redis is real (not localhost)
- [ ] Database has all migrations applied

### Payment Safety:
- [ ] Test with small amounts first (₦100-500)
- [ ] Verify Paystack dashboard shows transactions
- [ ] Check wallet balances update correctly
- [ ] Test both directions: deposits AND withdrawals

---

## 📊 MONITORING

### Check These Regularly:

**Railway Dashboard**:
- Deployment status (green = healthy)
- Logs for errors: `railway logs`
- Database connections
- Memory/CPU usage

**Paystack Dashboard**:
- Transaction success rate
- Failed payments
- Account unlock payments (₦2,000 each)

**Database Metrics**:
```sql
-- Check user growth
SELECT COUNT(*) FROM auth_users;

-- Check referral activity
SELECT COUNT(*) FROM referrals WHERE status = 'completed';

-- Check account unlocks
SELECT COUNT(*) FROM profiles WHERE account_unlocked = true;

-- Check wallet balances
SELECT SUM(balance) FROM wallets;
```

---

## 🚨 URGENT: Production VTpass

**Current**: Using sandbox mode (`https://sandbox.vtpass.com`)

**Before real bills payments**:
1. Switch to production: `https://api.vtpass.com/api`
2. Fund VTpass wallet with real money
3. Test small transactions first

**To switch**:
```env
VTPASS_BASE_URL=https://api.vtpass.com/api
```

---

## 🎯 GROWTH STRATEGY

### Week 1: Soft Launch (50-100 users)
- Share with close friends/family
- Test all features with real money
- Monitor for bugs
- Fix issues quickly

### Week 2: Local Marketing
- WhatsApp groups
- Social media posts
- Focus on referral program
- Target: 500 users

### Week 3: Aggressive Growth
- The referral system should go viral
- 10-referral withdrawal lock drives viral growth
- Weekly challenges keep users engaged
- Target: 2,000+ users

---

## 💡 REVENUE EXPECTATIONS

### Month 1 Projections:
- **100 users** sign up
- **50 account unlocks** at ₦2,000 = **₦100,000**
- **Bills commissions**: ₦50,000
- **Loan interest**: ₦30,000
- **Total**: ~₦180,000

### Month 3 Projections:
- **1,500 users** (viral growth)
- **500 account unlocks** = **₦1,000,000**
- **Bills commissions**: ₦500,000
- **Loan interest**: ₦300,000
- **Total**: ~₦1,800,000/month

---

## 🆘 TROUBLESHOOTING

### Build Fails on Railway
```bash
# Check Railway logs
railway logs

# Common issues:
# - Missing env variables
# - TypeScript errors
# - Database connection failed
```

### Email Not Sending
```bash
# Check Resend dashboard
# Verify EMAIL_FROM domain is verified
# Check Railway logs for SMTP errors
```

### Payments Failing
```bash
# Check Paystack dashboard
# Verify using LIVE keys (not test keys)
# Check webhook URL is configured
# Test with small amount (₦100)
```

### Redis Connection Error
```bash
# Verify REDIS_URL is set correctly
# Check Redis service is running
# Test connection: railway run redis-cli ping
```

---

## ✅ YOU'RE READY TO GO LIVE!

**All API keys configured**: ✅  
**Platform bank account**: ✅  
**Deployment guide**: ✅  
**Testing plan**: ✅  

### Next Steps:
1. **Set up Redis** (Railway or Upstash)
2. **Deploy to Railway** (15 minutes)
3. **Run database migration**
4. **Test all features** (15 minutes)
5. **Soft launch** to 50 users
6. **Monitor and iterate**

---

**🎉 Your viral P2P lending platform is ready to serve real users with real money!**

**Questions? Issues? Check Railway logs and Paystack dashboard first.**
