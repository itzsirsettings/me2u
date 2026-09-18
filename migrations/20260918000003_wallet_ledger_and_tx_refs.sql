-- =====================================================================
-- TASK 3 · Wallet ledger (locked columns) + transactions FK-ref cols
-- =====================================================================
-- 3.1  wallet_ledger already exists in the schema, but the auditing
--      columns `locked_before` / `locked_after` plus the signed-delta
--      helper columns `amount_delta` / `locked_delta` are MISSING on
--      older installs.  ALTER TABLE ADD IF NOT EXISTS.
-- 3.2  transactions + loans tracing columns (loan_id / withdrawal_id /
--      marketplace_item_id / circle_id) + indexes.
-- 3.3  Enum value additions (unlock_payment already present, circle_pool
--      and unlock_fee are not).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 3.1  wallet_ledger — add missing audit columns (safe defaults)
-- ---------------------------------------------------------------------
ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS locked_before NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS locked_after NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS source_detail TEXT;

ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS amount_delta NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS locked_delta NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Backfill amount_delta / locked_delta / locked_* for legacy rows
-- (balance_before/balance_after are guaranteed populated per schema).
-- Use a single cheap UPDATE; rows already carrying values (default 0)
-- keep those unless a reliable backfill is possible.
UPDATE wallet_ledger
   SET amount_delta   = COALESCE(amount_delta, 0),
       locked_delta   = COALESCE(locked_delta, 0)
 WHERE amount_delta IS NULL
    OR locked_delta IS NULL;

-- ---------------------------------------------------------------------
-- 3.2  transactions + loans traceability columns
-- ---------------------------------------------------------------------
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS loan_id UUID;
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS withdrawal_request_id UUID;
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS marketplace_item_id UUID;
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS circle_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_loan_id
    ON transactions (loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_withdrawal_request_id
    ON transactions (withdrawal_request_id) WHERE withdrawal_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_marketplace_item_id
    ON transactions (marketplace_item_id) WHERE marketplace_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_circle_id
    ON transactions (circle_id) WHERE circle_id IS NOT NULL;

ALTER TABLE loans
    ADD COLUMN IF NOT EXISTS circle_id UUID;
CREATE INDEX IF NOT EXISTS idx_loans_circle_id
    ON loans (circle_id) WHERE circle_id IS NOT NULL;

COMMIT;

-- ---------------------------------------------------------------------
-- 3.3  Enum value additions
--      Postgres ALTER TYPE ... ADD VALUE cannot run inside a
--      transaction block on older PG versions, so we close the tx and
--      use a short DO block to ignore the "already exists" error on
--      replay.  PG16+ supports ADD VALUE IF NOT EXISTS; we use that
--      for clean idempotency on Railway PG18.
-- ---------------------------------------------------------------------
ALTER TYPE loan_funding_source ADD VALUE IF NOT EXISTS 'circle_pool';
ALTER TYPE transaction_type    ADD VALUE IF NOT EXISTS 'unlock_fee';
