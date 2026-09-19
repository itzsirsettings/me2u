-- ============================================================
-- Migration: setup_platform_account.sql
-- Description: Helper script to identify or create platform account
-- ============================================================

-- This script helps set up the platform account for referral revenue

-- ─── Step 1: Check if platform account exists ───────────────────────────

-- Option A: Find existing account by email
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  wallet_balance,
  created_at,
  kyc_verified
FROM profiles
WHERE email = 'platform@me2u.ng' -- Change this to your platform email
   OR username = 'me2u_platform'  -- Change this to your platform username
LIMIT 1;

-- If account exists, copy the ID and set it in your environment:
-- PLATFORM_USER_ID=<paste_id_here>

-- ─── Step 2: Verify platform account setup ──────────────────────────────

-- Check account details and wallet status
SELECT 
  id,
  email,
  username,
  wallet_balance,
  verified_referral_count,
  kyc_verified,
  registration_deposit_paid,
  account_unlocked
FROM profiles
WHERE id = '<PLATFORM_USER_ID>'; -- Replace with your platform user ID

-- ─── Step 3: View platform referral statistics ──────────────────────────

-- Count total referrals assigned to platform
SELECT 
  COUNT(*) as total_referrals,
  COUNT(CASE WHEN first_withdrawal_rewarded THEN 1 END) as withdrawal_rewards_paid,
  COUNT(CASE WHEN first_repayment_rewarded THEN 1 END) as repayment_rewards_paid,
  COUNT(CASE WHEN first_withdrawal_rewarded AND first_repayment_rewarded THEN 1 END) as fully_rewarded
FROM referrals
WHERE referrer_id = '<PLATFORM_USER_ID>'; -- Replace with your platform user ID

-- ─── Step 4: Calculate platform referral revenue ────────────────────────

-- Total revenue from referral rewards
SELECT 
  SUM(amount) as total_referral_revenue,
  COUNT(*) as total_reward_transactions,
  MIN(created_at) as first_reward_date,
  MAX(created_at) as latest_reward_date
FROM transactions
WHERE user_id = '<PLATFORM_USER_ID>' -- Replace with your platform user ID
  AND type = 'deposit'
  AND (description ILIKE '%referral reward%' 
       OR description ILIKE '%referee%');

-- ─── Step 5: View recent platform referrals ─────────────────────────────

-- Most recent users referred by platform
SELECT 
  r.created_at as referral_date,
  p.username,
  p.email,
  p.first_name,
  p.last_name,
  p.kyc_verified,
  p.registration_deposit_paid,
  r.first_withdrawal_rewarded,
  r.first_repayment_rewarded,
  CASE 
    WHEN r.first_withdrawal_rewarded AND r.first_repayment_rewarded THEN '₦500 (Full)'
    WHEN r.first_withdrawal_rewarded OR r.first_repayment_rewarded THEN '₦250 (Partial)'
    ELSE '₦0 (Pending)'
  END as rewards_earned
FROM referrals r
JOIN profiles p ON r.referee_id = p.id
WHERE r.referrer_id = '<PLATFORM_USER_ID>' -- Replace with your platform user ID
ORDER BY r.created_at DESC
LIMIT 20;

-- ─── Step 6: Analytics - Organic user acquisition ───────────────────────

-- Compare organic (platform) vs user referrals in last 30 days
SELECT 
  COUNT(CASE WHEN referred_by IS NULL THEN 1 END) as before_feature_organic,
  COUNT(CASE WHEN referred_by = '<PLATFORM_USER_ID>' THEN 1 END) as platform_referred,
  COUNT(CASE WHEN referred_by IS NOT NULL AND referred_by != '<PLATFORM_USER_ID>' THEN 1 END) as user_referred,
  COUNT(*) as total_users
FROM profiles
WHERE created_at > NOW() - INTERVAL '30 days';

-- ─── Step 7: Backfill historical organic users (OPTIONAL) ───────────────

-- WARNING: This is optional and should only be done ONCE!
-- This assigns all historical users without referral to platform account
-- Test in staging environment first!

