-- =====================================================================
-- TASK G7 · Money-path invariants (webhook dedup + app idempotency cache)
-- =====================================================================
-- Applied as `railway/migrations/014_money_path_invariants.sql` too — keep both
-- copies byte-identical (that mirror layout is the repo convention for 009-013).
--
-- 7.1  provider_webhooks: UNIQUE (provider, reference)
--      Both provider webhook routes deduped with COUNT-then-INSERT, which two
--      concurrent deliveries of the same event both pass -> the credit ran twice.
--      The unique index turns the INSERT itself into the lock:
--      `ON CONFLICT DO NOTHING RETURNING id` yields a row exactly once.
-- 7.2  api_idempotency_cache: replay cache for the `Idempotency-Key` header.
--      NOTE ON `request_idempotency`: migration 20260918000001 creates it with
--      PK (user_id, key) + status_code/response_jsonb, while
--      lib/server/idempotency.ts used to issue its own
--      `CREATE TABLE IF NOT EXISTS request_idempotency` with PK (key) +
--      status/body.  On a database where the migration ran first, every app
--      SELECT/INSERT referenced columns that did not exist, the errors were
--      swallowed, and replay protection silently did nothing.  The app now owns
--      this separate table, so both shapes can coexist without ambiguity.
-- 7.3  withdrawal_requests: sweep index for the reconciliation cron.
--      The status vocabulary is the enum public.withdrawal_request_status:
--        pending | approved | rejected | processing | success | failed
--        | reversed | cancelled
--      ('initiated' / 'successful' are NOT members — writing them raises 22P02,
--      which is what quietly killed the Paystack transfer handlers.)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 7.0  Pre-requisite: provider_webhooks exists (older installs may lack it)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_webhooks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider   text NOT NULL,
    event_type text,
    reference  text,
    payload    jsonb NOT NULL DEFAULT '{}',
    processed  boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 7.1  provider_webhooks: one row per (provider, reference)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    dup_rows INTEGER;
BEGIN
    SELECT COUNT(*) FILTER (WHERE n > 1)
      INTO dup_rows
      FROM (
        SELECT provider, reference, COUNT(*) AS n
          FROM provider_webhooks
         WHERE reference IS NOT NULL
         GROUP BY provider, reference
      ) t;

    IF dup_rows IS NOT NULL AND dup_rows > 0 THEN
        RAISE NOTICE 'G7.1 dedup: % duplicate (provider, reference) webhook rows — keeping newest.', dup_rows;
    END IF;
END $$;

-- Keep the newest row per (provider, reference); duplicates are the very bug we
-- are removing and carry no foreign keys.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY provider, reference
             ORDER BY created_at DESC, id DESC
           ) AS rn
      FROM provider_webhooks
     WHERE reference IS NOT NULL
),
deleted AS (
    DELETE FROM provider_webhooks pw
     USING ranked r
     WHERE pw.id = r.id AND r.rn > 1
     RETURNING 1
)
SELECT COUNT(*) AS deleted_duplicate_webhook_rows FROM deleted;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_webhooks_provider_reference
    ON provider_webhooks (provider, reference);

-- ---------------------------------------------------------------------
-- 7.2  api_idempotency_cache (owned exclusively by lib/server/idempotency.ts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_idempotency_cache (
    key        TEXT PRIMARY KEY,
    user_id    TEXT,
    route      TEXT NOT NULL,
    status     INTEGER NOT NULL DEFAULT 200,
    body       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_cache_created_at
    ON api_idempotency_cache (created_at);

COMMENT ON TABLE api_idempotency_cache IS
    'Financial POST idempotency replay cache (Idempotency-Key header), 24h TTL. Distinct from request_idempotency.';

-- ---------------------------------------------------------------------
-- 7.3  withdrawal_requests: in-flight sweep index
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_in_flight
    ON withdrawal_requests (status, created_at)
    WHERE status IN ('pending', 'processing');

COMMIT;