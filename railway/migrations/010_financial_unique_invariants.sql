-- =====================================================================
-- RAILWAY MIGRATION 010 · Financial UNIQUE invariants
-- Mirror of migrations/20260918000002_financial_unique_invariants.sql
-- =====================================================================

-- Pre-requisite: ensure 'cancelled' enum value exists (22P02 guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_enum
     WHERE enumlabel = 'cancelled'
       AND enumtypid = 'public.withdrawal_request_status'::regtype
  ) THEN
    EXECUTE 'ALTER TYPE public.withdrawal_request_status ADD VALUE ''cancelled''';
  END IF;
END $$;

BEGIN;

DO $$
DECLARE
    pending_dupe_users INTEGER;
    pending_dupe_rows  INTEGER;
BEGIN
    SELECT INTO pending_dupe_users, pending_dupe_rows
        COUNT(DISTINCT user_id) FILTER (WHERE n > 1),
        COUNT(*) FILTER (WHERE n > 1)
    FROM (
        SELECT user_id, COUNT(*) AS n
          FROM withdrawal_requests
         WHERE status = 'pending'
         GROUP BY user_id
    ) t;

    IF pending_dupe_users IS NOT NULL AND pending_dupe_users > 0 THEN
        RAISE NOTICE '010 dedup pending: % users / % rows.', pending_dupe_users, pending_dupe_rows;
    END IF;
    IF pending_dupe_rows IS NOT NULL AND pending_dupe_rows > 100 THEN
        RAISE EXCEPTION 'Too many duplicate pending withdrawals (%) to auto-remediate.', pending_dupe_rows
            USING HINT = 'Manual review: SELECT user_id, COUNT(*) FROM withdrawal_requests WHERE status=''pending'' GROUP BY user_id HAVING COUNT(*)>1;';
    END IF;
END $$;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
      FROM withdrawal_requests
     WHERE status = 'pending'
),
cancelled AS (
    UPDATE withdrawal_requests wr
       SET status     = 'cancelled',
           updated_at = NOW(),
           admin_note = COALESCE(wr.admin_note, '') || E'\n[auto-remediate 010] duplicate pending cancelled by migration 010'
      FROM ranked r
     WHERE wr.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS cancelled_pending_duplicates FROM cancelled;

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_requests_one_pending_per_user
    ON withdrawal_requests (user_id)
    WHERE status = 'pending';

DO $$
DECLARE
    dup_tc INTEGER;
BEGIN
    SELECT INTO dup_tc COUNT(*) FILTER (WHERE n > 1) FROM (
        SELECT paystack_transfer_code, COUNT(*) AS n
          FROM withdrawal_requests
         WHERE paystack_transfer_code IS NOT NULL
         GROUP BY paystack_transfer_code
    ) t;

    IF dup_tc IS NOT NULL AND dup_tc > 0 THEN
        RAISE NOTICE '010 dedup transfer_code: % duplicates.', dup_tc;
    END IF;
    IF dup_tc IS NOT NULL AND dup_tc > 50 THEN
        RAISE EXCEPTION 'Too many duplicate paystack_transfer_code (%) to auto-remediate.', dup_tc;
    END IF;
END $$;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY paystack_transfer_code ORDER BY created_at ASC, id ASC) AS rn
      FROM withdrawal_requests
     WHERE paystack_transfer_code IS NOT NULL
),
nulled AS (
    UPDATE withdrawal_requests wr
       SET paystack_transfer_code = NULL, updated_at = NOW()
      FROM ranked r
     WHERE wr.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS nulled_duplicate_transfer_codes FROM nulled;

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_requests_paystack_transfer_code
    ON withdrawal_requests (paystack_transfer_code)
    WHERE paystack_transfer_code IS NOT NULL;

DO $$
DECLARE
    dup_proofs INTEGER;
BEGIN
    SELECT INTO dup_proofs COUNT(*) FILTER (WHERE n > 1) FROM (
        SELECT user_id, reference, COUNT(*) AS n FROM payment_proofs GROUP BY user_id, reference
    ) t;

    IF dup_proofs IS NOT NULL AND dup_proofs > 0 THEN
        RAISE NOTICE '010 dedup payment_proofs: % duplicates.', dup_proofs;
    END IF;
    IF dup_proofs IS NOT NULL AND dup_proofs > 100 THEN
        RAISE EXCEPTION 'Too many duplicate payment proofs (%) to auto-remediate.', dup_proofs;
    END IF;
END $$;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, reference ORDER BY created_at DESC, id DESC) AS rn
      FROM payment_proofs
),
deleted AS (
    DELETE FROM payment_proofs pp USING ranked r
     WHERE pp.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS deleted_duplicate_payment_proofs FROM deleted;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_proofs_user_ref
    ON payment_proofs (user_id, reference);

COMMIT;
