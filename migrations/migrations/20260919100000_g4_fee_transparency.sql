-- ============================================================
-- G4/G5: Fee transparency + cron health (idempotent, safe to re-run)
--
-- 1. revenue_event_type 'withdrawal_processor_cost':
--    Books the Paystack 1.5% processor cost charged to the user on each
--    withdrawal as a separate platform revenue/cost event. Cost-visibility
--    only — no wallet movement is derived from this event.
-- 2. cron_runs heartbeat table:
--    Last-run/last-error tracking for /api/cron/* routes so operators can
--    detect silent cron failures (e.g. "did the unlock cron run last hour?").
-- ============================================================

do $$ begin
  alter type public.revenue_event_type add value if not exists 'withdrawal_processor_cost';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.cron_runs (
  job_name text primary key,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_status text check (last_status in ('running', 'success', 'failed')),
  last_run_count integer not null default 0,
  last_error text,
  total_runs bigint not null default 0,
  total_failures bigint not null default 0,
  updated_at timestamptz not null default now()
);