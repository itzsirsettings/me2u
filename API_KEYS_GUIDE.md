# 🔑 Me2U API Keys Setup Guide

**Step-by-step guide to get ALL required API keys for production**

---

## 1️⃣ Paystack (Payment Gateway) - CRITICAL ⚠️

**What it does**: Process ₦2,000 account unlock payments, handle withdrawals, create virtual accounts

### Sign Up & Verify
1. Go to: **https://dashboard.paystack.com/signup**
2. Enter business details
3. Verify email address
4. Complete business verification:
   - Upload **CAC document** (business registration)
   - Upload **ID** (driver's license, NIN, international passport)
   - Add **bank account** for settlements

**Verification takes 1-3 business days**

### Get API Keys
1. After verification, go to **Settings** → **API Keys & Webhooks**
2. Switch to **LIVE MODE** (top right toggle)
3. Copy these keys:

```env
PAYSTACK_SECRET_KEY=sk_live_***REDACTED***
PAYSTACK_PUBLIC_KEY=pk_live_***REDACTED***
```

### Set Webhook
1. Still in Settings → API Keys & Webhooks
2. Scroll to **Webhook URL**
3. Enter: `https://your-railway-app.railway.app/api/webhooks/paystack`
4. Click **Save**
5. Copy **Webhook Secret** (starts with `whsec_`)

```env
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Test Mode (for initial testing)
If not verified yet, use **TEST keys** temporarily:
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
```

**⚠️ Switch to LIVE keys before launching to real users!**

---

## 2️⃣ Resend (Email Service) - CRITICAL ⚠️

**What it does**: Send OTP codes, password resets, transaction notifications

### Sign Up (Free - 3,000 emails/month)
1. Go to: **https://resend.com/signup**
2. Sign up with email
3. Verify email address

### Get API Key
1. Go to **API Keys** in dashboard
2. Click **"Create API Key"**
3. Name it: `Me2U Production`
4. Copy the key (starts with `re_`)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

### Set Sender Email
```env
EMAIL_FROM="Me2U" <noreply@yourdomain.com>
```

**For testing**: Use `onboarding@resend.dev` (provided by Resend)
```env
EMAIL_FROM="Me2U" <onboarding@resend.dev>
```

### Verify Your Domain (Optional but Recommended)
1. Go to **Domains** → **Add Domain**
2. Enter your domain: `yourdomain.com`
3. Add DNS records (TXT, MX, CNAME)
4. Wait for verification (1-24 hours)

**Benefits**: Higher deliverability, custom sender address

---

## 3️⃣ VTpass (Bills Payment) - CRITICAL ⚠️

**What it does**: Buy airtime, data, pay electricity, TV subscriptions

### Sign Up
1. Go to: **https://www.vtpass.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Fill in business details
4. Verify email

### Complete KYC
1. Login to dashboard
2. Go to **Account** → **KYC Verification**
3. Upload:
   - **Valid ID** (NIN, driver's license, passport)
   - **Business registration** (CAC document)
   - **Utility bill** (for address verification)

**KYC approval takes 1-2 business days**

### Fund Your Wallet
1. Go to **Wallet** → **Fund Wallet**
2. Make bank transfer (minimum ₦10,000 recommended to start)
3. Send proof of payment
4. Wait for confirmation (usually within 1 hour)

### Get API Credentials
1. Go to **Settings** → **API Settings** (or **Developer**)
2. You'll find:

```env
VTPASS_BASE_URL=https://api.vtpass.com/api
VTPASS_PUBLIC_KEY=xxxxxxxxxxxxxxxxx
VTPASS_SECRET_KEY=xxxxxxxxxxxxxxxxx
VTPASS_API_KEY=xxxxxxxxxxxxxxxxx
```

### Test Environment (Sandbox)
For initial testing, use sandbox:
```env
VTPASS_BASE_URL=https://sandbox.vtpass.com/api
```

**⚠️ Switch to production URL before live launch!**

---

## 4️⃣ OpenAI (AI Assistant) - OPTIONAL

**What it does**: Power the Me2U Guide chatbot (financial advice, app help)

### Sign Up
1. Go to: **https://platform.openai.com/signup**
2. Sign up with email
3. Verify email

### Add Payment Method
1. Go to **Settings** → **Billing**
2. Add credit card
3. Add $5-$20 credit (lasts 1-3 months with moderate usage)

**Pricing**: ~$0.002 per chat message (very cheap)

### Create API Key
1. Go to **API Keys**
2. Click **"Create new secret key"**
3. Name it: `Me2U Production`
4. Copy key (starts with `sk-proj-`)

```env
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
```

### To Disable AI Assistant
If you don't want the AI assistant feature, just leave empty:
```env
OPENAI_API_KEY=
```

---

## 5️⃣ Railway Database - AUTO-CONFIGURED ✅

**What it does**: Store users, wallets, transactions, referrals

**Already set up!** Railway automatically provides:
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**No action needed** - just reference it in your variables.

---

## 6️⃣ Generate AUTH_TOKEN_SECRET - CRITICAL ⚠️

**What it does**: Secure user sessions, JWT tokens

### Option 1: Online Generator (Recommended)
1. Go to: **https://generate-secret.vercel.app/32**
2. Copy the generated secret
3. Use it:

```env
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>
```

### Option 2: Command Line
```powershell
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

```bash
# Linux/Mac
openssl rand -base64 32
```

**⚠️ MUST be at least 32 characters long!**

---

## 7️⃣ Platform Bank Account - REQUIRED

**What it does**: Receive wallet funding from users via bank transfer

### Set Up Business Account
1. Open a business bank account (recommended: **Wema**, **GTBank**, **Zenith**)
2. Get account details
3. Add to Railway:

```env
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=Wema Bank
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=ME2U TECHNOLOGIES LTD
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=1234567890
```

**This shows on the app when users want to fund their wallets**

---

## 📋 Complete Environment Variables Checklist

Copy this to Railway Dashboard → Variables:

```env
# ==========================================
# DATABASE (Auto-configured)
# ==========================================
DATABASE_URL=${{Postgres.DATABASE_URL}}

# ==========================================
# SECURITY
# ==========================================
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>

# ==========================================
# PAYSTACK
# ==========================================
PAYSTACK_SECRET_KEY=sk_live_PASTE_YOUR_LIVE_KEY_HERE
PAYSTACK_PUBLIC_KEY=pk_live_PASTE_YOUR_LIVE_KEY_HERE
PAYSTACK_WEBHOOK_SECRET=whsec_PASTE_YOUR_WEBHOOK_SECRET_HERE
PAYSTACK_DVA_ENABLED=true
PAYSTACK_DVA_PREFERRED_BANK=wema-bank

# ==========================================
# EMAIL (RESEND)
# ==========================================
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM="Me2U" <noreply@yourdomain.com>

# ==========================================
# BILLS PAYMENT (VTPASS)
# ==========================================
VTPASS_BASE_URL=https://api.vtpass.com/api
VTPASS_PUBLIC_KEY=PASTE_YOUR_VTPASS_PUBLIC_KEY
VTPASS_SECRET_KEY=PASTE_YOUR_VTPASS_SECRET_KEY
VTPASS_API_KEY=PASTE_YOUR_VTPASS_API_KEY

# ==========================================
# APP CONFIGURATION
# ==========================================
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=Your Bank Name
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=YOUR COMPANY NAME
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=1234567890

# ==========================================
# OPTIONAL
# ==========================================
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini

# ==========================================
# PRODUCTION FLAGS
# ==========================================
ALLOW_DEMO_WALLET_FUNDING=false
NODE_ENV=production
WEMA_ENABLED=false
FLUTTERWAVE_BILLS_ENABLED=false
```

---

## ⏱️ Timeline Estimate

| Service | Sign Up | Verification | Get Keys | Total |
|---------|---------|--------------|----------|-------|
| **Paystack** | 5 min | 1-3 days | 2 min | 1-3 days |
| **Resend** | 3 min | Instant | 2 min | 5 minutes |
| **VTpass** | 5 min | 1-2 days | 2 min | 1-2 days |
| **OpenAI** | 3 min | Instant | 2 min | 5 minutes |
| **Bank Account** | 1-2 weeks | N/A | Instant | 1-2 weeks |

**Can start testing immediately with**: Resend, OpenAI, Paystack test keys, VTpass sandbox

**Need verification for production**: Paystack (1-3 days), VTpass (1-2 days)

---

## 🧪 Test Mode vs Production Mode

### Start with Test Keys
```env
# Paystack Test
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx

# VTpass Sandbox
VTPASS_BASE_URL=https://sandbox.vtpass.com/api
```

### Switch to Production When Ready
1. Paystack & VTpass verified ✓
2. Bank account ready ✓
3. Tested all features in test mode ✓
4. Update to LIVE keys
5. Test with small ₦100 transactions
6. Launch! 🚀

---

## 🆘 Support Contacts

- **Paystack**: help@paystack.com | https://paystack.com/support
- **Resend**: support@resend.com | https://resend.com/support
- **VTpass**: support@vtpass.com | +234-xxx-xxx-xxxx
- **OpenAI**: https://help.openai.com
- **Railway**: https://help.railway.app

---

## ✅ Security Checklist

- [ ] All API keys are LIVE (not test) before launch
- [ ] AUTH_TOKEN_SECRET is random 32+ characters
- [ ] Never committed .env file to git
- [ ] Webhook secret configured in Paystack
- [ ] Resend domain verified (or using resend.dev)
- [ ] VTpass wallet funded with ₦10,000+
- [ ] Bank account details correct and verified
- [ ] Tested all payments with ₦100 transactions

**You're now ready to configure Railway! 🎉**

**Next**: Open `QUICK_RAILWAY_DEPLOY.md` for deployment steps.
