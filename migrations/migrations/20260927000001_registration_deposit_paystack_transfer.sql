-- Paystack Pay with Transfer registrations are created in-app and settle only
-- from a verified Paystack event/charge status. Manual proofs remain reviewable.
BEGIN;

ALTER TABLE public.payment_proofs
  ALTER COLUMN receipt_image_url DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.registration_deposit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL CHECK (amount = 2000),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  status text NOT NULL DEFAULT 'initializing'
    CHECK (status IN ('initializing', 'pending', 'success', 'failed', 'expired', 'review')),
  provider text NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  account_name text,
  account_number text,
  bank_name text,
  transaction_reference text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS registration_deposit_one_active_per_user
  ON public.registration_deposit_payments (user_id)
  WHERE status IN ('initializing', 'pending');

CREATE INDEX IF NOT EXISTS registration_deposit_payments_user_created_idx
  ON public.registration_deposit_payments (user_id, created_at DESC);

COMMIT;
