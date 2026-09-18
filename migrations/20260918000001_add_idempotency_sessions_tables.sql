-- =====================================================================
-- TASK 1 · Idempotency + Session tables + Profile auth hardening cols
-- =====================================================================
-- All objects use IF NOT EXISTS so applying twice is exit-code-0 safe.
-- Postgres 18 compatible: no LANGUAGE plpgsql issues; plain DDL +
-- DO block EXCEPTION guards for IF-NOT-EXISTS-style idempotency where
-- PG natively lacks the modifier (e.g. CREATE INDEX CONCURRENTLY not used).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1.1  request_idempotency
--      PK = (user_id, key)  — prevents the same key being replayed
--      across routes for a user. route/method cached so replays can be
--      rejected if the (user,key) pair arrives on a wrong endpoint.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_idempotency (
    user_id       UUID NOT NULL,
    key           TEXT NOT NULL,
    route         TEXT NOT NULL,
    method        TEXT NOT NULL,
    status_code   SMALLINT,
    response_jsonb JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_expires_at
    ON request_idempotency (expires_at);

COMMENT ON TABLE request_idempotency IS 'Financial POST idempotency cache — 24h TTL, cleaned by batch sweep.';

-- ---------------------------------------------------------------------
-- 1.2  auth_sessions
--      Row-per-login.  Enables JWT revocation per-session (revoked_at)
--      and per-user bulk revocation via password_changed_at.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    jwt_id       TEXT UNIQUE,
    user_agent   TEXT,
    ip           INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
    ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
    ON auth_sessions (expires_at);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE auth_sessions
            ADD CONSTRAINT auth_sessions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1.3  processed_webhook_events
--      PK = (provider, event_id)  — at-least-once delivery dedup for
--      Paystack and any future provider webhook.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    provider    TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    event_type  TEXT,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, event_id)
);

COMMENT ON TABLE processed_webhook_events IS 'Webhook at-least-once dedup.  Provider = paystack / vtpass / resend.';

-- ---------------------------------------------------------------------
-- 1.4  Authentication-hardening columns on profiles
--      All default-safe; existing rows continue to work.
-- ---------------------------------------------------------------------
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS failed_pin_attempts SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS last_pin_attempt_at TIMESTAMPTZ;

COMMIT;
