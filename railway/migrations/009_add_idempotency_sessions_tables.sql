-- =====================================================================
-- RAILWAY MIGRATION 009 · Idempotency + Session tables + Profile auth hardening cols
-- Mirror of migrations/20260918000001_add_idempotency_sessions_tables.sql
-- =====================================================================

BEGIN;

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

CREATE TABLE IF NOT EXISTS processed_webhook_events (
    provider    TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    event_type  TEXT,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, event_id)
);

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS failed_pin_attempts SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS last_pin_attempt_at TIMESTAMPTZ;

COMMIT;
