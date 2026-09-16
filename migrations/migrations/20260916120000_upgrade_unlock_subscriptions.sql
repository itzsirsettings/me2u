-- ============================================================
-- Me2U Upgrade: 15-Day Unlock + Subscriptions Foundation
-- Migration: 20260916120000
-- ============================================================
--
-- PART 1: Enhanced Withdrawal Unlock System
--   - Replace hard 10-referral lock with 15-day grace period
--   - Allow unlock via: (1) 15 days + one-time ₦2,000 payment, OR (2) 10 referrals
--   - Track unlock method for analytics
--
-- PART 2: Subscriptions & Premium Foundation
--   - Subscription plans (Free, Plus, Lender Pro, Circles Pro)
--   - Feature entitlements system
--   - Revenue events expansion
--   - Analytics tracking
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Update profiles table for 15-day unlock
-- ─────────────────────────────────────────────

-- Add unlock tracking columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS unlock_eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlock_method text CHECK (unlock_method IN ('time_based', 'referrals', 'payment', 'subscription')),
  ADD COLUMN IF NOT EXISTS unlock_requested_at timestamptz;

-- Compute unlock_eligible_at for existing users (15 days after registration)
UPDATE profiles 
SET unlock_eligible_at = created_at + INTERVAL '15 days'
WHERE unlock_eligible_at IS NULL;

-- Create index for unlock checks
CREATE INDEX IF NOT EXISTS idx_profiles_unlock_eligible 
  ON profiles(unlock_eligible_at) 
  WHERE account_unlocked = false;

COMMENT ON COLUMN profiles.unlock_eligible_at IS 'Date when user becomes eligible for time-based unlock (15 days after registration + payment)';
COMMENT ON COLUMN profiles.unlock_method IS 'How account was unlocked: time_based (15d+payment), referrals (10+), payment (immediate ₦2k), subscription (Plus)';
COMMENT ON COLUMN profiles.unlock_requested_at IS 'When user clicked unlock button (for conversion tracking)';

-- ─────────────────────────────────────────────
-- 2. Subscription plans & entitlements
-- ─────────────────────────────────────────────

