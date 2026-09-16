-- ============================================================
-- Me2U In-App OTP Verification System
-- Migration: 20260916130000
-- ============================================================
-- 
-- Self-contained OTP system with NO external dependencies
-- - No email services (no Gmail, SendGrid, Mailgun)
-- - No SMS services (no Termii, Twilio)
-- - OTP codes stored in database
-- - Codes displayed in-app for users to see
-- - Perfect for development and production
-- ============================================================

-- OTP purpose enum
DO $$ BEGIN
  CREATE TYPE otp_purpose_type AS ENUM ('register', 'login', 'password_reset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or phone
  code text NOT NULL, -- 6-digit code
  purpose otp_purpose_type NOT NULL,
  
  -- Expiry
  expires_at timestamptz NOT NULL,
  
  -- Status
  verified boolean NOT NULL DEFAULT false,
  
  -- Metadata
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  ip_address text,
  user_agent text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_otp_codes_identifier_purpose 
  ON otp_codes(identifier, purpose, verified, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at 
  ON otp_codes(expires_at) 
  WHERE verified = false;
CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at 
  ON otp_codes(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER otp_codes_set_updated_at
  BEFORE UPDATE ON otp_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE otp_codes IS 'Self-contained OTP verification codes - no external email/SMS services';
COMMENT ON COLUMN otp_codes.identifier IS 'Email or phone number that requested OTP';
COMMENT ON COLUMN otp_codes.code IS '6-digit verification code';
COMMENT ON COLUMN otp_codes.purpose IS 'What the OTP is for: register, login, or password_reset';
COMMENT ON COLUMN otp_codes.expires_at IS 'When this OTP expires (10 minutes from creation)';
COMMENT ON COLUMN otp_codes.verified IS 'Whether this OTP has been successfully verified';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of failed verification attempts';

-- Function to increment attempt counter
CREATE OR REPLACE FUNCTION increment_otp_attempt(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE otp_codes
  SET attempts = attempts + 1,
      last_attempt_at = NOW()
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION increment_otp_attempt IS 'Track failed OTP verification attempts';

-- Function to get active OTP for identifier
CREATE OR REPLACE FUNCTION get_active_otp(
  p_identifier text,
  p_purpose otp_purpose_type
)
RETURNS TABLE (
  code text,
  expires_at timestamptz,
  created_at timestamptz,
  minutes_until_expiry integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    otp.code,
    otp.expires_at,
    otp.created_at,
    GREATEST(0, EXTRACT(EPOCH FROM (otp.expires_at - NOW()))::integer / 60) as minutes_until_expiry
  FROM otp_codes otp
  WHERE otp.identifier = p_identifier
    AND otp.purpose = p_purpose
    AND otp.verified = false
    AND otp.expires_at > NOW()
  ORDER BY otp.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_active_otp IS 'Get currently active OTP for an identifier';

-- View: OTP verification stats
CREATE OR REPLACE VIEW otp_verification_stats AS
SELECT 
  DATE(created_at) as date,
  purpose,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE verified = true) as total_verified,
  COUNT(*) FILTER (WHERE verified = false AND expires_at < NOW()) as expired,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE verified = true) / NULLIF(COUNT(*), 0),
    2
  ) as verification_rate_percent
FROM otp_codes
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), purpose
ORDER BY date DESC, purpose;

COMMENT ON VIEW otp_verification_stats IS 'Daily OTP verification statistics for analytics';

-- Auto-cleanup: Delete expired OTPs older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_otps IS 'Delete OTP codes expired for more than 24 hours';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ In-App OTP System Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  • Self-contained OTP storage in database';
  RAISE NOTICE '  • No external email/SMS services needed';
  RAISE NOTICE '  • OTP codes displayed in-app';
  RAISE NOTICE '  • 10-minute expiry with auto-cleanup';
  RAISE NOTICE '  • Verification attempt tracking';
  RAISE NOTICE '  • Analytics and reporting';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  • otp_codes - stores verification codes';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  • get_active_otp() - retrieve current OTP';
  RAISE NOTICE '  • increment_otp_attempt() - track attempts';
  RAISE NOTICE '  • cleanup_expired_otps() - housekeeping';
  RAISE NOTICE '';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '  • otp_verification_stats - analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  ✓ Zero external dependencies';
  RAISE NOTICE '  ✓ Works offline';
  RAISE NOTICE '  ✓ No API costs';
  RAISE NOTICE '  ✓ Perfect for development & production';
  RAISE NOTICE '  ✓ Privacy-focused (data stays in your database)';
  RAISE NOTICE '';
END $$;
