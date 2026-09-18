-- =====================================================================
-- RAILWAY MIGRATION 011 · Wallet ledger + transactions FK-ref cols
-- Mirror of migrations/20260918000003_wallet_ledger_and_tx_refs.sql
-- =====================================================================

BEGIN;

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

UPDATE wallet_ledger
   SET amount_delta = COALESCE(amount_delta, 0),
       locked_delta = COALESCE(locked_delta, 0)
 WHERE amount_delta IS NULL OR locked_delta IS NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS loan_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS withdrawal_request_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS marketplace_item_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS circle_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_loan_id
    ON transactions (loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_withdrawal_request_id
    ON transactions (withdrawal_request_id) WHERE withdrawal_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_marketplace_item_id
    ON transactions (marketplace_item_id) WHERE marketplace_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_circle_id
    ON transactions (circle_id) WHERE circle_id IS NOT NULL;

ALTER TABLE loans ADD COLUMN IF NOT EXISTS circle_id UUID;
CREATE INDEX IF NOT EXISTS idx_loans_circle_id
    ON loans (circle_id) WHERE circle_id IS NOT NULL;

COMMIT;

ALTER TYPE loan_funding_source ADD VALUE IF NOT EXISTS 'circle_pool';
ALTER TYPE transaction_type    ADD VALUE IF NOT EXISTS 'unlock_fee';
