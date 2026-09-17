# 🚀 Me2U Vercel Deployment Guide

**Deploy Me2U to Vercel with custom SMTP email (no Resend needed)**

---

## ✅ What's Configured

- ✅ **Custom SMTP Email System** (Gmail, Outlook, Yahoo - no delays)
- ✅ **AUTH_TOKEN_SECRET Generated**: keep it in `.env` only — never commit secrets (the previous one was leaked here and has been rotated)
- ✅ **VTpass Optional** (bills feature can be disabled)
- ✅ **Vercel-ready** (vercel.json configured)
- ✅ **Production-ready** with instant OTP delivery

---

## 📧 Email System (No Resend Required)

Your app now uses **SMTP with nodemailer** - works with any email provider:

### Free Options (No delays, unlimited emails):
1. **Gmail** (Recommended) - 500 emails/day
2. **Outlook/Hotmail** - 300 emails/day
3. **Yahoo Mail** - 500 emails/day

### Paid Options (High volume):
1. **SendGrid** - 100 emails/day free, then $15/mo
2. **Mailgun** - 5,000 emails/mo free
3. **AWS SES** - $0.10 per 1,000 emails

**We'll use Gmail (it's free and instant)!**

---

## 🔑 Step 1: Set Up Gmail for SMTP

### 1.1 Enable 2-Factor Authentication
1. Go to: **https://myaccount.google.com/security**
2. Click **2-Step Verification** → **Get Started**
3. Follow prompts to enable 2FA (text message or authenticator app)

### 1.2 Generate App Password
1. Go to: **https://myaccount.google.com/apppasswords**
2. Select app: **Mail**
3. Select device: **Other** → Type "Me2U"
4. Click **Generate**
5. Copy the **16-character password** (example: `abcd efgh ijkl mnop`)

### 1.3 Your SMTP Credentials
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop (16 chars, no spaces)
EMAIL_FROM="Me2U" <your-actual-email@gmail.com>
```

**⚡ Benefits:**
- ✅ Instant OTP delivery (< 1 second)
- ✅ Free (500 emails/day = ~15,000/month)
- ✅ No signup needed (use your existing Gmail)
- ✅ 99.9% deliverability
- ✅ Works immediately

---

## 🚀 Step 2: Deploy to Vercel

### 2.1 Push to GitHub (if not done)
```powershell
cd d:\me2u
git add .
git commit -m "feat: Add SMTP email system + Vercel config"
git push origin main
```

### 2.2 Deploy via Vercel Dashboard

1. Go to: **https://vercel.com/new**
2. Click **Import Git Repository**
3. Select **`itzsirsettings/me2u`** from GitHub
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (auto-filled)
5. Click **Deploy** (don't add env vars yet)

⏳ **Wait 2-3 minutes for initial build...**

### 2.3 Get Your Vercel URL
After deployment, you'll get: `https://me2u-xxx.vercel.app`

---

## 🔧 Step 3: Add Environment Variables

### 3.1 Go to Vercel Dashboard
1. Open your **me2u** project
2. Click **Settings** → **Environment Variables**

### 3.2 Add Required Variables

Click **Add New** for each:

#### Database (Required)
```
Name: DATABASE_URL
Value: postgresql://***REDACTED-USER:PASS***@host:5432/railway
Environment: Production, Preview, Development
```

**Get from Railway:**
```powershell
railway variables | findstr DATABASE_URL
```

#### Security (Required)
```
Name: AUTH_TOKEN_SECRET
Value: (generate a new 64-char random secret — see .env.vercel.template; do not commit it)
Environment: Production, Preview, Development
```

#### Gmail SMTP (Required)
```
Name: SMTP_HOST
Value: smtp.gmail.com

Name: SMTP_PORT
Value: 587

Name: SMTP_SECURE
Value: false

Name: SMTP_USER
Value: your-email@gmail.com

Name: SMTP_PASSWORD
Value: your-16-char-app-password

Name: EMAIL_FROM
Value: "Me2U" <your-email@gmail.com>
```

#### Paystack (Required)
```
Name: PAYSTACK_SECRET_KEY
Value: sk_live_your_paystack_secret

Name: PAYSTACK_PUBLIC_KEY
Value: pk_live_your_paystack_public

Name: PAYSTACK_WEBHOOK_SECRET
Value: whsec_your_webhook_secret

Name: PAYSTACK_DVA_ENABLED
Value: true
```

#### App Configuration (Required)
```
Name: NEXT_PUBLIC_APP_URL
Value: https://me2u-xxx.vercel.app

Name: NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK
Value: Wema Bank

Name: NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME
Value: YOUR COMPANY NAME

Name: NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER
Value: 1234567890
```

#### VTpass (Optional - Skip if not using bills)
```
Name: VTPASS_BASE_URL
Value: (leave empty to disable)

Name: VTPASS_PUBLIC_KEY
Value: (leave empty)

Name: VTPASS_SECRET_KEY
Value: (leave empty)

Name: VTPASS_API_KEY
Value: (leave empty)
```

### 3.3 Save & Redeploy
- Click **Save** on each variable
- Vercel will auto-redeploy with new environment

---

## 🗄️ Step 4: Set Up Database (Railway)