-- Subscription plans enum
DO $$ BEGIN
  CREATE TYPE subscription_plan_type AS ENUM (
    'free',
    'plus_monthly',      -- ₦1,500/mo for borrowers
    'plus_annual',       -- ₦12,000/yr (save ₦6,000)
    'lender_pro_monthly', -- ₦2,500/mo for lenders
    'lender_pro_volume',  -- 2% of funded volume
    'circles_pro'         -- ₦5,000/mo per circle
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan subscription_plan_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Pricing
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  billing_period text CHECK (billing_period IN ('monthly', 'annual', 'volume_based')),
  
  -- Dates
  started_at timestamptz NOT NULL DEFAULT NOW(),
  current_period_start timestamptz NOT NULL DEFAULT NOW(),
  current_period_end timestamptz NOT NULL,
  canceled_at timestamptz,
  trial_end timestamptz,
  
  -- Payment
  payment_method text, -- 'paystack', 'wallet_balance', 'bank_transfer'
  paystack_subscription_code text UNIQUE,
  paystack_customer_code text,
  last_payment_at timestamptz,
  next_payment_due timestamptz,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  CONSTRAINT subscriptions_period_valid CHECK (current_period_end > current_period_start),
  CONSTRAINT subscriptions_one_active_per_user UNIQUE (user_id, plan) 
    WHERE status IN ('active', 'trialing')
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_next_payment ON subscriptions(next_payment_due) 
  WHERE status IN ('active', 'past_due');
CREATE INDEX idx_subscriptions_paystack_code ON subscriptions(paystack_subscription_code) 
  WHERE paystack_subscription_code IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE subscriptions IS 'User subscription plans (Plus, Lender Pro, Circles Pro)';

-- ─────────────────────────────────────────────
-- 3. Feature entitlements
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Withdrawal features
  instant_withdrawals_enabled boolean NOT NULL DEFAULT false,
  instant_withdraw_quota integer NOT NULL DEFAULT 0, -- per month
  instant_withdraw_used integer NOT NULL DEFAULT 0,
  withdraw_fee_discount_percent integer NOT NULL DEFAULT 0 CHECK (withdraw_fee_discount_percent BETWEEN 0 AND 100),
  
  -- Loan features
  max_platform_loan_multiplier numeric(3,2) NOT NULL DEFAULT 1.0 CHECK (max_platform_loan_multiplier >= 1.0),
  extended_duration_days integer NOT NULL DEFAULT 0, -- extra days beyond standard 14
  priority_support boolean NOT NULL DEFAULT false,
  
  -- Marketplace features
  boost_quota integer NOT NULL DEFAULT 1, -- free boosts per month
  boost_used integer NOT NULL DEFAULT 0,
  boost_discount_percent integer NOT NULL DEFAULT 0 CHECK (boost_discount_percent BETWEEN 0 AND 100),
  featured_listing boolean NOT NULL DEFAULT false,
  auto_match_enabled boolean NOT NULL DEFAULT false,
  
  -- Lender features
  verified_lender_badge boolean NOT NULL DEFAULT false,
  portfolio_analytics boolean NOT NULL DEFAULT false,
  auto_relend boolean NOT NULL DEFAULT false,
  lender_insurance_enabled boolean NOT NULL DEFAULT false,
  lender_insurance_coverage_percent integer NOT NULL DEFAULT 0 CHECK (lender_insurance_coverage_percent BETWEEN 0 AND 100),
  
  -- Circle features
  max_circles integer NOT NULL DEFAULT 1,
  circle_admin_tools boolean NOT NULL DEFAULT false,
  circle_analytics boolean NOT NULL DEFAULT false,
  
  -- Reporting
  advanced_credit_report boolean NOT NULL DEFAULT false,
  downloadable_certificate boolean NOT NULL DEFAULT false,
  
  -- Reset tracking
  quota_reset_at timestamptz NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  CONSTRAINT feature_entitlements_one_per_user UNIQUE (user_id)
);

CREATE INDEX idx_feature_entitlements_user ON feature_entitlements(user_id);
CREATE INDEX idx_feature_entitlements_quota_reset ON feature_entitlements(quota_reset_at);

CREATE TRIGGER feature_entitlements_set_updated_at
  BEFORE UPDATE ON feature_entitlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE feature_entitlements IS 'Per-user feature flags and quotas based on subscription tier';

-- ─────────────────────────────────────────────
-- 4. Expand revenue_events
-- ─────────────────────────────────────────────

-- Add new revenue event types
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'subscription_recurring';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'instant_payout_fee';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'credit_report_sale';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'circle_subscription';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'lender_insurance_fee';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'featured_listing';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'unlock_payment';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'bills_convenience_fee';

-- Add subscription tracking to revenue_events
ALTER TABLE revenue_events 
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_type subscription_plan_type;

CREATE INDEX IF NOT EXISTS idx_revenue_events_subscription ON revenue_events(subscription_id) 
  WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_events_plan_type ON revenue_events(plan_type) 
  WHERE plan_type IS NOT NULL;

-- ─────────────────────────────────────────────
-- 5. Analytics & metrics tracking
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Engagement metrics
  loans_taken integer NOT NULL DEFAULT 0,
  loans_given integer NOT NULL DEFAULT 0,
  total_borrowed numeric(14,2) NOT NULL DEFAULT 0,
  total_lent numeric(14,2) NOT NULL DEFAULT 0,
  on_time_repayments integer NOT NULL DEFAULT 0,
  late_repayments integer NOT NULL DEFAULT 0,
  
  -- Revenue metrics
  lifetime_fees_paid numeric(14,2) NOT NULL DEFAULT 0,
  lifetime_referral_earned numeric(14,2) NOT NULL DEFAULT 0,
  subscription_months integer NOT NULL DEFAULT 0,
  
  -- Behavior
  bills_purchased integer NOT NULL DEFAULT 0,
  bills_value numeric(14,2) NOT NULL DEFAULT 0,
  withdrawals_count integer NOT NULL DEFAULT 0,
  marketplace_posts integer NOT NULL DEFAULT 0,
  boost_purchases integer NOT NULL DEFAULT 0,
  
  -- Timestamps
  first_loan_at timestamptz,
  last_active_at timestamptz,
  ltv_calculated_at timestamptz,
  lifetime_value numeric(14,2) NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_metrics_one_per_user UNIQUE (user_id)
);

