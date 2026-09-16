# Quick Start Guide - Deploy Me2U in 5 Minutes

## Prerequisites
- GitHub account
- Railway account (sign up at https://railway.app)
- Node.js installed (for Railway CLI)

---

## Step 1: Push to GitHub (2 minutes)

### A. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `me2u`
3. Description: `Peer-to-peer lending platform with viral referral system`
4. Visibility: **Private** (recommended)
5. **DO NOT** check: Initialize with README, .gitignore, or license
6. Click "Create repository"

### B. Push Code
Open PowerShell in the `d:\me2u` directory and run:

```powershell
# Update the script with your GitHub username
notepad push-to-github.ps1
# Change line 4: $GITHUB_USERNAME = "YOUR_ACTUAL_USERNAME"

# Run the push script
.\push-to-github.ps1
```

**OR manually:**
```powershell
git remote add origin https://github.com/YOUR_USERNAME/me2u.git
git push -u origin main
```

---

## Step 2: Deploy to Railway (2 minutes)

### Option A: Automated Script (Recommended)
```powershell
.\deploy-to-railway.ps1
```

### Option B: Manual Commands
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up

# Apply database migration
railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

### Option C: GitHub Integration (Easiest)
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select `me2u` repository
5. Railway auto-detects Next.js and deploys
6. Apply migration (see Step 3)

---

## Step 3: Set Environment Variables (1 minute)

In Railway dashboard → Variables, add:

```env
AUTH_TOKEN_SECRET=your_random_32_char_secret_here
PAYSTACK_SECRET_KEY=sk_live_your_paystack_key_here
NODE_ENV=production
```

Railway auto-provides:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis - add Redis service if needed)

---

## Step 4: Verify Deployment (30 seconds)

### Check Health
```powershell
railway run curl https://your-app.railway.app/api/health/live
```

### Verify Database Tables
```powershell
railway run psql -c "\dt public.*"
```

Should show these NEW tables:
- ✅ `account_unlock_payments`
- ✅ `referral_challenges`
- ✅ `referral_milestones`
- ✅ `referral_leaderboard`
- ✅ `share_template_usage`

---

## Step 5: Test the System (30 seconds)

1. **Visit your app**: https://your-app.railway.app
2. **Register with a referral code** → Check wallet gets ₦1,500
3. **Try to withdraw** → Should see unlock modal
4. **Share referral link** → Test share templates

---

## 🎉 Done! What You Just Deployed

Your live viral referral system includes:

### 💰 Financial Incentives
- ₦1,500 signup bonus for new users
- ₦500 per active referral for referrers
- Weekly challenges: 3 refs/week = ₦4,500
- Milestone rewards: 10/25/50/100 refs = ₦10K-₦100K
- Monthly leaderboard: Top 10 win ₦5K-₦50K

### 🔒 Growth Mechanics
- 10-referral withdrawal lock (creates viral pressure)
- ₦2,000 unlock payment alternative
- 6 pre-written share templates
- Real-time progress tracking

### 📊 Expected Growth
- **Viral coefficient**: 2.5x (every user brings 2.5+ users)
- **Month 1**: 100 → 250 users
- **Month 3**: 1,562 users
- **Month 6**: ~15,000 users (exponential!)

---

## 📅 Post-Deployment Tasks

### 1. Set Up Monthly Cron (Optional)
For automatic leaderboard prizes:
1. Railway dashboard → Add Cron service
2. Schedule: `0 0 1 * *` (1st of each month)
3. Command: `psql $DATABASE_URL -c "SELECT private.me2u_build_monthly_leaderboard()"`

### 2. Monitor Metrics
```powershell
# Watch logs
railway logs

# Check database
railway run psql
```

Track:
- Referral conversion rate
- Weekly challenge completions
- Unlock method split (refs vs payment)
- Monthly leaderboard participation

### 3. Customize (Optional)
- Update share templates in `ShareTemplatesModal.tsx`
- Adjust reward amounts in migration file
- Change unlock fee (₦2,000) in `AccountUnlockModal.tsx`

---

## 🆘 Troubleshooting

### GitHub Push Failed
- Check you created the repository first
- Verify GitHub authentication (PAT or SSH)
- Try: `git push -u origin main --force`

### Railway Deployment Failed
- Check `railway logs` for errors
- Verify environment variables are set
- Ensure DATABASE_URL exists

### Migration Failed
- Check Railway PostgreSQL is running
- Verify DATABASE_URL variable
- Try: `railway run psql` to connect manually

### App Not Working
- Check environment variables
- Verify database migration applied
- Check logs: `railway logs --tail 100`

---

## 📚 Additional Resources

- `DEPLOYMENT_INSTRUCTIONS.md` - Detailed deployment guide
- `RAILWAY_MIGRATION.md` - Technical migration details
- Railway docs: https://docs.railway.app
- Support: Check logs first, then review migration files

---

## 🎯 Success Criteria

After deployment, you should be able to:
- ✅ Register new users with referral codes
- ✅ See ₦1,500 signup bonus credited
- ✅ View referral dashboard with challenges/milestones
- ✅ See unlock modal when trying to withdraw
- ✅ Use share templates to spread referral links
- ✅ Track progress in weekly challenges

**You're now running a viral growth engine! 🚀**
