-- =====================================================================
-- TASK 2 · Financial UNIQUE invariants
-- =====================================================================
-- Three partial/full UNIQUE indexes that eliminate money-safety races
-- at the database layer (defense in depth beyond app-level FOR UPDATE).
--
-- BEFORE each index we run a safe dedup CTE so the CREATE INDEX never
-- fails with 23505 on an already-provisioned database.  If the number
-- of duplicates we would have to destroy exceeds a small safety
-- threshold we RAISE EXCEPTION with a HINT — human must decide.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Pre-requisite: ensure 'cancelled' enum value exists on
-- withdrawal_request_status BEFORE any UPDATE SET status='cancelled'
-- below.  Matches the pg_enum IF NOT EXISTS pattern used by
-- RAILWAY_MIGRATION.sql for the processing/success/failed/reversed
-- enum additions (defense against 22P02 invalid_text_representation).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 2.1  One-pending-withdrawal-per-user
-- ---------------------------------------------------------------------
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
        RAISE NOTICE 'TASK 2.1 dedup: % users hold % duplicate pending withdrawal rows — cancelling all but newest-per-user.',
            pending_dupe_users, pending_dupe_rows;
    END IF;

    IF pending_dupe_rows IS NOT NULL AND pending_dupe_rows > 100 THEN
        RAISE EXCEPTION 'Too many duplicate pending withdrawals to auto-remediate (n=%). Manual review required.', pending_dupe_rows
            USING HINT = 'SELECT user_id, COUNT(*) FROM withdrawal_requests WHERE status=''pending'' GROUP BY user_id HAVING COUNT(*)>1 ORDER BY 2 DESC;';
    END IF;
END $$;

-- Cancel every pending duplicate except the single newest per user
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
      FROM withdrawal_requests
     WHERE status = 'pending'
),
cancelled AS (
    UPDATE withdrawal_requests wr
       SET status    = 'cancelled',
           updated_at = NOW(),
           admin_note = COALESCE(wr.admin_note, '') || E'\n[auto-remediate task 2.1] duplicate pending, cancelled by 20260918000002 migration'
      FROM ranked r
     WHERE wr.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS cancelled_pending_duplicates FROM cancelled;

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_requests_one_pending_per_user
    ON withdrawal_requests (user_id)
    WHERE status = 'pending';

-- ---------------------------------------------------------------------
-- 2.2  Unique paystack_transfer_code (when non-null)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    dup_tc INTEGER;
BEGIN
    SELECT INTO dup_tc
        COUNT(*) FILTER (WHERE n > 1)
    FROM (
        SELECT paystack_transfer_code, COUNT(*) AS n
          FROM withdrawal_requests
         WHERE paystack_transfer_code IS NOT NULL
         GROUP BY paystack_transfer_code
    ) t;

    IF dup_tc IS NOT NULL AND dup_tc > 0 THEN
        RAISE NOTICE 'TASK 2.2 dedup: % duplicate non-null paystack_transfer_code values — nulling all but oldest-per-code.';
    END IF;

    IF dup_tc IS NOT NULL AND dup_tc > 50 THEN
        RAISE EXCEPTION 'Too many duplicate paystack_transfer_code (n=%). Manual review required.', dup_tc
            USING HINT = 'SELECT paystack_transfer_code, COUNT(*) FROM withdrawal_requests WHERE paystack_transfer_code IS NOT NULL GROUP BY 1 HAVING COUNT(*)>1;';
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
       SET paystack_transfer_code = NULL,
           updated_at = NOW()
      FROM ranked r
     WHERE wr.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS nulled_duplicate_transfer_codes FROM nulled;

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_requests_paystack_transfer_code
    ON withdrawal_requests (paystack_transfer_code)
    WHERE paystack_transfer_code IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2.3  Unique (user, reference) on payment_proofs
-- ---------------------------------------------------------------------
DO $$
DECLARE
    dup_proofs INTEGER;
BEGIN
    SELECT INTO dup_proofs
        COUNT(*) FILTER (WHERE n > 1)
    FROM (
        SELECT user_id, reference, COUNT(*) AS n
          FROM payment_proofs
         GROUP BY user_id, reference
    ) t;

    IF dup_proofs IS NOT NULL AND dup_proofs > 0 THEN
        RAISE NOTICE 'TASK 2.3 dedup: % duplicate (user_id, reference) payment_proof rows.';
    END IF;

    IF dup_proofs IS NOT NULL AND dup_proofs > 100 THEN
        RAISE EXCEPTION 'Too many duplicate payment proofs (n=%). Manual review required.', dup_proofs
            USING HINT = 'SELECT user_id, reference, COUNT(*) FROM payment_proofs GROUP BY 1,2 HAVING COUNT(*)>1;';
    END IF;
END $$;

-- Keep newest per (user, ref); delete older duplicates (they're redundant, never referenced by FK)
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, reference ORDER BY created_at DESC, id DESC) AS rn
      FROM payment_proofs
),
deleted AS (
    DELETE FROM payment_proofs pp
      USING ranked r
     WHERE pp.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS deleted_duplicate_payment_proofs FROM deleted;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_proofs_user_ref
    ON payment_proofs (user_id, reference);

COMMIT;
