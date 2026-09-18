-- =====================================================================
-- RAILWAY MIGRATION 012 · Profile unlock cols + OTP partial unique
-- Mirror of migrations/20260918000004_profile_otp_hardening.sql
-- =====================================================================

BEGIN;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS account_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS account_unlock_paid_at TIMESTAMPTZ;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS unlock_method TEXT;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS verified_referral_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS unlock_eligible_at TIMESTAMPTZ;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS unlock_requested_at TIMESTAMPTZ;

DO $$
DECLARE
    otp_dupes INTEGER;
BEGIN
    SELECT INTO otp_dupes COUNT(*) FILTER (WHERE n > 1) FROM (
        SELECT identifier, purpose, COUNT(*) AS n
          FROM otp_codes
         WHERE verified = false AND expires_at > NOW()
         GROUP BY identifier, purpose
    ) t;

    IF otp_dupes IS NOT NULL AND otp_dupes > 0 THEN
        RAISE NOTICE '012 dedup otp: % duplicate active groups.', otp_dupes;
    END IF;
    IF otp_dupes IS NOT NULL AND otp_dupes > 1000 THEN
        RAISE EXCEPTION 'Too many duplicate active OTP rows (%) to auto-remediate.', otp_dupes;
    END IF;
END $$;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY identifier, purpose ORDER BY created_at DESC, id DESC) AS rn
      FROM otp_codes
     WHERE verified = false AND expires_at > NOW()
),
invalidated AS (
    UPDATE otp_codes oc
       SET verified = true, updated_at = NOW()
      FROM ranked r
     WHERE oc.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS invalidated_duplicate_active_otps FROM invalidated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_codes_one_active_per_user_purpose
    ON otp_codes (identifier, purpose)
    WHERE verified = false AND expires_at > NOW();

COMMIT;