-- Uncomment below to execute backfill:

/*
BEGIN;

-- Dry run - see how many users will be affected
SELECT COUNT(*) as users_to_backfill
FROM profiles
WHERE referred_by IS NULL
  AND id != '<PLATFORM_USER_ID>'; -- Replace with your platform user ID

-- If count looks correct, uncomment below to execute:

-- UPDATE profiles
-- SET referred_by = '<PLATFORM_USER_ID>' -- Replace with your platform user ID
-- WHERE referred_by IS NULL
--   AND id != '<PLATFORM_USER_ID>'
--   AND created_at < NOW();

-- Insert referral records for backfilled users
-- INSERT INTO referrals (referrer_id, referee_id, created_at)
-- SELECT 
--   '<PLATFORM_USER_ID>', -- Replace with your platform user ID
--   id,
--   created_at
-- FROM profiles
-- WHERE referred_by = '<PLATFORM_USER_ID>'
--   AND id NOT IN (SELECT referee_id FROM referrals WHERE referrer_id = '<PLATFORM_USER_ID>')
-- ON CONFLICT (referrer_id, referee_id) DO NOTHING;

COMMIT;
*/

-- ─── Step 8: Set up monitoring alerts (PostgreSQL) ──────────────────────

-- Create a function to check platform account anomalies
CREATE OR REPLACE FUNCTION check_platform_account_health(p_platform_user_id UUID)
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Account exists
  RETURN QUERY
  SELECT 
    'Account Exists'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM profiles WHERE id = p_platform_user_id) 
      THEN 'OK' ELSE 'ERROR' END,
    'Platform account must exist in database'::TEXT;

  -- Check 2: Account has referrals
  RETURN QUERY
  SELECT 
    'Has Referrals'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END,
    'Total referrals: ' || COUNT(*)::TEXT
  FROM referrals
  WHERE referrer_id = p_platform_user_id;

  -- Check 3: Wallet balance is reasonable
  RETURN QUERY
  SELECT 
    'Wallet Balance'::TEXT,
    CASE 
      WHEN wallet_balance >= 0 THEN 'OK'
      WHEN wallet_balance < 0 THEN 'ERROR'
    END,
    'Balance: ₦' || wallet_balance::TEXT
  FROM profiles
  WHERE id = p_platform_user_id;

  -- Check 4: Recent reward activity
  RETURN QUERY
  SELECT 
    'Recent Activity'::TEXT,
    CASE WHEN MAX(created_at) > NOW() - INTERVAL '7 days' 
      THEN 'OK' ELSE 'INFO' END,
    'Last reward: ' || COALESCE(MAX(created_at)::TEXT, 'Never')
  FROM transactions
  WHERE user_id = p_platform_user_id
    AND type = 'deposit'
    AND description ILIKE '%referral%';
END;
$$ LANGUAGE plpgsql;

-- Run health check (replace with your platform user ID):
-- SELECT * FROM check_platform_account_health('<PLATFORM_USER_ID>');

-- ─── Step 9: Create periodic report view ────────────────────────────────

CREATE OR REPLACE VIEW platform_referral_report AS
SELECT 
  DATE_TRUNC('month', r.created_at) as month,
  COUNT(*) as new_referrals,
  COUNT(CASE WHEN r.first_withdrawal_rewarded THEN 1 END) as withdrawal_rewards,
  COUNT(CASE WHEN r.first_repayment_rewarded THEN 1 END) as repayment_rewards,
  SUM(CASE 
    WHEN r.first_withdrawal_rewarded AND r.first_repayment_rewarded THEN 500
    WHEN r.first_withdrawal_rewarded OR r.first_repayment_rewarded THEN 250
    ELSE 0
  END) as total_revenue_ngn
FROM referrals r
WHERE r.referrer_id = (SELECT id FROM profiles WHERE email = 'platform@me2u.ng' LIMIT 1)
GROUP BY DATE_TRUNC('month', r.created_at)
ORDER BY month DESC;

-- View the report:
-- SELECT * FROM platform_referral_report;
