-- In-app OTP system
BEGIN;

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_identifier_idx
  ON public.otp_codes (identifier, purpose, expires_at);

COMMIT;
