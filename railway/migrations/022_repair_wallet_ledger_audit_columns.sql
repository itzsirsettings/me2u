-- Repair wallet ledger schema drift on databases where migration 011 was
-- recorded as applied but its audit columns are absent or nullable.
-- Keep this migration additive and safe to replay.

ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS locked_before NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS locked_after NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS source_detail TEXT,
  ADD COLUMN IF NOT EXISTS amount_delta NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS locked_delta NUMERIC(14,2);

UPDATE public.wallet_ledger
   SET locked_before = COALESCE(locked_before, 0),
       locked_after = COALESCE(locked_after, 0),
       amount_delta = COALESCE(amount_delta, 0),
       locked_delta = COALESCE(locked_delta, 0)
 WHERE locked_before IS NULL
    OR locked_after IS NULL
    OR amount_delta IS NULL
    OR locked_delta IS NULL;

ALTER TABLE public.wallet_ledger
  ALTER COLUMN locked_before SET DEFAULT 0,
  ALTER COLUMN locked_before SET NOT NULL,
  ALTER COLUMN locked_after SET DEFAULT 0,
  ALTER COLUMN locked_after SET NOT NULL,
  ALTER COLUMN amount_delta SET DEFAULT 0,
  ALTER COLUMN amount_delta SET NOT NULL,
  ALTER COLUMN locked_delta SET DEFAULT 0,
  ALTER COLUMN locked_delta SET NOT NULL;
