# 🚀 Me2U Production Setup Checklist

**Complete these steps to launch Me2U for real users with real money.**

---

## 📋 Pre-Launch Requirements

### ✅ Step 1: Database (Railway PostgreSQL)
**Status**: ✅ Already configured
- DATABASE_URL: `postgresql://***REDACTED-USER:PASS***@postgres.railway.internal:5432/railway`

**Action Required**:
```bash
# Run this in your terminal to apply viral referral migration:
railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

---

## 🔑 Step 2: Get Real API Keys

### 2.1 Paystack (Payment Gateway) - REQUIRED ⚠️
**Purpose**: Account unlock payments (₦2,000), withdrawals, wallet funding

1. **Sign up**: https://dashboard.paystack.com/signup
2. **Verify your business**: Submit CAC documents, ID, bank account
3. **Get Live Keys**: Dashboard → Settings → API Keys & Webhooks
   - Copy **Live Secret Key** (starts with `sk_live_`)
   - Copy **Live Public Key** (starts with `pk_live_`)
4. **Set webhook URL**: `https://your-railway-app.railway.app/api/webhooks/paystack`

**Keys to copy**:
```
PAYSTACK_SECRET_KEY=sk_live_your_actual_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_actual_paystack_public_key
```

---

### 2.2 Wema Bank / ALAT API (Virtual Accounts) - OPTIONAL
**Purpose**: Generate virtual accounts for each user's wallet

**Status**: Currently disabled (`WEMA_ENABLED=false`)

**To enable**:
1. Contact Wema Bank: https://www.wemabank.com
2. Request API access for virtual account creation
3. Complete KYC and sign agreement
4. Get credentials:
   - API Key
   - Client ID
   - Base URL
   - Webhook secret

**Leave disabled for now** - Use Paystack DVA (Dedicated Virtual Accounts) instead:
```
PAYSTACK_DVA_ENABLED=true
PAYSTACK_DVA_PREFERRED_BANK=wema-bank
```

---

### 2.3 Email Service (Resend) - REQUIRED ⚠️
**Purpose**: Send OTP codes, password resets, notifications

1. **Sign up**: https://resend.com/signup
2. **Verify domain** (or use test domain initially)
3. **Get API Key**: Dashboard → API Keys → Create
4. **Free tier**: 3,000 emails/month (enough to start)

**Keys to copy**:
```
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM="Me2U" <noreply@yourdomain.com>
```

---

### 2.4 VTpass (Airtime/Data Bills) - REQUIRED ⚠️
**Purpose**: Users buy airtime, data, pay bills

1. **Sign up**: https://www.vtpass.com
2. **Complete KYC**: ID verification
3. **Fund wallet**: Minimum ₦10,000 to start
4. **Get API Keys**: Dashboard → Settings → API

**Keys to copy**:
```
VTPASS_BASE_URL=https://api.vtpass.com/api
VTPASS_PUBLIC_KEY=your_vtpass_public_key
VTPASS_SECRET_KEY=your_vtpass_secret_key
VTPASS_API_KEY=your_vtpass_api_key
```

---

### 2.5 OpenAI (AI Assistant) - OPTIONAL
**Purpose**: Me2U Guide chatbot

1. **Sign up**: https://platform.openai.com/signup
2. **Add payment method**: $5-20/month for moderate usage
3. **Create API Key**: Dashboard → API Keys

**Keys to copy**:
```
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
```

**Or disable AI assistant**:
```
# Leave OPENAI_API_KEY empty to disable assistant
OPENAI_API_KEY=
```

---

## 🌐 Step 3: Configure Railway Environment Variables

### 3.1 Go to Railway Dashboard
https://railway.app/project/c2ac2e8b-c3a9-4c67-9547-b458b0272d2e

### 3.2 Select your **me2u service** (NOT Postgres)

### 3.3 Click **Variables** tab

### 3.4 Add these variables:

```env
# ========================================
# CRITICAL - REQUIRED FOR APP TO WORK
# ========================================

# Database (already auto-configured by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Auth Secret (generate a random 32+ character string)
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>

# Paystack - GET FROM: https://dashboard.paystack.com/settings/api
PAYSTACK_SECRET_KEY=sk_live_your_actual_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_actual_paystack_public_key
PAYSTACK_DVA_ENABLED=true
PAYSTACK_DVA_PREFERRED_BANK=wema-bank

# Email - GET FROM: https://resend.com/api-keys
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM="Me2U" <noreply@yourdomain.com>

# VTpass Bills - GET FROM: https://www.vtpass.com
VTPASS_BASE_URL=https://api.vtpass.com/api
VTPASS_PUBLIC_KEY=your_vtpass_public_key
VTPASS_SECRET_KEY=your_vtpass_secret_key
VTPASS_API_KEY=your_vtpass_api_key

# App URL (will be provided after first Railway deployment)
NEXT_PUBLIC_APP_URL=https://me2u-production.up.railway.app

# ========================================
# OPTIONAL - Can leave disabled initially
# ========================================

# Wema Bank API (keep disabled for now)
WEMA_ENABLED=false
WEMA_BASE_URL=
WEMA_API_KEY=
WEMA_CLIENT_ID=
WEMA_AUTHORIZATION=
WEMA_WEBHOOK_SECRET=

# OpenAI Assistant (optional)
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=25000
OPENAI_MAX_OUTPUT_TOKENS=900

# Flutterwave (backup provider - keep disabled)
FLUTTERWAVE_BILLS_ENABLED=false
FLUTTERWAVE_SECRET_KEY=

# Demo features (disable in production)
ALLOW_DEMO_WALLET_FUNDING=false
```

