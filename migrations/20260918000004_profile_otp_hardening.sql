-- =====================================================================
-- TASK 4 · Profile unlock columns + OTP anti-race partial UNIQUE
-- =====================================================================
-- 4.1  Profile unlock-account columns (already present on newer
--      installs; guard with IF NOT EXISTS for older ones).
-- 4.2  One-active-OTP per (identifier, purpose) — prevents two racing
--      createOtp calls from inserting 2 unverified rows.  Combined with
--      the app-level ON CONFLICT success path, both callers receive a
--      successful "OTP created" outcome and exactly 1 row survives.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 4.1  Profile unlock columns + referral counts
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4.2  One-active-OTP partial unique index
-- ---------------------------------------------------------------------
-- First a pre-check: any (identifier, purpose) carrying >1 unverified,
-- non-expired rows?  If count small and low-risk: invalidate all but
-- newest.  Otherwise bail with HINT.
DO $$
DECLARE
    otp_dupes INTEGER;
BEGIN
    SELECT INTO otp_dupes
        COUNT(*) FILTER (WHERE n > 1)
    FROM (
        SELECT identifier, purpose, COUNT(*) AS n
          FROM otp_codes
         WHERE verified = false
           AND expires_at > NOW()
         GROUP BY identifier, purpose
    ) t;

    IF otp_dupes IS NOT NULL AND otp_dupes > 0 THEN
        RAISE NOTICE 'TASK 4.2 dedup: % active-OTP duplicate groups — invalidating all but newest per (id,purpose).';
    END IF;

    IF otp_dupes IS NOT NULL AND otp_dupes > 1000 THEN
        RAISE EXCEPTION 'Too many duplicate active OTP rows (n=%). Manual review required.', otp_dupes
            USING HINT = 'SELECT identifier, purpose, COUNT(*) FROM otp_codes WHERE verified=false AND expires_at>NOW() GROUP BY 1,2 HAVING COUNT(*)>1;';
    END IF;
END $$;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY identifier, purpose ORDER BY created_at DESC, id DESC) AS rn
      FROM otp_codes
     WHERE verified = false
       AND expires_at > NOW()
),
invalidated AS (
    UPDATE otp_codes oc
       SET verified   = true,
           updated_at = NOW()
      FROM ranked r
     WHERE oc.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS invalidated_duplicate_active_otps FROM invalidated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_codes_one_active_per_user_purpose
    ON otp_codes (identifier, purpose)
    WHERE verified = false AND expires_at > NOW();

COMMIT;
