-- Keeps registration and password-reset flows compatible with the Railway
-- PostgreSQL schema. Safe to apply more than once and does not alter data.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.password_changed_at IS
  'Timestamp of the latest password change; used to invalidate older sessions.';
