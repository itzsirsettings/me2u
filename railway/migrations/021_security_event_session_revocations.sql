-- Allow session-revocation events to be recorded in security_events.
--
-- The post-PIN-save prompt can revoke either every other session or every
-- session including the caller's. Those are the highest-impact actions on the
-- Security page and were the only controls there that left no audit trail.
--
-- 002_complete_schema.sql declared `type` as text with an inline CHECK, so the
-- constraint is dropped and recreated with the two additional values.

ALTER TABLE public.security_events
  DROP CONSTRAINT IF EXISTS security_events_type_check;

ALTER TABLE public.security_events
  ADD CONSTRAINT security_events_type_check
  CHECK (type IN (
    'wallet_frozen',
    'wallet_unfrozen',
    'fraud_reported',
    'recovery_requested',
    'trusted_device_reviewed',
    'session_reviewed',
    'mfa_started',
    'sessions_revoked_others',
    'sessions_revoked_all'
  ));
