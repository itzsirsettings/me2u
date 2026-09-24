-- Loan minimum copy cleanup
begin;

alter table public.profiles
  add column if not exists loan_minimum_notice text;

create table if not exists public.loan_minimum_requirements (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14,2) not null default 5000.00 check (amount >= 5000.00),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Loans start from NGN 5,000 and amounts below 5000.00 are rejected.';

commit;
