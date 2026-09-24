-- Enhanced viral referral system
BEGIN;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL,
  source_user_id uuid,
  reward_type text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_id, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_referral_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_referral_count integer NOT NULL DEFAULT 0;

COMMIT;
