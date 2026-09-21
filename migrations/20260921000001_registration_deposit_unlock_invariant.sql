-- Registration deposit approval is an entitlement: a confirmed payment must
-- always unlock the product account. This migration repairs historical drift
-- and enforces the transition at the database boundary.
--
-- `account_locked` is deliberately not changed here. It is the separate,
-- security-sensitive transaction-PIN lockout flag and must only be cleared by
-- the dedicated PIN recovery/admin workflow.

BEGIN;

-- The original account-unlock constraint predates registration deposits. Keep
-- every supported method and add the method used by the approval workflow.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_unlock_method_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_unlock_method_check
  CHECK (
    unlock_method IS NULL
    OR unlock_method IN (
      'time_based',
      'referrals',
      'payment',
      'subscription',
      'registration_deposit'
    )
  );

UPDATE profiles
   SET account_unlocked = TRUE,
       unlock_method = 'registration_deposit',
       account_unlock_paid_at = COALESCE(
         account_unlock_paid_at,
         registration_deposit_confirmed_at,
         NOW()
       ),
       updated_at = NOW()
 WHERE registration_deposit_paid IS TRUE
   AND COALESCE(account_unlocked, FALSE) IS FALSE;

CREATE OR REPLACE FUNCTION public.enforce_registration_deposit_unlock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Apply only when a registration payment is first confirmed. This preserves
  -- any later, explicit security/risk workflow that might lock an account.
  IF NEW.registration_deposit_paid IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.registration_deposit_paid IS DISTINCT FROM TRUE) THEN
    NEW.account_unlocked := TRUE;
    NEW.unlock_method := 'registration_deposit';
    NEW.account_unlock_paid_at := COALESCE(
      NEW.account_unlock_paid_at,
      NEW.registration_deposit_confirmed_at,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_registration_deposit_unlock ON public.profiles;

CREATE TRIGGER trg_profiles_registration_deposit_unlock
BEFORE INSERT OR UPDATE OF registration_deposit_paid ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_registration_deposit_unlock();

COMMIT;
