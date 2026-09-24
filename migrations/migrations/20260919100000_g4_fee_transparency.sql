-- G4/G5 fee transparency and cron health
begin;

do $$
begin
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

commit;
