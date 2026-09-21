-- Legacy releases accepted the fixed registration deposit through the former
-- wallet-funding flow. Those approved ₦2,000 proofs did not set the
-- registration entitlement and consequently blocked KYC and app access.
--
-- This is intentionally a one-time, narrowly scoped data repair. It only
-- reclassifies an approved fixed-amount legacy proof when the profile has no
-- approved registration-deposit proof. It does not alter wallet balances,
-- KYC approval, or PIN-security lock state.

BEGIN;

WITH eligible_legacy_proofs AS (
  SELECT pp.id,
         pp.user_id,
         pp.amount,
         pp.updated_at AS confirmed_at
    FROM payment_proofs pp
    JOIN profiles p ON p.id = pp.user_id
   WHERE pp.type = 'wallet_funding'
     AND pp.status = 'approved'
     AND pp.amount = 2000
     AND COALESCE(p.registration_deposit_paid, FALSE) IS FALSE
     AND NOT EXISTS (
       SELECT 1
         FROM payment_proofs registration_proof
        WHERE registration_proof.user_id = pp.user_id
          AND registration_proof.type = 'registration_deposit'
          AND registration_proof.status = 'approved'
     )
   FOR UPDATE OF pp, p
),
reclassified_proofs AS (
  UPDATE payment_proofs pp
     SET type = 'registration_deposit',
         updated_at = NOW()
    FROM eligible_legacy_proofs eligible
   WHERE pp.id = eligible.id
  RETURNING eligible.user_id, eligible.amount, eligible.confirmed_at
)
UPDATE profiles p
   SET registration_deposit_paid = TRUE,
       registration_deposit_amount = repaired.amount,
       registration_deposit_confirmed_at = COALESCE(
         p.registration_deposit_confirmed_at,
         repaired.confirmed_at,
         NOW()
       ),
       account_unlocked = TRUE,
       unlock_method = 'registration_deposit',
       account_unlock_paid_at = COALESCE(
         p.account_unlock_paid_at,
         repaired.confirmed_at,
         NOW()
       ),
       updated_at = NOW()
  FROM reclassified_proofs repaired
 WHERE p.id = repaired.user_id;

COMMIT;
