# Me2U Database Migration Deployment Instructions

## Quick Start - Railway Web Console (5 minutes)

Since `psql` setup on Windows has proven challenging, use Railway's web console - it's the fastest and most reliable method.

### Step 1: Access Railway Query Console

1. Open: https://railway.app/project/c2ac2e8b-c3a9-4c67-9547-b458b0272d2e
2. Click on **Postgres** service (the database icon)
3. Click **Data** tab at the top
4. Click **Query** button

You'll see an SQL editor where you can paste and execute SQL.

### Step 2: Run Migration 1 - Enhanced Referral System

Copy the **ENTIRE contents** of this file:
```
d:\me2u\migrations\migrations\20260916100000_enhanced_viral_referral_system.sql
```

Paste into Railway Query console and click **Run** (or press Ctrl+Enter).

**What this does:**
- Adds referral challenges (3 refs/week = ₦4,500 bonus)
- Adds milestone rewards (10 refs = ₦10,000 + gold badge)
- Adds monthly leaderboard (top 10 win prizes)
- Adds account unlock tracking

✅ Expected: Success messages, no errors

### Step 3: Run Migration 2 - 15-Day Unlock + Subscriptions

Copy the **ENTIRE contents** of this file:
```
d:\me2u\migrations\migrations\20260916120000_upgrade_unlock_subscriptions.sql
```

Paste into Railway Query console and click **Run**.

**What this does:**
- Adds 15-day unlock system with `unlock_eligible_at` column
- Creates subscriptions table (Free/Plus/Lender Pro/Circles Pro)
- Creates feature_entitlements table (instant withdrawals, boosts, etc.)
- Creates user_metrics table (LTV, engagement tracking)
- Adds helper functions for multi-path unlock logic

✅ Expected: "Me2U Upgrade Migration Complete!" message

### Step 4: Run Migration 3 - In-App OTP System

Copy the **ENTIRE contents** of this file:
```
d:\me2u\migrations\migrations\20260916130000_in_app_otp_system.sql
```

Paste into Railway Query console and click **Run**.

**What this does:**
- Creates `otp_codes` table (100% self-contained verification)
- NO external email/SMS dependencies
- OTP codes stored in database, displayed in-app
- 10-minute expiry with auto-cleanup
- Analytics views for monitoring

✅ Expected: "In-App OTP System Migration Complete!" with feature list

### Step 5: Verify Migrations

Run this query in Railway Query console to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'otp_codes',
    'subscriptions',
    'feature_entitlements',
    'user_metrics',
    'account_unlock_payments',
    'referral_challenges',
    'referral_milestones',
    'referral_leaderboard'
  )
ORDER BY table_name;
```

You should see **8 tables** listed.

### Step 6: Railway Auto-Deploy

Once migrations are successful:

1. Railway should automatically deploy from your latest GitHub push
2. Check **Deployments** tab in Railway dashboard
3. Monitor build logs to ensure successful deployment

### Step 7: Verify Environment Variables

In Railway dashboard → Your app service → **Variables** tab, ensure these are set:

- `AUTH_TOKEN_SECRET` = `<generate-a-random-32-char-secret>`
- `DATABASE_URL` (auto-set by Railway - don't modify; injected from the Postgres service)
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `REDIS_URL` (auto-set when a Redis service is attached)

### Step 8: Test In-App OTP System

Once deployed, test the zero-dependency verification:

```powershell
# Send OTP (returns code directly in response)
curl -X POST https://your-railway-url.railway.app/api/auth/send-otp `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"action\":\"register\"}'
```

Expected response:
```json
{
  "success": true,
  "code": "123456",
  "expiresIn": 600,
  "message": "Verification code generated"
}
```

### Step 9: Test 15-Day Unlock API

```powershell
curl https://your-railway-url.railway.app/api/account/unlock `
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Success Checklist

- [ ] Migration 1 completed (referral system)
- [ ] Migration 2 completed (15-day unlock + subscriptions)
- [ ] Migration 3 completed (in-app OTP)
- [ ] All 8 tables verified in database
- [ ] Railway auto-deployed successfully
- [ ] Environment variables configured
- [ ] OTP generation test passed
- [ ] OTP verification test passed

---

## What You've Built

✅ **15-Day Withdrawal Unlock System**
- Users wait 15 days after ₦2,000 payment OR
- Get 10 verified referrals OR
- Subscribe to Plus/Lender Pro
- Hourly cron job auto-unlocks eligible users

✅ **100% Self-Contained OTP Verification**
- Zero external dependencies (no email/SMS services)
- OTP codes stored in database
- Codes displayed directly in UI
- No API costs, works offline
- Privacy-focused (data stays in your database)

✅ **Subscriptions Foundation**
- Free, Plus (₦1,500/mo), Lender Pro (₦2,500/mo), Circles Pro
- Feature entitlements system
- User metrics for LTV/CAC analysis
- Revenue tracking expansion

✅ **Enhanced Viral Referral System**
- ₦1,500 signup bonus for referees
- Weekly challenges (3 refs = ₦4,500)
- Milestone rewards (10 refs = ₦10,000 + badge)
- Monthly leaderboard (top 10 win prizes)

---

## Next Steps After Deployment

1. **Build subscription payment UI** (`/profile/upgrade`)
2. **Test 15-day countdown** in AccountUnlockModal component
3. **Monitor unlock funnel** via `/api/admin/unlock-analytics`
4. **Set up Vercel cron jobs**:
   - `/api/cron/unlock-eligible-users` (hourly)
   - `/api/cron/cleanup-otp` (daily)
5. **Add subscription tiers UI** to showcase Plus benefits
6. **Create admin dashboard** for OTP monitoring

---

## Troubleshooting

### "Function set_updated_at() does not exist"

Run this first in Railway Query console:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

### "Enum already exists"

Ignore - the migrations handle this safely with `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`.

### Railway Not Auto-Deploying

1. Check GitHub webhook is connected in Railway settings
2. Manually trigger: Railway dashboard → Service → **Deploy** button
3. Check deployment logs for errors

---

## Support

- Railway Project: https://railway.app/project/c2ac2e8b-c3a9-4c67-9547-b458b0272d2e
- GitHub Repo: https://github.com/itzsirsettings/me2u
- Documentation: `IN_APP_OTP_SYSTEM.md`, `VERCEL_DEPLOYMENT.md`
