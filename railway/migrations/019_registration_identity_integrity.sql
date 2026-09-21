-- Registration identity integrity:
-- 1. normalize Nigerian phone representations before enforcing one account per phone;
-- 2. detach only duplicate, zero-activity accounts instead of deleting them;
-- 3. repair the historical email_verified flag for accounts created only after
--    the OTP-verified registration flow.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_registration_phone(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  WITH digits AS (
    SELECT regexp_replace(value, '[^0-9]', '', 'g') AS value
  )
  SELECT CASE
    WHEN value ~ '^0[7-9][0-1][0-9]{8}$' THEN '234' || substr(value, 2)
    WHEN value ~ '^234[7-9][0-1][0-9]{8}$' THEN value
    ELSE value
  END
  FROM digits;
$$;

-- Keep the oldest account bound to a duplicate phone. A newer account may be
-- detached only if it has never acquired financial or KYC-bearing activity.
WITH ranked_accounts AS (
  SELECT a.id,
         ROW_NUMBER() OVER (
           PARTITION BY public.normalize_registration_phone(a.phone)
           ORDER BY a.created_at ASC, a.id ASC
         ) AS row_number
    FROM auth_users a
   WHERE NULLIF(btrim(a.phone), '') IS NOT NULL
),
safe_duplicate_accounts AS (
  SELECT ranked.id
    FROM ranked_accounts ranked
   WHERE ranked.row_number > 1
     AND NOT EXISTS (SELECT 1 FROM payment_proofs pp WHERE pp.user_id = ranked.id)
     AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = ranked.id)
     AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.borrower_id = ranked.id OR l.lender_id = ranked.id)
     AND NOT EXISTS (
       SELECT 1
         FROM profiles p
        WHERE p.id = ranked.id
          AND (
            p.kyc_verified IS TRUE
            OR p.passport_photo_url IS NOT NULL
            OR p.bank_name IS NOT NULL
            OR p.account_number IS NOT NULL
          )
     )
),
cleared_auth_accounts AS (
  UPDATE auth_users a
     SET phone = NULL
    FROM safe_duplicate_accounts duplicate
   WHERE a.id = duplicate.id
  RETURNING a.id
)
UPDATE profiles p
   SET phone = NULL,
       updated_at = NOW()
 WHERE p.id IN (SELECT id FROM cleared_auth_accounts);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM auth_users a
     WHERE NULLIF(btrim(a.phone), '') IS NOT NULL
     GROUP BY public.normalize_registration_phone(a.phone)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add phone uniqueness: a duplicate account has financial or KYC activity and needs manual review.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_registration_phone_unique
  ON public.auth_users (public.normalize_registration_phone(phone))
  WHERE NULLIF(btrim(phone), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_registration_phone_unique
  ON public.profiles (public.normalize_registration_phone(phone))
  WHERE NULLIF(btrim(phone), '') IS NOT NULL;

-- The only public registration path validates an OTP before createUser() is
-- called. Existing normal-user rows from that path are therefore verified.
UPDATE auth_users a
   SET email_verified = TRUE,
       updated_at = NOW()
 WHERE a.email_verified IS FALSE
   AND EXISTS (
     SELECT 1 FROM profiles p WHERE p.id = a.id AND p.role = 'user'
   );

COMMIT;