### 4.1 Run Migration
```powershell
cd d:\me2u
railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

**Or use Railway dashboard:**
1. Open PostgreSQL service → **Data** tab
2. Click **Query**
3. Copy-paste migration file contents
4. Execute

---

## 🪝 Step 5: Configure Paystack Webhook

1. Go to: **https://dashboard.paystack.com/settings/webhooks**
2. Add webhook URL: `https://me2u-xxx.vercel.app/api/webhooks/paystack`
3. Copy **Webhook Secret**
4. Add to Vercel:
   ```
   Name: PAYSTACK_WEBHOOK_SECRET
   Value: whsec_your_secret
   ```

---

## ✅ Step 6: Test Your App

### Test 1: Registration + OTP Email
1. Visit: `https://me2u-xxx.vercel.app/auth/register`
2. Enter phone + email + password
3. Check Gmail inbox for OTP ✓
4. Should arrive in **< 5 seconds** ✓

### Test 2: Referral System
1. Login → Go to `/referrals`
2. Copy referral code
3. Share: `https://me2u-xxx.vercel.app/auth/register?ref=ABC123`
4. New user signs up
5. Check wallet → ₦250 bonus ✓
6. New user → ₦1,500 bonus ✓

### Test 3: Account Unlock
1. Try to withdraw (with <10 referrals)
2. Unlock modal appears ✓
3. Click "Pay ₦2,000"
4. Complete Paystack payment
5. Account unlocked ✓

### Test 4: Bills Payment (if enabled)
1. Fund wallet
2. Buy ₦100 airtime
3. Should work if VTpass configured ✓
4. Or show "Bills not configured" if disabled ✓

---

## 🎨 Custom Domain (Optional)

### Add Your Domain
1. Vercel Dashboard → **Settings** → **Domains**
2. Add domain: `me2u.app` or `app.yourdomain.com`
3. Add DNS records (shown by Vercel)
4. Wait for verification (5-60 min)
5. Update `NEXT_PUBLIC_APP_URL` to your domain

---

## 📊 Monitoring

### Vercel Dashboard
- **Deployments**: View build logs, status
- **Analytics**: Page views, performance
- **Logs**: Runtime logs, errors
- **Functions**: API route metrics

### Check Logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs
```

---

## 🔄 Auto-Deploy on Push

Vercel automatically deploys when you push to GitHub:

```powershell
git add .
git commit -m "feat: Add new feature"
git push origin main
```

⏳ **Auto-build starts in 10 seconds**
✅ **Live in 2-3 minutes**

---

## 🆘 Troubleshooting

### Email Not Sending
**Error**: "Invalid login"
- **Fix**: Make sure you're using **App Password**, not regular Gmail password
- **Generate**: https://myaccount.google.com/apppasswords

**Error**: "Connection timeout"
- **Fix**: Check `SMTP_PORT=587` (not 465)
- **Fix**: Check `SMTP_SECURE=false`

### Database Connection Failed
**Error**: "Connection refused"
- **Fix**: Copy correct `DATABASE_URL` from Railway
- **Fix**: Ensure Railway Postgres is running

### Build Failed
**Error**: "Module not found"
- **Fix**: Run `npm install` locally first
- **Fix**: Commit `package-lock.json`

### Paystack Payment Failed
**Error**: "Invalid keys"
- **Fix**: Use **LIVE keys** (sk_live_***, pk_live_***)
- **Fix**: Verify keys in Paystack dashboard

---

## 💰 Cost Breakdown

### Free Tier (Good for 0-10,000 users)
- **Vercel**: Free (100GB bandwidth, unlimited requests)
- **Gmail SMTP**: Free (500 emails/day = 15,000/month)
- **Railway**: $5/mo (Postgres database)
- **Paystack**: Free (2.5% transaction fee)
- **GitHub**: Free (unlimited repos)

**Total**: **$5/month** 🎉

### Paid Tier (10,000+ users)
- **Vercel Pro**: $20/mo (1TB bandwidth, priority builds)
- **SendGrid**: $15/mo (40,000 emails/month)
- **Railway**: $20/mo (larger database)
- **Paystack**: Free (still 2.5% fee)

**Total**: **~$55/month**

---

## 🎉 You're Live on Vercel!

Your Me2U app is now:
- ✅ Deployed on Vercel (global CDN)
- ✅ Custom SMTP email (instant OTP delivery)
- ✅ PostgreSQL database (Railway)
- ✅ Payment processing (Paystack)
- ✅ Viral referral system (₦1,500 bonuses)
- ✅ Account unlock (10 refs or ₦2,000)
- ✅ Auto-deploy on git push
- ✅ Production-ready for real users!

**Share your URL and watch users grow! 🚀💰**

---

## 📝 Quick Checklist

- [ ] Gmail App Password generated
- [ ] Vercel project deployed
- [ ] All environment variables set
- [ ] Database migration applied
- [ ] Paystack webhook configured
- [ ] Test registration → OTP received
- [ ] Test referral → bonuses paid
- [ ] Test account unlock → payment works
- [ ] Custom domain added (optional)
- [ ] Monitoring set up

**Need help? Check logs in Vercel dashboard or Railway CLI!**
