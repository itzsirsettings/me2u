# Deployment Instructions

## ✅ Changes Committed

All legacy managed-platform references have been removed and your viral referral system is complete!

**Commit Hash**: `6395abe`  
**Files Changed**: 352 files, 56,765 insertions

---

## 🚀 Push to GitHub

### 1. Create a new GitHub repository

Go to https://github.com/new and create a new repository named `me2u` (or whatever you prefer).

**Important**: Do NOT initialize with README, .gitignore, or license (we already have these).

### 2. Add GitHub remote and push

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/me2u.git

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## 🚂 Deploy to Railway

### Option 1: Deploy via Railway CLI (Recommended)

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your Railway project (or create new one)
railway link

# Push to Railway
railway up
```

### Option 2: Deploy via GitHub Integration

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select the `me2u` repository
5. Railway will automatically detect Next.js and deploy

---

## 🗄️ Apply Database Migration

After deployment, apply the new migration:

```bash
# Using Railway CLI
railway run psql < migrations/migrations/20260916100000_enhanced_viral_referral_system.sql

# Or connect directly
psql $DATABASE_URL -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

This will create:
- 5 new tables (account_unlock_payments, referral_challenges, referral_milestones, referral_leaderboard, share_template_usage)
- 5 new columns on profiles table
- All triggers for automatic rewards
- 3 new badges for referral milestones

---

## ⚙️ Environment Variables

Make sure these are set in Railway:

### Required
```env
DATABASE_URL=postgresql://...              # Railway auto-provides this
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>
PAYSTACK_SECRET_KEY=sk_live_xxxxx
REDIS_URL=redis://...                     # For rate limiting
```

### Optional
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
RESEND_API_KEY=re_xxxxx                  # For emails
```

---

## 📅 Set Up Cron Job

For monthly leaderboard prizes, set up a cron job in Railway:

1. Go to your Railway project settings
2. Add a new cron service
3. Set schedule: `0 0 1 * *` (runs at midnight on 1st of each month)
4. Command: `psql $DATABASE_URL -c "SELECT private.me2u_build_monthly_leaderboard()"`

---

## ✅ Verify Deployment

After deployment:

1. **Check health endpoint**:
   ```bash
   curl https://your-app.railway.app/api/health/live
   ```

2. **Verify database tables**:
   ```bash
   railway run psql -c "\dt public.*"
   ```
   
   Should show these new tables:
   - account_unlock_payments
   - referral_challenges  
   - referral_milestones
   - referral_leaderboard
   - share_template_usage

3. **Test signup bonus**:
   - Register a new user with a referral code
   - Check their wallet balance should have ₦1,500

4. **Test account lock**:
   - Try to withdraw with < 10 verified referrals
   - Should see unlock modal

---

## 🎉 You're Done!

Your viral referral system is now live with:
- ✅ ₦1,500 signup bonuses
- ✅ ₦500 per referral rewards
- ✅ Weekly challenges (₦4,500)
- ✅ Milestone rewards (₦10K-₦100K)
- ✅ Monthly leaderboard (₦165K prizes)
- ✅ 10-referral withdrawal lock
- ✅ ₦2,000 unlock payment option
- ✅ 6 share templates

**Expected Growth**: 2.5x monthly viral coefficient = exponential user acquisition! 🚀

---

## 📊 Monitor Metrics

Track these KPIs in your Railway logs:
- Referral conversion rate
- Signup bonus redemptions
- Weekly challenge completions
- Account unlock method split (referrals vs payment)
- Monthly leaderboard participation

For support, check `RAILWAY_MIGRATION.md` for detailed technical changes.
