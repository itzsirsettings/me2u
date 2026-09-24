-- Unlock subscription upgrade
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlock_method text;

COMMIT;
