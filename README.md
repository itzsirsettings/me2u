# Me2U - Peer-to-Peer Lending Platform

A modern, feature-rich P2P lending platform with an aggressive viral referral system built with Next.js, PostgreSQL, and Railway.

## 🚀 Quick Deploy (5 Minutes)

See **[QUICK_START.md](QUICK_START.md)** for step-by-step deployment guide.

### TL;DR
```powershell
# 1. Edit push-to-github.ps1 with your GitHub username
.\push-to-github.ps1

# 2. Deploy to Railway
.\deploy-to-railway.ps1
```

## ✨ Features

### Core Platform
- **Zero-Interest Loans** - First loan at 0% interest
- **Peer Marketplace** - Match borrowers with lenders
- **Trust-Based Lending** - Dynamic loan limits based on trust score
- **Instant Transfers** - Real-time wallet operations
- **KYC Verification** - Secure identity verification
- **Bill Payments** - Airtime, data, electricity, cable TV
- **Me2U Circles** - Group lending pools (modern cooperatives)

### 🎁 Viral Referral System

#### Double-Sided Incentives
- **New users**: ₦1,500 instant signup bonus
- **Referrers**: ₦500 per active referral (₦250 + ₦250)

#### Gamification
- **Weekly Challenges**: 3 refs/week = ₦4,500 bonus
- **Milestone Rewards**: 10/25/50/100 refs = ₦10K-₦100K
- **Monthly Leaderboard**: Top 10 win ₦5K-₦50K (₦165K total)
- **Badge System**: Unlock special badges and perks

#### Growth Mechanics
- **10-Referral Withdrawal Lock**: Users must refer 10 verified users OR pay ₦2,000 to unlock withdrawals
- **Share Templates**: 6 pre-written messages for WhatsApp, SMS, copy, native share
- **Real-Time Tracking**: Progress bars, countdowns, and notifications

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (React 19)
- **Database**: PostgreSQL (Railway)
- **Authentication**: JWT with bcrypt
- **Payments**: Paystack integration
- **Styling**: Tailwind CSS 4 + Framer Motion
- **Type Safety**: TypeScript
- **State Management**: Zustand
- **Caching**: Redis (rate limiting)

## 📦 Project Structure

```
me2u/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── referrals/    # Referral system APIs
│   │   ├── account/      # Account unlock APIs
│   │   ├── auth/         # Authentication
│   │   └── wallet/       # Wallet operations
│   ├── referrals/        # Referrals dashboard
│   └── ...               # Other pages
├── components/            # React components
│   ├── referrals/        # Share templates, modals
│   ├── account/          # Account unlock modal
│   ├── gamification/     # Badges, progress tracking
│   └── ...               # Other components
├── lib/                   # Utilities
│   ├── railway/          # Railway PostgreSQL client
│   ├── database/         # Type definitions
│   └── server/           # Server utilities
├── migrations/            # Database migrations
│   └── migrations/       # SQL migration files
└── scripts/              # Deployment scripts
```

## 🗄️ Database Schema

### New Tables (Viral Referral System)
- `account_unlock_payments` - ₦2K unlock fee tracking
- `referral_challenges` - Weekly challenge progress
- `referral_milestones` - Achievement tracking
- `referral_leaderboard` - Monthly rankings
- `share_template_usage` - Share method analytics

### Core Tables
- `auth_users`, `profiles`, `wallets`
- `loans`, `marketplace`, `transactions`
- `referrals`, `notifications`
- `bills`, `bank_transfers`

## 🔧 Environment Variables

```env
# Required
DATABASE_URL=postgresql://...           # Auto-provided by Railway
AUTH_TOKEN_SECRET=your_jwt_secret
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Optional
NODE_ENV=production
REDIS_URL=redis://...                  # For rate limiting
RESEND_API_KEY=re_xxxxx               # For emails
```

## 📊 Expected Growth

With the viral referral system:
- **Viral Coefficient**: 2.5x (every user brings 2.5+ users)
- **Month 1**: 100 → 250 users
- **Month 2**: 250 → 625 users
- **Month 3**: 625 → 1,562 users
- **Month 6**: ~15,000 users (exponential!)

## 📝 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute deployment guide
- **[DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)** - Detailed deployment steps
- **[RAILWAY_MIGRATION.md](RAILWAY_MIGRATION.md)** - Technical migration details
- **[PRODUCT.md](PRODUCT.md)** - Product specifications

## 🚀 Deployment

### Automated (Recommended)
```powershell
# 1. Push to GitHub
.\push-to-github.ps1

# 2. Deploy to Railway
.\deploy-to-railway.ps1
```

### Manual
```bash
# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/me2u.git
git push -u origin main

# Deploy to Railway
railway login
railway init
railway up

# Apply database migration
railway run psql -f migrations/migrations/20260916100000_enhanced_viral_referral_system.sql
```

## 🎯 Success Metrics

Track these KPIs:
- Referral conversion rate
- Signup bonus redemptions
- Weekly challenge completions
- Account unlock method split (referrals vs payment)
- Monthly leaderboard participation
- Viral coefficient (users referred per user)

## 📄 License

Private - All rights reserved

## 🆘 Support

- Check logs: `railway logs`
- Review documentation in `/docs`
- Check migration files for database schema

## 🎉 What Makes This Special

### Aggressive Viral Growth
Every user is incentivized to refer friends through:
- Instant ₦1,500 welcome bonus
- ₦500 earnings per active referral
- Weekly and monthly competitions
- **Forced viral growth** via withdrawal lock

### Production-Ready
- Type-safe TypeScript
- Comprehensive error handling
- Rate limiting and security
- Database triggers for automation
- Real-time progress tracking

### User-Focused
- Mobile-first design
- Smooth animations
- Intuitive gamification
- Clear progress indicators
- Pre-written share templates

---

**Built with ❤️ for viral growth 🚀**