CREATE INDEX idx_user_metrics_user ON user_metrics(user_id);
CREATE INDEX idx_user_metrics_ltv ON user_metrics(lifetime_value DESC);
CREATE INDEX idx_user_metrics_last_active ON user_metrics(last_active_at DESC);

CREATE TRIGGER user_metrics_set_updated_at
  BEFORE UPDATE ON user_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE user_metrics IS 'Aggregated user behavior and revenue metrics for LTV/CAC analysis';

-- ─────────────────────────────────────────────
-- 6. Functions for unlock eligibility
-- ─────────────────────────────────────────────

-- Function to check if user is eligible for time-based unlock
CREATE OR REPLACE FUNCTION is_eligible_for_time_based_unlock(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_profile RECORD;
  v_payment_made boolean;
BEGIN
  -- Get profile info
  SELECT 
    created_at,
    registration_deposit_paid,
    account_unlocked,
    unlock_eligible_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- Already unlocked
  IF v_profile.account_unlocked THEN
    RETURN true;
  END IF;
  
  -- Check if registration payment made
  SELECT EXISTS (
    SELECT 1 FROM account_unlock_payments
    WHERE user_id = p_user_id 
      AND status = 'success'
      AND amount >= 2000
    LIMIT 1
  ) INTO v_payment_made;
  
  -- Eligible if: 15 days passed + payment made
  RETURN (
    v_profile.registration_deposit_paid AND
    v_payment_made AND
    v_profile.unlock_eligible_at <= NOW()
  );
END;
$$;

COMMENT ON FUNCTION is_eligible_for_time_based_unlock IS 'Check if user can unlock via 15-day + ₦2,000 payment method';

-- Function to check if user is eligible for referral unlock
CREATE OR REPLACE FUNCTION is_eligible_for_referral_unlock(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COALESCE(verified_referral_count, 0)
  INTO v_count
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN v_count >= 10;
END;
$$;

COMMENT ON FUNCTION is_eligible_for_referral_unlock IS 'Check if user has 10+ verified referrals for free unlock';

-- Function to check if user is eligible for subscription unlock (Plus or higher)
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND plan IN ('plus_monthly', 'plus_annual', 'lender_pro_monthly', 'lender_pro_volume')
      AND current_period_end > NOW()
  );
END;
$$;

COMMENT ON FUNCTION has_active_subscription IS 'Check if user has active Plus or Lender Pro subscription (auto-unlocks)';

-- ─────────────────────────────────────────────
-- 7. Initialize entitlements for existing users
-- ─────────────────────────────────────────────

-- Create feature entitlements for all existing users (defaults to free tier)
INSERT INTO feature_entitlements (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM feature_entitlements WHERE user_id = profiles.id
);

-- Create user metrics for all existing users
INSERT INTO user_metrics (user_id, last_active_at)
SELECT id, updated_at FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_metrics WHERE user_id = profiles.id
);

-- ─────────────────────────────────────────────
-- 8. Update account_unlock_payments for better tracking
-- ─────────────────────────────────────────────

ALTER TABLE account_unlock_payments
  ADD COLUMN IF NOT EXISTS unlock_type text CHECK (unlock_type IN ('immediate', 'time_based')) DEFAULT 'time_based',
  ADD COLUMN IF NOT EXISTS eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS days_since_registration integer;

COMMENT ON COLUMN account_unlock_payments.unlock_type IS 'immediate = pay ₦2k now to unlock instantly, time_based = pay ₦2k + wait 15 days';
COMMENT ON COLUMN account_unlock_payments.eligible_at IS 'When user will be eligible for unlock (15 days after this payment)';

