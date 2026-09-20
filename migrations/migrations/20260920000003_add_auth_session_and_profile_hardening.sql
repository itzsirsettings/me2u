-- Restores the authentication schema introduced by the application before its
-- migration was placed in the active Railway migration directory.
-- Every statement is safe to run on an already-upgraded environment.
BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jwt_id TEXT UNIQUE,
  user_agent TEXT,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON public.auth_sessions (expires_at);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS failed_pin_attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_pin_attempt_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.password_changed_at IS
  'Timestamp of the latest password change; used to invalidate older sessions.';
COMMENT ON COLUMN public.profiles.account_locked IS
  'Set after repeated invalid transaction PIN attempts; requires an explicit unlock.';

COMMIT;