---

## 🗄️ Step 4: Run Database Migration

After setting environment variables, run migration:

```powershell
# Option 1: Via Railway CLI (recommended)
railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql

# Option 2: Via Railway Dashboard
# 1. Go to Postgres service → Data tab
# 2. Click "Query"
# 3. Copy-paste contents of migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
# 4. Click "Execute"
```

**What this migration does**:
- ✅ Creates `account_unlock_payments` table
- ✅ Creates `referral_challenges` table  
- ✅ Creates `referral_milestones` table
- ✅ Creates `referral_leaderboard` table
- ✅ Creates `share_template_usage` table
- ✅ Adds `account_unlocked`, `verified_referral_count` to profiles
- ✅ Creates triggers for automatic referral tracking
- ✅ Creates functions for milestone rewards and leaderboard

---

## 🚀 Step 5: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)
1. Go to Railway dashboard
2. Click **"New Service"** → **"GitHub Repo"**
3. Select **`itzsirsettings/me2u`**
4. Railway auto-detects Next.js and builds
5. Wait 3-5 minutes for build to complete

### Option B: Deploy via CLI
```powershell
railway up
```

### Option C: Auto-deploy on Git Push
Railway will automatically deploy whenever you push to GitHub main branch.

---

## ✅ Step 6: Verify Deployment

### 6.1 Check Build Status
Railway Dashboard → Deployments → Check for green ✅

### 6.2 Get Your Live URL
Railway will provide: `https://me2u-production-abc123.up.railway.app`

### 6.3 Test Critical Features

#### Test 1: User Registration
```
1. Go to /auth/register
2. Sign up with phone + password
3. Check email for OTP
4. Verify account
✅ Should create user with account_unlocked=false
```

#### Test 2: Referral System
```
1. Get referral code from /referrals page
2. Share code: me2u.app/auth/register?ref=ABC123
3. New user signs up with your code
4. Check your wallet
✅ Should receive ₦250 immediately
✅ New user should receive ₦1,500
```

#### Test 3: Account Unlock
```
1. Try to withdraw money (user with <10 referrals)
2. Should show unlock modal
3. Click "Pay ₦2,000 to Unlock"
4. Complete Paystack payment
✅ Account should unlock immediately
✅ User can now withdraw
```

#### Test 4: Weekly Challenge
```
1. Refer 3 people in same week
2. Check /referrals → Challenges tab
✅ Should show ₦4,500 bonus
```

#### Test 5: Bills Payment
```
1. Fund wallet (bank transfer/Paystack)
2. Go to /bills
3. Buy ₦100 airtime
✅ Should deduct from wallet
✅ Should receive airtime on phone
```

---

## 🔒 Step 7: Security Checklist

- [ ] All API keys are **LIVE keys** (not test/sandbox)
- [ ] `AUTH_TOKEN_SECRET` is random 32+ characters
- [ ] Never committed `.env` file to git
- [ ] Enabled Paystack webhook signature verification
- [ ] Set up Paystack webhook URL in dashboard
- [ ] Tested all payment flows with real ₦100 transactions
- [ ] Verified email OTP delivery
- [ ] Tested referral bonus payouts
- [ ] Tested withdrawal locks (10 refs OR ₦2,000)

---

## 💰 Step 8: Platform Bank Account Setup

Users will fund wallets via bank transfer. Set up platform account:

1. **Open business bank account** (recommend: Wema, GTBank, Zenith)
2. **Get account details**
3. **Add to Railway variables**:

```env
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=Wema Bank
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=ME2U TECHNOLOGIES LTD
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=1234567890
```

4. **Set up manual wallet funding flow**:
   - User transfers to platform account
   - User submits transfer proof
   - Admin verifies and credits wallet (in /admin)

---

## 📊 Step 9: Monitor & Scale

### Key Metrics to Watch:
- **User signups** (via /admin dashboard)
- **Referral conversion rate**
- **Account unlock payments** (₦2,000 each)
- **Withdrawal requests**
- **Bills transaction volume**
- **Wallet funding amounts**

### Scaling Triggers:
- **>1000 users**: Upgrade Railway Postgres plan
- **>10,000 users**: Add Redis caching
- **>₦1M monthly volume**: Apply for higher payment limits
- **High email volume**: Upgrade Resend plan

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Check Railway logs
railway logs
```

### Database Connection Error
- Verify `DATABASE_URL` is set correctly
- Check Postgres service is running

### Paystack Payment Fails
- Verify **LIVE keys** (not test keys)
- Check Paystack dashboard for errors
- Verify webhook URL is set

### No Referral Bonus
- Check migration ran successfully
- Verify triggers exist: `railway run psql -c "\df"`
- Check `profiles.verified_referral_count`

### Email OTP Not Sending
- Verify Resend API key
- Check domain verification
- Check Resend dashboard logs

---

## 🎉 Launch Checklist

- [ ] All API keys configured (Paystack, Resend, VTpass)
- [ ] Database migration applied successfully
- [ ] App deployed to Railway with green status
- [ ] Tested user registration → OTP → login flow
- [ ] Tested referral signup → bonus payout
- [ ] Tested account unlock (10 refs OR ₦2,000)
- [ ] Tested withdrawal flow
- [ ] Tested bills payment (airtime/data)
- [ ] Platform bank account configured
- [ ] Admin dashboard accessible at /admin
- [ ] Monitoring set up (Railway dashboard)

---

## 📞 Support

**Railway Issues**: https://help.railway.app
**Paystack Support**: help@paystack.com
**VTpass Support**: support@vtpass.com

**Your app is ready to serve real users and handle real money! 🚀💰**
