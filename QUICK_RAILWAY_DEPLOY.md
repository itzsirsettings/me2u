# ⚡ Quick Railway Deploy Guide

**Get Me2U live in 15 minutes**

---

## 🎯 What You Need (Before Starting)

### 1. **Paystack Account** (REQUIRED)
- Sign up: https://dashboard.paystack.com/signup
- Complete business verification
- Get **LIVE** keys from Settings → API Keys

### 2. **Resend Account** (REQUIRED - Free)
- Sign up: https://resend.com/signup  
- Get API key (3,000 emails/month free)

### 3. **VTpass Account** (REQUIRED)
- Sign up: https://www.vtpass.com
- Complete KYC + fund wallet with ₦10,000+
- Get API credentials

---

## 🚀 Deployment Steps

### Step 1: Push to GitHub ✅ DONE
```
✓ Code already pushed to: https://github.com/itzsirsettings/me2u
```

### Step 2: Link Railway Project ✅ DONE
```
✓ Project linked: me2u
✓ PostgreSQL database: Connected
```

### Step 3: Deploy App to Railway

Run in your terminal:
```powershell
cd d:\me2u
railway up
```

**OR use GitHub auto-deploy:**
1. Go to: https://railway.app/project/c2ac2e8b-c3a9-4c67-9547-b458b0272d2e
2. Click **"New Service"** → **"GitHub Repo"**
3. Select **`itzsirsettings/me2u`**
4. Wait for build (3-5 min)

---

### Step 4: Set Environment Variables

1. Go to Railway Dashboard → **me2u service** → **Variables**
2. Click **"Add Variable"**
3. Paste these variables **(REPLACE WITH YOUR REAL KEYS)**:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>
PAYSTACK_SECRET_KEY=sk_live_YOUR_REAL_PAYSTACK_SECRET
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_REAL_PAYSTACK_PUBLIC
PAYSTACK_DVA_ENABLED=true
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM="Me2U" <noreply@yourdomain.com>
VTPASS_BASE_URL=https://api.vtpass.com/api
VTPASS_PUBLIC_KEY=YOUR_VTPASS_PUBLIC_KEY
VTPASS_SECRET_KEY=YOUR_VTPASS_SECRET_KEY
VTPASS_API_KEY=YOUR_VTPASS_API_KEY
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=Your Bank Name
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=YOUR COMPANY NAME
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=1234567890
ALLOW_DEMO_WALLET_FUNDING=false
WEMA_ENABLED=false
FLUTTERWAVE_BILLS_ENABLED=false
```

4. Click **"Save"** - Railway will auto-redeploy

---

### Step 5: Run Database Migration

After deployment completes:

```powershell
# Apply viral referral system migration
railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

**What this creates:**
- ✅ Account unlock system (₦2,000 payment)
- ✅ Referral tracking (10 refs required for withdrawal)
- ✅ Weekly challenges (3 refs = ₦4,500)
- ✅ Milestone rewards (10/25/50/100 refs)
- ✅ Monthly leaderboard (₦165K prizes)
- ✅ Share tracking

---

### Step 6: Configure Paystack Webhook

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-railway-app.railway.app/api/webhooks/paystack`
3. Copy **Webhook Secret**
4. Add to Railway variables:
   ```
   PAYSTACK_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

---

### Step 7: Test Your Live App 🎉

#### Your Railway URL:
Check Railway dashboard for: `https://me2u-production-xyz.up.railway.app`

#### Quick Tests:

**Test 1: Registration**
```
1. Visit /auth/register
2. Sign up with phone + password
3. Should receive OTP email ✓
```

**Test 2: Referral Bonus**
```
1. Login → Go to /referrals
2. Copy your referral code
3. Share: your-app.railway.app/auth/register?ref=ABC123
4. New user signs up
5. Check wallet → Should see +₦250 ✓
6. New user → Should see +₦1,500 ✓
```

**Test 3: Account Unlock**
```
1. Try to withdraw (with <10 referrals)
2. Should show unlock modal ✓
3. Click "Pay ₦2,000"
4. Complete Paystack payment
5. Account unlocked → Can withdraw ✓
```

**Test 4: Bills Payment**
```
1. Fund wallet via bank transfer
2. Admin credits wallet (/admin)
3. Buy ₦100 airtime → Should work ✓
```

---

## 🔍 Verify Everything Works

Run this checklist:

- [ ] App loads at Railway URL
- [ ] User can register + receive OTP
- [ ] User can login
- [ ] Referral code generates
- [ ] New signup with ref code → bonuses paid
- [ ] Account unlock modal shows (<10 refs)
- [ ] Paystack payment works (₦2,000)
- [ ] After payment → account_unlocked = true
- [ ] Bills purchase works (airtime/data)
- [ ] Admin dashboard accessible (/admin)
- [ ] Withdrawal request creates transaction

---

## 📊 Monitor Your App

### Railway Dashboard
- **Logs**: `railway logs` or Dashboard → Logs
- **Metrics**: CPU, Memory, Request count
- **Database**: Check Postgres → Data tab

### Paystack Dashboard
- Transactions
- Webhook deliveries
- Failed payments

### VTpass Dashboard
- API requests
- Wallet balance
- Transaction history

---

## 🆘 Common Issues

### "Database connection failed"
```bash
# Check DATABASE_URL is set
railway variables

# Verify Postgres is running
railway status
```

### "Paystack payment failed"
- Using **LIVE keys** (not test)?
- Webhook URL set in Paystack dashboard?
- Webhook secret added to Railway?

### "No referral bonus received"
```bash
# Check migration ran
railway run psql -c "SELECT * FROM referral_milestones LIMIT 1;"

# Should return data, not error
```

### "Email OTP not sending"
- Resend API key correct?
- Domain verified in Resend?
- Check Resend dashboard → Logs

---

## 🎉 You're Live!

Your Me2U app is now:
- ✅ Deployed to Railway
- ✅ Connected to PostgreSQL
- ✅ Accepting real payments (Paystack)
- ✅ Sending real emails (Resend)
- ✅ Processing real bills (VTpass)
- ✅ Paying referral bonuses (₦1,500 + ₦500)
- ✅ Locking withdrawals (10 refs or ₦2,000)
- ✅ Running weekly challenges
- ✅ Tracking milestones
- ✅ Showing leaderboard

**Share your referral link and watch users grow! 🚀💰**

---

## 📈 Next Steps

1. **Marketing**: Share on social media with your ref code
2. **Monitoring**: Check Railway logs daily
3. **Support**: Set up customer support (WhatsApp/Email)
4. **Scale**: When you hit 1,000 users, upgrade Railway plan
5. **Features**: Add more bill types, add P2P transfers

**Need help? Check `PRODUCTION_SETUP_CHECKLIST.md` for detailed guides.**
