# Platform Referral System Setup

## Overview
Users who register without a referral code will have their referral bonuses credited to the platform account instead. This ensures the platform captures revenue from organic user acquisition.

## How It Works

### Registration Flow
1. **User provides referral code**: Referral bonuses go to the referring user (existing behavior)
2. **User provides NO referral code**: Referral bonuses go to the platform account (NEW behavior)

### Referral Reward System
The Me2U referral system rewards based on referee activity:
- **₦250** when referee completes their first successful withdrawal
- **₦250** when referee completes their first loan repayment
- **₦500 total** maximum per referral

### Platform Benefits
- Platform earns referral bonuses from all organic signups (no referral code)
- Platform account accumulates wallet balance over time
- Balance can be tracked for revenue reporting
- Can be used for platform operations, bonuses, or promotional campaigns

## Setup Instructions

### Step 1: Create Platform Account
1. Register a platform account through the normal registration flow:
   - Email: `platform@me2u.ng` (or your preferred email)
   - Username: `me2u_platform` (or your preferred username)
   - Complete full KYC verification
   - Note the User ID from the database

### Step 2: Configure Environment Variable
Add the platform user ID to your `.env` file:

```bash
# Platform user ID for referral rewards when no referral code is provided
PLATFORM_USER_ID=<user_id_from_step_1>
```

**Production (Railway):**
```bash
railway variables set PLATFORM_USER_ID=<user_id_from_step_1>
```

### Step 3: Verify Setup
1. Create a test user without a referral code
2. Check the `referrals` table - should show the platform user as referrer
3. Have the test user complete a withdrawal or loan repayment
4. Verify ₦250 is credited to the platform account wallet

## Database Query Examples

### Check Platform Referral Count
```sql
SELECT COUNT(*) as total_platform_referrals
FROM referrals
WHERE referrer_id = '<PLATFORM_USER_ID>';
```

### Check Platform Wallet Balance
```sql
SELECT wallet_balance
FROM profiles
WHERE id = '<PLATFORM_USER_ID>';
```

### View All Platform Referrals
```sql
SELECT 
  r.created_at,
  p.username,
  p.email,
  r.first_withdrawal_rewarded,
  r.first_repayment_rewarded
FROM referrals r
JOIN profiles p ON r.referee_id = p.id
WHERE r.referrer_id = '<PLATFORM_USER_ID>'
ORDER BY r.created_at DESC;
```

### Calculate Platform Referral Revenue
```sql
SELECT 
  SUM(amount) as total_referral_revenue
FROM transactions
WHERE user_id = '<PLATFORM_USER_ID>'
  AND type = 'deposit'
  AND (description LIKE '%Referral reward%' 
       OR description LIKE '%referral%');
```

## Security Considerations

### Protection Measures
- Platform user ID is stored in environment variables (server-side only)
- Platform user verified to exist before assignment
- If `PLATFORM_USER_ID` not set, users without referral code have `referredBy = null` (fallback)
- Cannot self-refer (existing validation prevents this)

### Access Control
- **DO NOT** share platform account credentials
- **DO NOT** expose `PLATFORM_USER_ID` in client-side code
- **DO** monitor platform account activity regularly
- **DO** set up alerts for unusual transactions

## Monitoring & Reporting

### Weekly Metrics to Track
1. **New organic users**: Users registered without referral code
2. **Platform referral revenue**: Total ₦ earned from organic referrals
3. **Conversion rates**: % of organic users who trigger rewards
4. **Average revenue per organic user**: Total rewards / organic user count

### Monthly Dashboard
Create a dashboard with:
- Total platform wallet balance
- Referral revenue trend (chart)
- Top performing acquisition channels (if tracked)
- Organic vs. referred user ratio

## Troubleshooting

### Platform User Not Receiving Rewards
**Check:**
1. Is `PLATFORM_USER_ID` set correctly in environment?
2. Does the user ID exist in the database?
3. Are the referee's activities triggering the reward conditions?
4. Check database triggers are active:
   - `referral_withdrawal_trigger`
   - `referral_repayment_trigger`

### Users Registering Without Referrals
**Expected behavior** - This is now the default for organic signups.

**To track organic vs. referred:**
```sql
SELECT 
  COUNT(CASE WHEN referredBy IS NULL THEN 1 END) as organic,
  COUNT(CASE WHEN referredBy IS NOT NULL AND referredBy != '<PLATFORM_USER_ID>' THEN 1 END) as user_referred,
  COUNT(CASE WHEN referredBy = '<PLATFORM_USER_ID>' THEN 1 END) as platform_referred
FROM profiles
WHERE created_at > NOW() - INTERVAL '30 days';
```

## Migration Path

If you already have users registered without referral codes (before this feature):

### Option 1: Leave Historical Data As-Is
- Only new registrations get assigned to platform
- Historical organic users remain with `referredBy = NULL`

### Option 2: Backfill Historical Users
```sql
-- WARNING: Test in staging first!
-- This assigns all historical organic users to platform account

UPDATE profiles
SET referred_by = '<PLATFORM_USER_ID>'
WHERE referred_by IS NULL
  AND id != '<PLATFORM_USER_ID>'
  AND created_at < NOW();
```

**Note:** Backfilling doesn't retroactively grant past referral rewards - only future referee activity triggers rewards.

## Future Enhancements

### Possible Extensions
1. **Multiple platform accounts** for different acquisition channels
2. **Dynamic platform assignment** based on utm_source or campaign
3. **Platform referral analytics** dashboard in admin panel
4. **Automated reporting** of platform referral revenue
5. **Configurable platform share** percentage for referral splits

## Support
For questions or issues, contact the development team or check the codebase:
- Registration logic: `app/api/auth/register/route.ts`
- Referral recording: `lib/railway/auth.ts` (`recordReferral` function)
- Reward triggers: `COMPLETE_MIGRATION.sql` (search for `referral_withdrawal_trigger`)
