-- Wema banking rails
begin;

do $$
begin
  create type public.wallet_ledger_source as enum (
    'deposit', 'loan', 'bill_payment', 'repayment', 'admin_adjustment',
    'withdrawal', 'referral', 'bank_transfer', 'transfer'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.virtual_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'wema',
  account_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_inflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric(14,2) not null default 0,
  provider text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create or replace function private.me2u_credit_wallet_inflow()
returns void
language plpgsql
as $$
begin
  null;
end;
$$;

commit;