-- ─────────────────────────────────────────────
-- 9. Create views for analytics
-- ─────────────────────────────────────────────

-- View: User unlock status summary
CREATE OR REPLACE VIEW user_unlock_status AS
SELECT 
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at as registered_at,
  p.unlock_eligible_at,
  p.account_unlocked,
  p.account_unlock_paid_at,
  p.unlock_method,
  p.unlock_requested_at,
  p.verified_referral_count,
  
  -- Eligibility flags
  is_eligible_for_time_based_unlock(p.id) as time_unlock_eligible,
  is_eligible_for_referral_unlock(p.id) as referral_unlock_eligible,
  has_active_subscription(p.id) as has_subscription,
  
  -- Payment info
  aup.amount as unlock_payment_amount,
  aup.status as payment_status,
  aup.unlock_type,
  aup.eligible_at as payment_eligible_at,
  aup.created_at as payment_made_at,
  
  -- Subscription info
  s.plan as subscription_plan,
  s.status as subscription_status,
  
  -- Computed flags
  CASE 
    WHEN p.account_unlocked THEN 'unlocked'
    WHEN has_active_subscription(p.id) THEN 'eligible_via_subscription'
    WHEN is_eligible_for_referral_unlock(p.id) THEN 'eligible_via_referrals'
    WHEN is_eligible_for_time_based_unlock(p.id) THEN 'eligible_via_time'
    WHEN p.unlock_eligible_at > NOW() THEN 'waiting_15_days'
    ELSE 'locked'
  END as unlock_status
  
FROM profiles p
LEFT JOIN account_unlock_payments aup ON aup.user_id = p.id 
  AND aup.status = 'success'
  AND aup.created_at = (
    SELECT MAX(created_at) FROM account_unlock_payments 
    WHERE user_id = p.id AND status = 'success'
  )
LEFT JOIN subscriptions s ON s.user_id = p.id 
  AND s.status IN ('active', 'trialing')
  AND s.current_period_end > NOW();

COMMENT ON VIEW user_unlock_status IS 'Comprehensive user unlock eligibility status for admin dashboard';

-- View: Subscription revenue metrics
CREATE OR REPLACE VIEW subscription_revenue_summary AS
SELECT 
  DATE_TRUNC('day', s.started_at) as signup_date,
  s.plan,
  s.status,
  COUNT(*) as subscriptions_count,
  SUM(s.amount) as total_revenue,
  AVG(s.amount) as avg_revenue,
  COUNT(DISTINCT s.user_id) as unique_users
FROM subscriptions s
WHERE s.started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', s.started_at), s.plan, s.status
ORDER BY signup_date DESC, plan;

COMMENT ON VIEW subscription_revenue_summary IS 'Daily subscription revenue by plan for analytics dashboard';

-- ─────────────────────────────────────────────
-- 10. Seed data: Free plan for all existing users
-- ─────────────────────────────────────────────

-- Create free subscription for all users who don't have one
INSERT INTO subscriptions (
  user_id, 
  plan, 
  status, 
  amount, 
  billing_period,
  current_period_start,
  current_period_end
)
SELECT 
  id,
  'free'::subscription_plan_type,
  'active'::subscription_status,
  0,
  'monthly',
  NOW(),
  NOW() + INTERVAL '100 years' -- Free plan never expires
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE user_id = profiles.id
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- Done!
-- ─────────────────────────────────────────────

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Me2U Upgrade Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  • 15-day withdrawal unlock system';
  RAISE NOTICE '  • Subscription plans (Free, Plus, Lender Pro)';
  RAISE NOTICE '  • Feature entitlements framework';
  RAISE NOTICE '  • Expanded revenue tracking';
  RAISE NOTICE '  • User metrics & analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update withdrawal API to check new unlock logic';
  RAISE NOTICE '  2. Build subscription payment flow (Paystack recurring)';
  RAISE NOTICE '  3. Create Plus upgrade UI in /profile';
  RAISE NOTICE '  4. Add admin analytics dashboard';
  RAISE NOTICE '';
END $$;
