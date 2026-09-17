-- Me2U Complete Database Migration
-- Generated: 09/16/2026 19:32:35
-- Total migrations: 35



-- ============================================================
-- Migration: 20260514000000_initial_me2u_schema.sql
-- ============================================================

create extension if not exists pgcrypto;

create type public.transaction_type as enum (
  'deposit',
  'withdrawal',
  'loan_disbursed',
  'loan_repayment',
  'investment',
  'repayment_received'
);

create type public.marketplace_item_type as enum (
  'borrow_request',
  'lending_offer'
);

create type public.marketplace_status as enum (
  'active',
  'funded',
  'cancelled'
);

create type public.loan_status as enum (
  'active',
  'completed'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  nin_hash text not null unique,
  nin_last4 text not null,
  kyc_verified boolean not null default false,
  trust_score integer not null default 85 check (trust_score between 0 and 100),
  bank_name text,
  account_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  locked numeric(14, 2) not null default 0 check (locked >= 0),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  type public.marketplace_item_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  rate numeric(6, 2) not null check (rate > 0),
  days integer not null check (days > 0),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  trust_score integer not null default 85 check (trust_score between 0 and 100),
  status public.marketplace_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  rate numeric(6, 2) not null check (rate > 0),
  days integer not null check (days > 0),
  status public.loan_status not null default 'active',
  start_date timestamptz not null default now(),
  due_date timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.loans enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.wallets to authenticated;
grant select, insert on public.transactions to authenticated;
grant select, insert, update on public.marketplace_items to authenticated;
grant select, insert, update on public.loans to authenticated;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read own wallet"
on public.wallets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update own wallet"
on public.wallets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read own transactions"
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own transactions"
on public.transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can read active marketplace"
on public.marketplace_items
for select
to authenticated
using (status = 'active' or author_id = (select auth.uid()));

create policy "Users can create own marketplace listings"
on public.marketplace_items
for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Users can fund active marketplace listings"
on public.marketplace_items
for update
to authenticated
using (status = 'active')
with check (status in ('funded', 'cancelled'));

create policy "Users can read own loans"
on public.loans
for select
to authenticated
using (
  (select auth.uid()) = borrower_id
  or (select auth.uid()) = lender_id
);

create policy "Users can create loans they participate in"
on public.loans
for insert
to authenticated
with check (
  (select auth.uid()) = borrower_id
  or (select auth.uid()) = lender_id
);

create policy "Borrowers can mark own loan complete"
on public.loans
for update
to authenticated
using ((select auth.uid()) = borrower_id)
with check ((select auth.uid()) = borrower_id);

create index profiles_nin_hash_idx on public.profiles(nin_hash);
create index transactions_user_id_created_at_idx on public.transactions(user_id, created_at desc);
create index marketplace_items_status_created_at_idx on public.marketplace_items(status, created_at desc);
create index loans_borrower_id_idx on public.loans(borrower_id);
create index loans_lender_id_idx on public.loans(lender_id);


-- ============================================================
-- Migration: 20260515000000_secure_financial_operations.sql
-- ============================================================

create schema if not exists private;

alter table public.profiles
add column if not exists registration_payment_reference text;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

revoke update on public.profiles from authenticated;
revoke insert, update on public.wallets from authenticated;
revoke insert on public.transactions from authenticated;
revoke insert, update on public.marketplace_items from authenticated;
revoke insert, update on public.loans from authenticated;

grant select on public.profiles to authenticated;
grant select on public.wallets to authenticated;
grant select on public.transactions to authenticated;
grant select on public.marketplace_items to authenticated;
grant select on public.loans to authenticated;
grant all on public.profiles to service_role;
grant all on public.wallets to service_role;
grant all on public.transactions to service_role;
grant all on public.marketplace_items to service_role;
grant all on public.loans to service_role;

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own wallet" on public.wallets;
drop policy if exists "Users can create own transactions" on public.transactions;
drop policy if exists "Users can create own marketplace listings" on public.marketplace_items;
drop policy if exists "Users can fund active marketplace listings" on public.marketplace_items;
drop policy if exists "Users can create loans they participate in" on public.loans;
drop policy if exists "Borrowers can mark own loan complete" on public.loans;

create or replace function private.me2u_fund_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  update public.wallets
  set balance = balance + round(p_amount, 2)
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'deposit',
    round(p_amount, 2),
    'Wallet Funding via Bank Transfer'
  );
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  update public.wallets
  set balance = balance - round(p_amount, 2)
  where user_id = p_user_id
    and balance >= round(p_amount, 2);

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    round(p_amount, 2),
    'Withdrawal to Bank Account'
  );
end;
$$;

create or replace function private.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author_name text;
  v_trust_score integer;
begin
  if p_amount is null or p_amount < 1000 then
    raise exception 'Amount must be at least 1000.';
  end if;

  if p_rate is null or p_rate <= 0 or p_rate > 50 then
    raise exception 'Interest rate must be between 1 and 50 percent.';
  end if;

  if p_days is null or p_days < 7 or p_days > 365 then
    raise exception 'Duration must be between 7 and 365 days.';
  end if;

  select first_name, trust_score
  into v_author_name, v_trust_score
  from public.profiles
  where id = p_user_id
    and kyc_verified = true;

  if v_author_name is null then
    raise exception 'Verified profile not found.';
  end if;

  insert into public.marketplace_items (
    type,
    amount,
    rate,
    days,
    author_id,
    author_name,
    trust_score,
    status
  )
  values (
    p_type,
    round(p_amount, 2),
    round(p_rate, 2),
    p_days,
    p_user_id,
    v_author_name,
    v_trust_score,
    'active'
  );
end;
$$;

create or replace function private.me2u_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.marketplace_items%rowtype;
  v_amount numeric;
  v_borrower_id uuid;
  v_lender_id uuid;
  v_updated integer;
begin
  select *
  into v_item
  from public.marketplace_items
  where id = p_item_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Marketplace listing is no longer available.';
  end if;

  if v_item.author_id = p_user_id then
    raise exception 'You cannot accept your own listing.';
  end if;

  v_amount := round(v_item.amount, 2);

  if v_item.type = 'borrow_request' then
    v_borrower_id := v_item.author_id;
    v_lender_id := p_user_id;
  else
    v_borrower_id := p_user_id;
    v_lender_id := v_item.author_id;
  end if;

  update public.wallets
  set balance = balance - v_amount,
      locked = locked + v_amount
  where user_id = v_lender_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender has insufficient available balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = v_borrower_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Borrower wallet not found.';
  end if;

  update public.marketplace_items
  set status = 'funded'
  where id = v_item.id;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    v_item.rate,
    v_item.days,
    v_borrower_id,
    v_lender_id,
    'active',
    now() + make_interval(days => v_item.days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values
    (v_lender_id, 'investment', v_amount, 'Funded peer loan'),
    (v_borrower_id, 'loan_disbursed', v_amount, 'Loan disbursed to wallet');
end;
$$;

create or replace function private.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan public.loans%rowtype;
  v_repayment_amount numeric;
  v_updated integer;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and borrower_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'This loan cannot be repaid from this account.';
  end if;

  v_repayment_amount := round(v_loan.amount + ((v_loan.amount * v_loan.rate) / 100), 2);

  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

  update public.wallets
  set locked = locked - v_loan.amount,
      balance = balance + v_repayment_amount
  where user_id = v_loan.lender_id
    and locked >= v_loan.amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender locked balance is inconsistent.';
  end if;

  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  insert into public.transactions (user_id, type, amount, description)
  values
    (p_user_id, 'loan_repayment', v_repayment_amount, 'Loan Repayment (Principal + Interest)'),
    (v_loan.lender_id, 'repayment_received', v_repayment_amount, 'Loan repayment received');
end;
$$;

create or replace function public.me2u_fund_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_fund_wallet(p_user_id, p_amount);
$$;

create or replace function public.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_withdraw_wallet(p_user_id, p_amount);
$$;

create or replace function public.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_create_marketplace_item(
    p_user_id,
    p_type,
    p_amount,
    p_rate,
    p_days
  );
$$;

create or replace function public.me2u_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_accept_marketplace_item(p_user_id, p_item_id);
$$;

create or replace function public.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_repay_loan(p_user_id, p_loan_id);
$$;

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;
grant execute on all functions in schema private to service_role;

revoke execute on function public.me2u_fund_wallet(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.me2u_withdraw_wallet(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) from public, anon, authenticated;
revoke execute on function public.me2u_accept_marketplace_item(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.me2u_repay_loan(uuid, uuid) from public, anon, authenticated;

grant execute on function public.me2u_fund_wallet(uuid, numeric) to service_role;
grant execute on function public.me2u_withdraw_wallet(uuid, numeric) to service_role;
grant execute on function public.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) to service_role;
grant execute on function public.me2u_accept_marketplace_item(uuid, uuid) to service_role;
grant execute on function public.me2u_repay_loan(uuid, uuid) to service_role;


-- ============================================================
-- Migration: 20260516000000_enforce_withdrawal_retained_deposit.sql
-- ============================================================

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);

  update public.wallets
  set balance = balance - v_withdrawal_amount
  where user_id = p_user_id
    and balance >= v_withdrawal_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );
end;
$$;


-- ============================================================
-- Migration: 20260516001000_defer_nin_use_supabase_auth.sql
-- ============================================================

alter table public.profiles
alter column nin_hash drop not null,
alter column nin_last4 drop not null;

create or replace function private.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author_name text;
  v_trust_score integer;
begin
  if p_amount is null or p_amount < 1000 then
    raise exception 'Amount must be at least 1000.';
  end if;

  if p_rate is null or p_rate <= 0 or p_rate > 50 then
    raise exception 'Interest rate must be between 1 and 50 percent.';
  end if;

  if p_days is null or p_days < 7 or p_days > 365 then
    raise exception 'Duration must be between 7 and 365 days.';
  end if;

  select first_name, trust_score
  into v_author_name, v_trust_score
  from public.profiles
  where id = p_user_id;

  if v_author_name is null then
    raise exception 'Profile not found.';
  end if;

  insert into public.marketplace_items (
    type,
    amount,
    rate,
    days,
    author_id,
    author_name,
    trust_score,
    status
  )
  values (
    p_type,
    round(p_amount, 2),
    round(p_rate, 2),
    p_days,
    p_user_id,
    v_author_name,
    v_trust_score,
    'active'
  );
end;
$$;


-- ============================================================
-- Migration: 20260516002000_registration_reference_flow.sql
-- ============================================================

alter table public.profiles
add column if not exists username text,
add column if not exists referral_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[A-Za-z0-9]{3,30}$');
  end if;
end;
$$;

create unique index if not exists profiles_username_lower_unique_idx
on public.profiles (lower(username))
where username is not null;


-- ============================================================
-- Migration: 20260516003000_platform_loan_rules.sql
-- ============================================================

alter table public.loans
alter column lender_id drop not null;

alter table public.loans
drop constraint if exists loans_rate_check;

alter table public.loans
add constraint loans_rate_check check (rate >= 0);

create index if not exists loans_platform_borrower_status_idx
on public.loans (borrower_id, status, created_at desc)
where lender_id is null;

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prior_platform_loans integer;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_retained_deposit numeric(14, 2);
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
begin
  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active platform loan before requesting another one.';
  end if;

  select count(*)
  into v_prior_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null;

  if v_prior_platform_loans = 0 then
    v_amount := 2000.00;

    if p_amount is not null and round(p_amount, 2) <> v_amount then
      raise exception 'Your first platform loan is fixed at NGN 2,000.';
    end if;

    v_retained_deposit := 0.00;
  else
    v_amount := coalesce(round(p_amount, 2), 10000.00);

    if v_amount < 10000.00 then
      raise exception 'Second and later platform loans start from NGN 10,000.';
    end if;

    v_retained_deposit := round(v_amount * 0.50, 2);

    if v_wallet_balance < v_retained_deposit then
      v_shortfall := round(v_retained_deposit - v_wallet_balance, 2);
      raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.',
        v_shortfall,
        v_retained_deposit;
    end if;
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    30,
    p_user_id,
    null,
    'active',
    now() + make_interval(days => 30)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    case
      when v_prior_platform_loans = 0 then 'First platform loan disbursed'
      else 'Platform loan disbursed with 50% retained wallet condition'
    end
  );
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_platform_retained_deposit numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);

  select coalesce(sum(round(amount * 0.5, 2)), 0)
  into v_platform_retained_deposit
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active'
    and amount >= 10000.00;

  update public.wallets
  set balance = balance - v_withdrawal_amount
  where user_id = p_user_id
    and balance >= (v_withdrawal_amount + v_platform_retained_deposit);

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient available balance. The active platform loan deposit must remain in your wallet.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );
end;
$$;

create or replace function private.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan public.loans%rowtype;
  v_repayment_amount numeric;
  v_updated integer;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and borrower_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'This loan cannot be repaid from this account.';
  end if;

  v_repayment_amount := round(v_loan.amount + ((v_loan.amount * v_loan.rate) / 100), 2);

  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

  if v_loan.lender_id is not null then
    update public.wallets
    set locked = locked - v_loan.amount,
        balance = balance + v_repayment_amount
    where user_id = v_loan.lender_id
      and locked >= v_loan.amount;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Lender locked balance is inconsistent.';
    end if;
  end if;

  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_repayment',
    v_repayment_amount,
    case
      when v_loan.lender_id is null then 'Platform loan repayment'
      else 'Loan Repayment (Principal + Interest)'
    end
  );

  if v_loan.lender_id is not null then
    insert into public.transactions (user_id, type, amount, description)
    values (
      v_loan.lender_id,
      'repayment_received',
      v_repayment_amount,
      'Loan repayment received'
    );
  end if;
end;
$$;

create or replace function public.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_request_platform_loan(p_user_id, p_amount);
$$;

revoke execute on function private.me2u_request_platform_loan(uuid, numeric) from public, anon, authenticated;
grant execute on function private.me2u_request_platform_loan(uuid, numeric) to service_role;

revoke execute on function public.me2u_request_platform_loan(uuid, numeric) from public, anon, authenticated;
grant execute on function public.me2u_request_platform_loan(uuid, numeric) to service_role;


-- ============================================================
-- Migration: 20260516004000_onboarding_affiliate_zero_interest.sql
-- ============================================================

alter type public.transaction_type add value if not exists 'affiliate_reward';

alter table public.profiles
add column if not exists registration_deposit_paid boolean not null default false,
add column if not exists registration_deposit_amount numeric(14, 2) not null default 0 check (registration_deposit_amount >= 0),
add column if not exists registration_deposit_confirmed_at timestamptz,
add column if not exists referred_by uuid references public.profiles(id) on delete set null,
add column if not exists affiliate_earnings numeric(14, 2) not null default 0 check (affiliate_earnings >= 0);

create index if not exists profiles_referred_by_idx
on public.profiles (referred_by)
where referred_by is not null;

create table if not exists public.affiliate_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);

alter table public.affiliate_rewards enable row level security;

grant select on public.affiliate_rewards to authenticated;
grant all on public.affiliate_rewards to service_role;

drop policy if exists "Users can read own affiliate rewards" on public.affiliate_rewards;
create policy "Users can read own affiliate rewards"
on public.affiliate_rewards
for select
to authenticated
using (
  (select auth.uid()) = referrer_id
  or (select auth.uid()) = referred_user_id
);

alter table public.marketplace_items
drop constraint if exists marketplace_items_rate_check;

alter table public.marketplace_items
add constraint marketplace_items_rate_check check (rate >= 0);

create or replace function private.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author_name text;
  v_trust_score integer;
begin
  if p_amount is null or p_amount < 1000 then
    raise exception 'Amount must be at least 1000.';
  end if;

  if p_days is null or p_days < 7 or p_days > 365 then
    raise exception 'Duration must be between 7 and 365 days.';
  end if;

  select first_name, trust_score
  into v_author_name, v_trust_score
  from public.profiles
  where id = p_user_id;

  if v_author_name is null then
    raise exception 'Profile not found.';
  end if;

  insert into public.marketplace_items (
    type,
    amount,
    rate,
    days,
    author_id,
    author_name,
    trust_score,
    status
  )
  values (
    p_type,
    round(p_amount, 2),
    0,
    p_days,
    p_user_id,
    v_author_name,
    v_trust_score,
    'active'
  );
end;
$$;

create or replace function private.me2u_confirm_registration_deposit(
  p_user_id uuid,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_reference text;
  v_registration_deposit numeric(14, 2) := 2000.00;
  v_first_loan_amount numeric(14, 2) := 2000.00;
  v_affiliate_reward numeric(14, 2) := 500.00;
  v_prior_platform_loans integer;
  v_reward_exists boolean;
  v_updated integer;
begin
  v_reference := nullif(trim(coalesce(p_reference, '')), '');

  if v_reference is null or length(v_reference) < 4 or length(v_reference) > 120 then
    raise exception 'Enter a valid payment reference.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if v_profile.registration_deposit_paid then
    raise exception 'Registration deposit has already been confirmed.';
  end if;

  update public.profiles
  set registration_deposit_paid = true,
      registration_deposit_amount = v_registration_deposit,
      registration_payment_reference = v_reference,
      registration_deposit_confirmed_at = now()
  where id = p_user_id;

  select count(*)
  into v_prior_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null;

  if v_prior_platform_loans = 0 then
    update public.wallets
    set balance = balance + v_first_loan_amount
    where user_id = p_user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Wallet not found.';
    end if;

    insert into public.loans (
      amount,
      rate,
      days,
      borrower_id,
      lender_id,
      status,
      due_date
    )
    values (
      v_first_loan_amount,
      0,
      30,
      p_user_id,
      null,
      'active',
      now() + make_interval(days => 30)
    );

    insert into public.transactions (user_id, type, amount, description)
    values (
      p_user_id,
      'loan_disbursed',
      v_first_loan_amount,
      'First platform loan disbursed after registration deposit'
    );
  end if;

  if v_profile.referred_by is not null then
    select exists (
      select 1
      from public.affiliate_rewards
      where referred_user_id = p_user_id
    )
    into v_reward_exists;

    if not v_reward_exists then
      update public.wallets
      set balance = balance + v_affiliate_reward
      where user_id = v_profile.referred_by;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'Referrer wallet not found.';
      end if;

      update public.profiles
      set affiliate_earnings = affiliate_earnings + v_affiliate_reward
      where id = v_profile.referred_by;

      insert into public.affiliate_rewards (
        referrer_id,
        referred_user_id,
        amount
      )
      values (
        v_profile.referred_by,
        p_user_id,
        v_affiliate_reward
      );

      insert into public.transactions (user_id, type, amount, description)
      values (
        v_profile.referred_by,
        'affiliate_reward',
        v_affiliate_reward,
        'Affiliate reward from direct referral onboarding'
      );
    end if;
  end if;
end;
$$;

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration_deposit_paid boolean;
  v_prior_platform_loans integer;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_retained_deposit numeric(14, 2);
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
begin
  select registration_deposit_paid
  into v_registration_deposit_paid
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active platform loan before requesting another one.';
  end if;

  select count(*)
  into v_prior_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null;

  if v_prior_platform_loans = 0 then
    if not v_registration_deposit_paid then
      raise exception 'Confirm your NGN 2,000 registration deposit before the first NGN 2,000 loan.';
    end if;

    v_amount := 2000.00;

    if p_amount is not null and round(p_amount, 2) <> v_amount then
      raise exception 'Your first platform loan is fixed at NGN 2,000.';
    end if;

    v_retained_deposit := 0.00;
  else
    v_amount := coalesce(round(p_amount, 2), 10000.00);

    if v_amount < 10000.00 then
      raise exception 'Second and later platform loans start from NGN 10,000.';
    end if;

    v_retained_deposit := round(v_amount * 0.50, 2);

    if v_wallet_balance < v_retained_deposit then
      v_shortfall := round(v_retained_deposit - v_wallet_balance, 2);
      raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.',
        v_shortfall,
        v_retained_deposit;
    end if;
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    30,
    p_user_id,
    null,
    'active',
    now() + make_interval(days => 30)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    case
      when v_prior_platform_loans = 0 then 'First platform loan disbursed'
      else 'Platform loan disbursed with 50% retained wallet condition'
    end
  );
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_registration_deposit_paid boolean;
  v_platform_retained_deposit numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select registration_deposit_paid
  into v_registration_deposit_paid
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before withdrawal.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);

  select coalesce(sum(round(amount * 0.5, 2)), 0)
  into v_platform_retained_deposit
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active'
    and amount >= 10000.00;

  update public.wallets
  set balance = balance - v_withdrawal_amount
  where user_id = p_user_id
    and balance >= (v_withdrawal_amount + v_platform_retained_deposit);

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient available balance. The active platform loan deposit must remain in your wallet.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );
end;
$$;

create or replace function public.me2u_confirm_registration_deposit(
  p_user_id uuid,
  p_reference text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_confirm_registration_deposit(p_user_id, p_reference);
$$;

revoke execute on function private.me2u_confirm_registration_deposit(uuid, text) from public, anon, authenticated;
grant execute on function private.me2u_confirm_registration_deposit(uuid, text) to service_role;

revoke execute on function public.me2u_confirm_registration_deposit(uuid, text) from public, anon, authenticated;
grant execute on function public.me2u_confirm_registration_deposit(uuid, text) to service_role;


-- ============================================================
-- Migration: 20260516005000_platform_account_wallet_funding.sql
-- ============================================================

create or replace function private.me2u_fund_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount numeric(14, 2);
  v_reference text;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  v_reference := nullif(trim(coalesce(p_reference, '')), '');

  if v_reference is null or length(v_reference) < 4 or length(v_reference) > 120 then
    raise exception 'Enter a valid payment reference.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'deposit',
    v_amount,
    'Wallet funding via platform account transfer: ' || v_reference
  );
end;
$$;

create or replace function public.me2u_fund_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_fund_wallet(p_user_id, p_amount, p_reference);
$$;

revoke execute on function private.me2u_fund_wallet(uuid, numeric, text) from public, anon, authenticated;
grant execute on function private.me2u_fund_wallet(uuid, numeric, text) to service_role;

revoke execute on function public.me2u_fund_wallet(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.me2u_fund_wallet(uuid, numeric, text) to service_role;


-- ============================================================
-- Migration: 20260516006000_kyc_and_peer_visibility.sql
-- ============================================================

-- Migration: KYC, Proof of Payment, and Notifications

-- 1. Add `passport_photo_url` and `role` to `profiles`
ALTER TABLE public.profiles
ADD COLUMN passport_photo_url text,
ADD COLUMN role text not null default 'user' check (role in ('user', 'admin'));

-- 2. Peer Profile Visibility Policy
-- Allow a user to select another user's profile if they are both involved in an active peer loan.
CREATE POLICY "Users can read peer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loans l
    WHERE l.status = 'active'
      AND l.lender_id IS NOT NULL
      AND (
        (l.borrower_id = auth.uid() AND l.lender_id = profiles.id)
        OR
        (l.lender_id = auth.uid() AND l.borrower_id = profiles.id)
      )
  )
);

-- 3. Create `payment_proofs` table
CREATE TYPE public.payment_proof_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_proof_type AS ENUM ('wallet_funding', 'registration_deposit');

CREATE TABLE public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  reference text not null,
  type public.payment_proof_type not null,
  receipt_image_url text not null,
  status public.payment_proof_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TRIGGER payment_proofs_set_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.payment_proofs TO authenticated;

CREATE POLICY "Users can read own payment proofs"
ON public.payment_proofs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment proofs"
ON public.payment_proofs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all payment proofs"
ON public.payment_proofs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update payment proofs"
ON public.payment_proofs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Create `notifications` table
CREATE TABLE public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Inserting notifications will typically be done by SECURITY DEFINER functions (RPCs)
-- triggered by admin actions or backend processes, so we do not grant raw insert to users.

-- 5. Storage Buckets for KYC and Receipts
-- In a real environment, Storage Buckets and policies must be created via SQL if migrating,
-- or manually in the Dashboard. We will create them via SQL here for completeness.
-- NOTE: Requires `storage` schema access. If running via local CLI, this works.
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT DO NOTHING;

-- Storage Policies for KYC
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read their own KYC documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all KYC documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Storage Policies for Receipts
CREATE POLICY "Users can upload their own receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read their own receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. RPC for Admin to Approve Payment Proofs
CREATE OR REPLACE FUNCTION public.admin_approve_payment_proof(p_proof_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proof public.payment_proofs%ROWTYPE;
  v_admin boolean;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO v_admin;
  IF NOT v_admin THEN
    RAISE EXCEPTION 'Only admins can approve payments.';
  END IF;

  SELECT * INTO v_proof FROM public.payment_proofs WHERE id = p_proof_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment proof not found.';
  END IF;

  IF v_proof.status != 'pending' THEN
    RAISE EXCEPTION 'Payment proof is not pending.';
  END IF;

  -- Update status
  UPDATE public.payment_proofs SET status = 'approved', updated_at = now() WHERE id = p_proof_id;

  -- Apply logic based on type
  IF v_proof.type = 'wallet_funding' THEN
    UPDATE public.wallets SET balance = balance + v_proof.amount, updated_at = now() WHERE user_id = v_proof.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  ELSIF v_proof.type = 'registration_deposit' THEN
    UPDATE public.profiles SET registration_deposit_paid = true, registration_deposit_amount = v_proof.amount, registration_deposit_confirmed_at = now(), updated_at = now() WHERE id = v_proof.user_id;
    -- Note: first platform loan is expected to be triggered elsewhere or added here, but for simplicity we rely on existing mechanisms or add it directly:
    PERFORM public.me2u_request_platform_loan(v_proof.user_id, 2000);
  END IF;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message) VALUES (v_proof.user_id, 'Payment Approved', 'Your payment of ?' || v_proof.amount || ' has been approved.');
END;
$$;



-- ============================================================
-- Migration: 20260516007000_notifications_for_loans.sql
-- ============================================================

-- Migration: Add notifications for loan acceptance and repayment

create or replace function private.me2u_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.marketplace_items%rowtype;
  v_amount numeric;
  v_borrower_id uuid;
  v_lender_id uuid;
  v_updated integer;
begin
  select *
  into v_item
  from public.marketplace_items
  where id = p_item_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Marketplace listing is no longer available.';
  end if;

  if v_item.author_id = p_user_id then
    raise exception 'You cannot accept your own listing.';
  end if;

  v_amount := round(v_item.amount, 2);

  if v_item.type = 'borrow_request' then
    v_borrower_id := v_item.author_id;
    v_lender_id := p_user_id;
  else
    v_borrower_id := p_user_id;
    v_lender_id := v_item.author_id;
  end if;

  update public.wallets
  set balance = balance - v_amount,
      locked = locked + v_amount
  where user_id = v_lender_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender has insufficient available balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = v_borrower_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Borrower wallet not found.';
  end if;

  update public.marketplace_items
  set status = 'funded'
  where id = v_item.id;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    v_item.rate,
    v_item.days,
    v_borrower_id,
    v_lender_id,
    'active',
    now() + make_interval(days => v_item.days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values
    (v_lender_id, 'investment', v_amount, 'Funded peer loan'),
    (v_borrower_id, 'loan_disbursed', v_amount, 'Loan disbursed to wallet');

  -- Add notifications for loan acceptance
  insert into public.notifications (user_id, title, message)
  values
    (v_borrower_id, 'Loan Funded', 'Your peer loan request of NGN ' || v_amount || ' has been funded. The amount has been credited to your wallet.'),
    (v_lender_id, 'Investment Active', 'You have successfully funded a peer loan of NGN ' || v_amount || '. The funds are now locked in your wallet.');
end;
$$;


create or replace function private.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan public.loans%rowtype;
  v_repayment_amount numeric;
  v_updated integer;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and borrower_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'This loan cannot be repaid from this account.';
  end if;

  v_repayment_amount := round(v_loan.amount + ((v_loan.amount * v_loan.rate) / 100), 2);

  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

  if v_loan.lender_id is not null then
    update public.wallets
    set locked = locked - v_loan.amount,
        balance = balance + v_repayment_amount
    where user_id = v_loan.lender_id
      and locked >= v_loan.amount;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Lender locked balance is inconsistent.';
    end if;
  end if;

  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_repayment',
    v_repayment_amount,
    case
      when v_loan.lender_id is null then 'Platform loan repayment'
      else 'Loan Repayment (Principal + Interest)'
    end
  );

  -- Add notification for borrower
  insert into public.notifications (user_id, title, message)
  values (p_user_id, 'Loan Repaid', 'You have successfully repaid your loan of NGN ' || v_loan.amount || '.');

  if v_loan.lender_id is not null then
    insert into public.transactions (user_id, type, amount, description)
    values (
      v_loan.lender_id,
      'repayment_received',
      v_repayment_amount,
      'Loan repayment received'
    );
    
    -- Add notification for lender
    insert into public.notifications (user_id, title, message)
    values (v_loan.lender_id, 'Repayment Received', 'Your peer loan investment of NGN ' || v_loan.amount || ' has been repaid with interest. NGN ' || v_repayment_amount || ' has been credited to your wallet.');
  end if;
end;
$$;


-- ============================================================
-- Migration: 20260516008000_admin_reject_proof.sql
-- ============================================================

-- Migration to add admin_reject_payment_proof RPC
-- Path: supabase/migrations/20260516008000_admin_reject_proof.sql

create or replace function public.admin_reject_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Ensure the caller is an admin
    if not exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    ) then
        raise exception 'Unauthorized: Only admins can reject payment proofs.';
    end if;

    -- Update the proof status and notify user
    with rejected_proof as (
        update public.payment_proofs
        set status = 'rejected'
        where id = p_proof_id and status = 'pending'
        returning user_id, amount
    )
    insert into public.notifications (user_id, title, message)
    select user_id, 'Payment Rejected', 'Your payment proof of â‚¦' || amount || ' was rejected. Please check your reference and re-upload.'
    from rejected_proof;

    if not found then
        raise exception 'Payment proof not found or already processed.';
    end if;
end;
$$;


-- ============================================================
-- Migration: 20260516009000_repair_auth_onboarding_storage.sql
-- ============================================================

-- Repair auth/onboarding/storage pieces for projects that may have partially applied
-- the KYC/payment-proof migration.

create extension if not exists pgcrypto;

create schema if not exists private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter type public.transaction_type add value if not exists 'affiliate_reward';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'payment_proof_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.payment_proof_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'payment_proof_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.payment_proof_type as enum ('wallet_funding', 'registration_deposit');
  end if;
end;
$$;

alter table public.loans
alter column lender_id drop not null;

alter table public.profiles
add column if not exists username text,
add column if not exists referral_code text,
add column if not exists registration_payment_reference text,
add column if not exists registration_deposit_paid boolean not null default false,
add column if not exists registration_deposit_amount numeric(14, 2) not null default 0 check (registration_deposit_amount >= 0),
add column if not exists registration_deposit_confirmed_at timestamptz,
add column if not exists referred_by uuid references public.profiles(id) on delete set null,
add column if not exists affiliate_earnings numeric(14, 2) not null default 0 check (affiliate_earnings >= 0),
add column if not exists passport_photo_url text,
add column if not exists role text not null default 'user';

update public.profiles
set role = 'user'
where role is null;

alter table public.profiles
alter column role set default 'user',
alter column role set not null,
alter column registration_deposit_paid set default false,
alter column registration_deposit_amount set default 0,
alter column affiliate_earnings set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[A-Za-z0-9]{3,30}$');
  end if;
end;
$$;

create unique index if not exists profiles_username_lower_unique_idx
on public.profiles (lower(username))
where username is not null;

create index if not exists profiles_referred_by_idx
on public.profiles (referred_by)
where referred_by is not null;

create table if not exists public.affiliate_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);

alter table public.affiliate_rewards enable row level security;
grant select on public.affiliate_rewards to authenticated;
grant all on public.affiliate_rewards to service_role;

drop policy if exists "Users can read own affiliate rewards" on public.affiliate_rewards;
create policy "Users can read own affiliate rewards"
on public.affiliate_rewards
for select
to authenticated
using (
  (select auth.uid()) = referrer_id
  or (select auth.uid()) = referred_user_id
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  reference text not null,
  type public.payment_proof_type not null,
  receipt_image_url text not null,
  status public.payment_proof_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists payment_proofs_set_updated_at on public.payment_proofs;
create trigger payment_proofs_set_updated_at
before update on public.payment_proofs
for each row execute function public.set_updated_at();

alter table public.payment_proofs enable row level security;
grant select, insert, update on public.payment_proofs to authenticated;
grant all on public.payment_proofs to service_role;

drop policy if exists "Users can read own payment proofs" on public.payment_proofs;
create policy "Users can read own payment proofs"
on public.payment_proofs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own payment proofs" on public.payment_proofs;
create policy "Users can insert own payment proofs"
on public.payment_proofs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all payment proofs" on public.payment_proofs;
create policy "Admins can read all payment proofs"
on public.payment_proofs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

drop policy if exists "Admins can update payment proofs" on public.payment_proofs;
create policy "Admins can update payment proofs"
on public.payment_proofs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read peer profiles" on public.profiles;
create policy "Users can read peer profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.loans l
    where l.status = 'active'
      and l.lender_id is not null
      and (
        (l.borrower_id = (select auth.uid()) and l.lender_id = profiles.id)
        or
        (l.lender_id = (select auth.uid()) and l.borrower_id = profiles.id)
      )
  )
);

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload their own KYC documents" on storage.objects;
create policy "Users can upload their own KYC documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can read their own KYC documents" on storage.objects;
create policy "Users can read their own KYC documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Admins can read all KYC documents" on storage.objects;
create policy "Admins can read all KYC documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kyc-documents'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

drop policy if exists "Users can upload their own receipts" on storage.objects;
create policy "Users can upload their own receipts"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can read their own receipts" on storage.objects;
create policy "Users can read their own receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Admins can read all receipts" on storage.objects;
create policy "Admins can read all receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create or replace function public.admin_approve_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proof public.payment_proofs%rowtype;
  v_profile public.profiles%rowtype;
  v_admin boolean;
  v_first_loan_amount numeric(14, 2) := 2000.00;
  v_affiliate_reward numeric(14, 2) := 500.00;
  v_prior_platform_loans integer;
  v_reward_exists boolean;
  v_updated integer;
begin
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve payments.';
  end if;

  select *
  into v_proof
  from public.payment_proofs
  where id = p_proof_id
  for update;

  if not found then
    raise exception 'Payment proof not found.';
  end if;

  if v_proof.status <> 'pending' then
    raise exception 'Payment proof is not pending.';
  end if;

  if v_proof.type = 'wallet_funding' then
    update public.wallets
    set balance = balance + v_proof.amount
    where user_id = v_proof.user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Wallet not found.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  elsif v_proof.type = 'registration_deposit' then
    select *
    into v_profile
    from public.profiles
    where id = v_proof.user_id
    for update;

    if not found then
      raise exception 'Profile not found.';
    end if;

    if v_profile.registration_deposit_paid then
      raise exception 'Registration deposit has already been confirmed.';
    end if;

    update public.profiles
    set registration_deposit_paid = true,
        registration_deposit_amount = v_proof.amount,
        registration_payment_reference = v_proof.reference,
        registration_deposit_confirmed_at = now()
    where id = v_proof.user_id;

    select count(*)
    into v_prior_platform_loans
    from public.loans
    where borrower_id = v_proof.user_id
      and lender_id is null;

    if v_prior_platform_loans = 0 then
      update public.wallets
      set balance = balance + v_first_loan_amount
      where user_id = v_proof.user_id;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'Wallet not found.';
      end if;

      insert into public.loans (
        amount,
        rate,
        days,
        borrower_id,
        lender_id,
        status,
        due_date
      )
      values (
        v_first_loan_amount,
        0,
        30,
        v_proof.user_id,
        null,
        'active',
        now() + make_interval(days => 30)
      );

      insert into public.transactions (user_id, type, amount, description)
      values (
        v_proof.user_id,
        'loan_disbursed',
        v_first_loan_amount,
        'First platform loan disbursed after registration deposit approval'
      );
    end if;

    if v_profile.referred_by is not null then
      select exists (
        select 1
        from public.affiliate_rewards
        where referred_user_id = v_proof.user_id
      )
      into v_reward_exists;

      if not v_reward_exists then
        update public.wallets
        set balance = balance + v_affiliate_reward
        where user_id = v_profile.referred_by;

        get diagnostics v_updated = row_count;
        if v_updated <> 1 then
          raise exception 'Referrer wallet not found.';
        end if;

        update public.profiles
        set affiliate_earnings = affiliate_earnings + v_affiliate_reward
        where id = v_profile.referred_by;

        insert into public.affiliate_rewards (
          referrer_id,
          referred_user_id,
          amount
        )
        values (
          v_profile.referred_by,
          v_proof.user_id,
          v_affiliate_reward
        );

        insert into public.transactions (user_id, type, amount, description)
        values (
          v_profile.referred_by,
          'affiliate_reward',
          v_affiliate_reward,
          'Affiliate reward from direct referral onboarding'
        );

        insert into public.notifications (user_id, title, message)
        values (
          v_profile.referred_by,
          'Affiliate Reward Credited',
          'Your direct referral completed onboarding. NGN ' || v_affiliate_reward || ' has been added to your wallet.'
        );
      end if;
    end if;
  else
    raise exception 'Unsupported payment proof type.';
  end if;

  update public.payment_proofs
  set status = 'approved'
  where id = p_proof_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_proof.user_id,
    'Payment Approved',
    'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
  );
end;
$$;

create or replace function public.admin_reject_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin boolean;
  v_updated integer;
begin
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can reject payment proofs.';
  end if;

  with rejected_proof as (
    update public.payment_proofs
    set status = 'rejected'
    where id = p_proof_id
      and status = 'pending'
    returning user_id, amount
  ),
  inserted_notification as (
    insert into public.notifications (user_id, title, message)
    select
      user_id,
      'Payment Rejected',
      'Your payment proof of NGN ' || amount || ' was rejected. Please check your reference and upload a new proof.'
    from rejected_proof
    returning 1
  )
  select count(*)
  into v_updated
  from inserted_notification;

  if v_updated <> 1 then
    raise exception 'Payment proof not found or already processed.';
  end if;
end;
$$;

revoke execute on function public.admin_approve_payment_proof(uuid) from public, anon;
revoke execute on function public.admin_reject_payment_proof(uuid) from public, anon;
grant execute on function public.admin_approve_payment_proof(uuid) to authenticated;
grant execute on function public.admin_reject_payment_proof(uuid) to authenticated;


-- ============================================================
-- Migration: 20260516010000_uploads_kyc_and_loan_duration_rules.sql
-- ============================================================

-- Tighten upload bucket policies and loan timing rules.

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload their own KYC documents" on storage.objects;
create policy "Users can upload their own KYC documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can read their own KYC documents" on storage.objects;
create policy "Users can read their own KYC documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own KYC documents" on storage.objects;
create policy "Users can update their own KYC documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Admins can read all KYC documents" on storage.objects;
create policy "Admins can read all KYC documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kyc-documents'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

drop policy if exists "Users can upload their own receipts" on storage.objects;
create policy "Users can upload their own receipts"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can read their own receipts" on storage.objects;
create policy "Users can read their own receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own receipts" on storage.objects;
create policy "Users can update their own receipts"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Admins can read all receipts" on storage.objects;
create policy "Admins can read all receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

update public.marketplace_items
set days = greatest(1, least(coalesce(days, 14), 14))
where days is null
   or days < 1
   or days > 14;

update public.loans
set days = greatest(1, least(coalesce(days, 14), 14)),
    due_date = case
      when due_date is null then start_date + make_interval(days => 14)
      when due_date > start_date + make_interval(days => 14) then start_date + make_interval(days => 14)
      else due_date
    end
where days is null
   or days < 1
   or days > 14
   or due_date is null
   or due_date > start_date + make_interval(days => 14);

alter table public.marketplace_items
drop constraint if exists marketplace_items_days_between_1_14;

alter table public.marketplace_items
add constraint marketplace_items_days_between_1_14
check (days between 1 and 14);

alter table public.loans
drop constraint if exists loans_days_between_1_14;

alter table public.loans
add constraint loans_days_between_1_14
check (days between 1 and 14);

create or replace function private.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author_name text;
  v_trust_score integer;
begin
  if p_amount is null or p_amount < 1000 then
    raise exception 'Amount must be at least 1000.';
  end if;

  if p_days is null or p_days < 1 or p_days > 14 then
    raise exception 'Duration must be between 1 and 14 days.';
  end if;

  select first_name, trust_score
  into v_author_name, v_trust_score
  from public.profiles
  where id = p_user_id;

  if v_author_name is null then
    raise exception 'Profile not found.';
  end if;

  insert into public.marketplace_items (
    type,
    amount,
    rate,
    days,
    author_id,
    author_name,
    trust_score,
    status
  )
  values (
    p_type,
    round(p_amount, 2),
    0,
    p_days,
    p_user_id,
    v_author_name,
    v_trust_score,
    'active'
  );
end;
$$;

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration_deposit_paid boolean;
  v_prior_platform_loans integer;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_retained_deposit numeric(14, 2);
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
  v_platform_loan_days integer := 14;
begin
  select registration_deposit_paid
  into v_registration_deposit_paid
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active platform loan before requesting another one.';
  end if;

  select count(*)
  into v_prior_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null;

  if v_prior_platform_loans = 0 then
    if not v_registration_deposit_paid then
      raise exception 'Confirm your NGN 2,000 registration deposit before the first NGN 2,000 loan.';
    end if;

    v_amount := 2000.00;

    if p_amount is not null and round(p_amount, 2) <> v_amount then
      raise exception 'Your first platform loan is fixed at NGN 2,000.';
    end if;

    v_retained_deposit := 0.00;
  else
    v_amount := coalesce(round(p_amount, 2), 10000.00);

    if v_amount < 10000.00 then
      raise exception 'Second and later platform loans start from NGN 10,000.';
    end if;

    v_retained_deposit := round(v_amount * 0.50, 2);

    if v_wallet_balance < v_retained_deposit then
      v_shortfall := round(v_retained_deposit - v_wallet_balance, 2);
      raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.',
        v_shortfall,
        v_retained_deposit;
    end if;
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    v_platform_loan_days,
    p_user_id,
    null,
    'active',
    now() + make_interval(days => v_platform_loan_days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    case
      when v_prior_platform_loans = 0 then 'First platform loan disbursed'
      else 'Platform loan disbursed with 50% retained wallet condition'
    end
  );
end;
$$;

create or replace function public.admin_approve_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proof public.payment_proofs%rowtype;
  v_profile public.profiles%rowtype;
  v_admin boolean;
  v_first_loan_amount numeric(14, 2) := 2000.00;
  v_affiliate_reward numeric(14, 2) := 500.00;
  v_prior_platform_loans integer;
  v_reward_exists boolean;
  v_updated integer;
  v_platform_loan_days integer := 14;
begin
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve payments.';
  end if;

  select *
  into v_proof
  from public.payment_proofs
  where id = p_proof_id
  for update;

  if not found then
    raise exception 'Payment proof not found.';
  end if;

  if v_proof.status <> 'pending' then
    raise exception 'Payment proof is not pending.';
  end if;

  if v_proof.type = 'wallet_funding' then
    update public.wallets
    set balance = balance + v_proof.amount
    where user_id = v_proof.user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Wallet not found.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  elsif v_proof.type = 'registration_deposit' then
    select *
    into v_profile
    from public.profiles
    where id = v_proof.user_id
    for update;

    if not found then
      raise exception 'Profile not found.';
    end if;

    if v_profile.registration_deposit_paid then
      raise exception 'Registration deposit has already been confirmed.';
    end if;

    update public.profiles
    set registration_deposit_paid = true,
        registration_deposit_amount = v_proof.amount,
        registration_payment_reference = v_proof.reference,
        registration_deposit_confirmed_at = now()
    where id = v_proof.user_id;

    select count(*)
    into v_prior_platform_loans
    from public.loans
    where borrower_id = v_proof.user_id
      and lender_id is null;

    if v_prior_platform_loans = 0 then
      update public.wallets
      set balance = balance + v_first_loan_amount
      where user_id = v_proof.user_id;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'Wallet not found.';
      end if;

      insert into public.loans (
        amount,
        rate,
        days,
        borrower_id,
        lender_id,
        status,
        due_date
      )
      values (
        v_first_loan_amount,
        0,
        v_platform_loan_days,
        v_proof.user_id,
        null,
        'active',
        now() + make_interval(days => v_platform_loan_days)
      );

      insert into public.transactions (user_id, type, amount, description)
      values (
        v_proof.user_id,
        'loan_disbursed',
        v_first_loan_amount,
        'First platform loan disbursed after registration deposit approval'
      );
    end if;

    if v_profile.referred_by is not null then
      select exists (
        select 1
        from public.affiliate_rewards
        where referred_user_id = v_proof.user_id
      )
      into v_reward_exists;

      if not v_reward_exists then
        update public.wallets
        set balance = balance + v_affiliate_reward
        where user_id = v_profile.referred_by;

        get diagnostics v_updated = row_count;
        if v_updated <> 1 then
          raise exception 'Referrer wallet not found.';
        end if;

        update public.profiles
        set affiliate_earnings = affiliate_earnings + v_affiliate_reward
        where id = v_profile.referred_by;

        insert into public.affiliate_rewards (
          referrer_id,
          referred_user_id,
          amount
        )
        values (
          v_profile.referred_by,
          v_proof.user_id,
          v_affiliate_reward
        );

        insert into public.transactions (user_id, type, amount, description)
        values (
          v_profile.referred_by,
          'affiliate_reward',
          v_affiliate_reward,
          'Affiliate reward from direct referral onboarding'
        );

        insert into public.notifications (user_id, title, message)
        values (
          v_profile.referred_by,
          'Affiliate Reward Credited',
          'Your direct referral completed onboarding. NGN ' || v_affiliate_reward || ' has been added to your wallet.'
        );
      end if;
    end if;
  else
    raise exception 'Unsupported payment proof type.';
  end if;

  update public.payment_proofs
  set status = 'approved'
  where id = p_proof_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_proof.user_id,
    'Payment Approved',
    'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
  );
end;
$$;

grant execute on function private.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) to service_role;
grant execute on function private.me2u_request_platform_loan(uuid, numeric) to service_role;
grant execute on function public.admin_approve_payment_proof(uuid) to authenticated;


-- ============================================================
-- Migration: 20260516163748_enforce_image_bucket_limits.sql
-- ============================================================

-- Keep private image upload buckets aligned with the app upload guardrails.
-- The app only accepts image files up to 5 * 1024 * 1024 bytes.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  ('receipts', 'receipts', false, 5242880, array['image/*']::text[]),
  ('kyc-documents', 'kyc-documents', false, 5242880, array['image/*']::text[])
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- Migration: 20260516193412_onboarding_credit_not_loan.sql
-- ============================================================

-- Treat the NGN 2,000 onboarding amount as a wallet credit, not a loan.
-- This also removes old NGN 2,000 platform-loan rows created by earlier onboarding flows.

with repaid_old_onboarding_loans as (
  select distinct l.borrower_id
  from public.loans l
  where l.lender_id is null
    and l.amount = 2000.00
    and l.rate = 0
    and l.status = 'completed'
    and exists (
      select 1
      from public.profiles p
      where p.id = l.borrower_id
        and p.registration_deposit_paid
    )
    and exists (
      select 1
      from public.transactions t
      where t.user_id = l.borrower_id
        and t.type = 'loan_repayment'
        and t.amount = 2000.00
        and t.description = 'Platform loan repayment'
    )
    and not exists (
      select 1
      from public.transactions t
      where t.user_id = l.borrower_id
        and t.type = 'deposit'
        and t.amount = 2000.00
        and t.description = 'Reversal of old onboarding credit repayment'
    )
),
reimbursed_users as (
  update public.wallets w
  set balance = balance + 2000.00
  from repaid_old_onboarding_loans r
  where w.user_id = r.borrower_id
  returning w.user_id
)
insert into public.transactions (user_id, type, amount, description)
select user_id, 'deposit', 2000.00, 'Reversal of old onboarding credit repayment'
from reimbursed_users;

update public.transactions
set type = 'deposit',
    description = 'Onboarding credit after registration deposit approval'
where type = 'loan_disbursed'
  and amount = 2000.00
  and description ilike '%first platform loan%';

delete from public.loans l
where l.lender_id is null
  and l.amount = 2000.00
  and l.rate = 0
  and exists (
    select 1
    from public.profiles p
    where p.id = l.borrower_id
      and p.registration_deposit_paid
  );

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_retained_deposit numeric(14, 2);
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
  v_platform_loan_days integer := 14;
begin
  select registration_deposit_paid, kyc_verified
  into v_registration_deposit_paid, v_kyc_verified
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before requesting a loan.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before requesting a platform loan.';
  end if;

  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active platform loan before requesting another one.';
  end if;

  v_amount := coalesce(round(p_amount, 2), 10000.00);

  if v_amount < 10000.00 then
    raise exception 'Platform loans start from NGN 10,000.';
  end if;

  v_retained_deposit := round(v_amount * 0.50, 2);

  if v_wallet_balance < v_retained_deposit then
    v_shortfall := round(v_retained_deposit - v_wallet_balance, 2);
    raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.',
      v_shortfall,
      v_retained_deposit;
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    v_platform_loan_days,
    p_user_id,
    null,
    'active',
    now() + make_interval(days => v_platform_loan_days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    'Platform loan disbursed with 50% retained wallet condition'
  );
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_platform_retained_deposit numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select registration_deposit_paid, kyc_verified
  into v_registration_deposit_paid, v_kyc_verified
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before withdrawal.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before withdrawal.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);

  select coalesce(sum(round(amount * 0.5, 2)), 0)
  into v_platform_retained_deposit
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active'
    and amount >= 10000.00;

  update public.wallets
  set balance = balance - v_withdrawal_amount
  where user_id = p_user_id
    and balance >= (v_withdrawal_amount + v_platform_retained_deposit);

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient available balance. The active platform loan deposit must remain in your wallet.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );
end;
$$;

create or replace function public.admin_approve_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proof public.payment_proofs%rowtype;
  v_profile public.profiles%rowtype;
  v_admin boolean;
  v_onboarding_credit numeric(14, 2) := 2000.00;
  v_affiliate_reward numeric(14, 2) := 500.00;
  v_reward_exists boolean;
  v_updated integer;
begin
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve payments.';
  end if;

  select *
  into v_proof
  from public.payment_proofs
  where id = p_proof_id
  for update;

  if not found then
    raise exception 'Payment proof not found.';
  end if;

  if v_proof.status <> 'pending' then
    raise exception 'Payment proof is not pending.';
  end if;

  if v_proof.type = 'wallet_funding' then
    update public.wallets
    set balance = balance + v_proof.amount
    where user_id = v_proof.user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Wallet not found.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  elsif v_proof.type = 'registration_deposit' then
    select *
    into v_profile
    from public.profiles
    where id = v_proof.user_id
    for update;

    if not found then
      raise exception 'Profile not found.';
    end if;

    if v_profile.registration_deposit_paid then
      raise exception 'Registration deposit has already been confirmed.';
    end if;

    update public.profiles
    set registration_deposit_paid = true,
        registration_deposit_amount = v_proof.amount,
        registration_payment_reference = v_proof.reference,
        registration_deposit_confirmed_at = now()
    where id = v_proof.user_id;

    update public.wallets
    set balance = balance + v_onboarding_credit
    where user_id = v_proof.user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Wallet not found.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (
      v_proof.user_id,
      'deposit',
      v_onboarding_credit,
      'Onboarding credit after registration deposit approval'
    );

    if v_profile.referred_by is not null then
      select exists (
        select 1
        from public.affiliate_rewards
        where referred_user_id = v_proof.user_id
      )
      into v_reward_exists;

      if not v_reward_exists then
        update public.wallets
        set balance = balance + v_affiliate_reward
        where user_id = v_profile.referred_by;

        get diagnostics v_updated = row_count;
        if v_updated <> 1 then
          raise exception 'Referrer wallet not found.';
        end if;

        update public.profiles
        set affiliate_earnings = affiliate_earnings + v_affiliate_reward
        where id = v_profile.referred_by;

        insert into public.affiliate_rewards (
          referrer_id,
          referred_user_id,
          amount
        )
        values (
          v_profile.referred_by,
          v_proof.user_id,
          v_affiliate_reward
        );

        insert into public.transactions (user_id, type, amount, description)
        values (
          v_profile.referred_by,
          'affiliate_reward',
          v_affiliate_reward,
          'Affiliate reward from direct referral onboarding'
        );

        insert into public.notifications (user_id, title, message)
        values (
          v_profile.referred_by,
          'Affiliate Reward Credited',
          'Your direct referral completed onboarding. NGN ' || v_affiliate_reward || ' has been added to your wallet.'
        );
      end if;
    end if;
  else
    raise exception 'Unsupported payment proof type.';
  end if;

  update public.payment_proofs
  set status = 'approved'
  where id = p_proof_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_proof.user_id,
    'Payment Approved',
    'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
  );
end;
$$;

revoke execute on function private.me2u_request_platform_loan(uuid, numeric) from public, anon, authenticated;
grant execute on function private.me2u_request_platform_loan(uuid, numeric) to service_role;

revoke execute on function private.me2u_withdraw_wallet(uuid, numeric) from public, anon, authenticated;
grant execute on function private.me2u_withdraw_wallet(uuid, numeric) to service_role;

grant execute on function public.admin_approve_payment_proof(uuid) to authenticated;


-- ============================================================
-- Migration: 20260518093620_admin_withdrawal_approval_queue.sql
-- ============================================================

-- Add an admin-reviewed withdrawal queue so wallet debits happen only after
-- operations approval.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'withdrawal_request_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.withdrawal_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end;
$$;

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  bank_name text,
  account_number text,
  status public.withdrawal_request_status not null default 'pending',
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint withdrawal_requests_processed_state check (
    (status = 'pending' and processed_at is null and processed_by is null)
    or
    (status <> 'pending' and processed_at is not null)
  )
);

drop trigger if exists withdrawal_requests_set_updated_at on public.withdrawal_requests;
create trigger withdrawal_requests_set_updated_at
before update on public.withdrawal_requests
for each row execute function public.set_updated_at();

alter table public.withdrawal_requests enable row level security;

grant select, insert, update on public.withdrawal_requests to authenticated;
grant all on public.withdrawal_requests to service_role;

drop policy if exists "Users can read own withdrawal requests" on public.withdrawal_requests;
create policy "Users can read own withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own pending withdrawal requests" on public.withdrawal_requests;
create policy "Users can create own pending withdrawal requests"
on public.withdrawal_requests
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and processed_by is null
  and processed_at is null
);

drop policy if exists "Admins can read all withdrawal requests" on public.withdrawal_requests;
create policy "Admins can read all withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

drop policy if exists "Admins can update withdrawal requests" on public.withdrawal_requests;
create policy "Admins can update withdrawal requests"
on public.withdrawal_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create index if not exists withdrawal_requests_status_created_at_idx
on public.withdrawal_requests (status, created_at desc);

create index if not exists withdrawal_requests_user_id_created_at_idx
on public.withdrawal_requests (user_id, created_at desc);

create or replace function public.admin_approve_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_admin_id uuid := (select auth.uid());
  v_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve withdrawal requests.';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Withdrawal request is not pending.';
  end if;

  perform private.me2u_withdraw_wallet(v_request.user_id, v_request.amount);

  update public.withdrawal_requests
  set status = 'approved',
      processed_by = v_admin_id,
      processed_at = now(),
      admin_note = 'Approved by admin'
  where id = p_request_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Approved',
    'Your withdrawal request of NGN ' || v_request.amount || ' has been approved.'
  );
end;
$$;

create or replace function public.admin_reject_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_admin_id uuid := (select auth.uid());
  v_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can reject withdrawal requests.';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Withdrawal request is not pending.';
  end if;

  update public.withdrawal_requests
  set status = 'rejected',
      processed_by = v_admin_id,
      processed_at = now(),
      admin_note = 'Rejected by admin'
  where id = p_request_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Rejected',
    'Your withdrawal request of NGN ' || v_request.amount || ' was rejected. Please review your bank details or contact support.'
  );
end;
$$;

revoke execute on function public.admin_approve_withdrawal_request(uuid) from public, anon;
revoke execute on function public.admin_reject_withdrawal_request(uuid) from public, anon;
grant execute on function public.admin_approve_withdrawal_request(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal_request(uuid) to authenticated;


-- ============================================================
-- Migration: 20260518204542_loan_minimum_5000_copy_cleanup.sql
-- ============================================================

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_retained_deposit numeric(14, 2);
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
  v_loan_days integer := 14;
begin
  select registration_deposit_paid, kyc_verified
  into v_registration_deposit_paid, v_kyc_verified
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before requesting a loan.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before requesting a loan.';
  end if;

  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active loan before requesting another one.';
  end if;

  v_amount := coalesce(round(p_amount, 2), 5000.00);

  if v_amount < 5000.00 then
    raise exception 'Loans start from NGN 5,000.';
  end if;

  v_retained_deposit := round(v_amount * 0.50, 2);

  if v_wallet_balance < v_retained_deposit then
    v_shortfall := round(v_retained_deposit - v_wallet_balance, 2);
    raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.',
      v_shortfall,
      v_retained_deposit;
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    v_loan_days,
    p_user_id,
    null,
    'active',
    now() + make_interval(days => v_loan_days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    'Loan disbursed with 50% retained wallet condition'
  );
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_retained_deposit numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select registration_deposit_paid, kyc_verified
  into v_registration_deposit_paid, v_kyc_verified
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before withdrawal.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before withdrawal.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);

  select coalesce(sum(round(amount * 0.5, 2)), 0)
  into v_retained_deposit
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active'
    and amount >= 5000.00;

  update public.wallets
  set balance = balance - v_withdrawal_amount
  where user_id = p_user_id
    and balance >= (v_withdrawal_amount + v_retained_deposit);

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient available balance. The active loan deposit must remain in your wallet.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );
end;
$$;

revoke execute on function private.me2u_request_platform_loan(uuid, numeric) from public, anon, authenticated;
grant execute on function private.me2u_request_platform_loan(uuid, numeric) to service_role;

revoke execute on function private.me2u_withdraw_wallet(uuid, numeric) from public, anon, authenticated;
grant execute on function private.me2u_withdraw_wallet(uuid, numeric) to service_role;


-- ============================================================
-- Migration: 20260519152449_licensed_partner_revenue_model.sql
-- ============================================================

-- Licensed partner revenue model:
-- - Welcome bonus unlocks after registration deposit + KYC.
-- - Verified referrals pay only after the referred user unlocks the bonus.
-- - Withdrawals include a transparent flat processing fee.
-- - Borrow requests can buy optional marketplace visibility.
-- - Admins can track platform-side revenue events without exposing writes to clients.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'revenue_event_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.revenue_event_type as enum (
      'withdrawal_fee',
      'marketplace_boost',
      'partner_treasury_share',
      'partner_referral'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'loan_funding_source'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.loan_funding_source as enum (
      'me2u_balance_sheet',
      'peer_lender',
      'partner_bank'
    );
  end if;
end;
$$;

alter table public.profiles
add column if not exists welcome_bonus_unlocked_at timestamptz,
add column if not exists partner_offer_consent_at timestamptz,
add column if not exists partner_offer_consent_version text;

alter table public.marketplace_items
add column if not exists boosted_at timestamptz,
add column if not exists boosted_until timestamptz,
add column if not exists boost_fee_amount numeric(14, 2) not null default 0 check (boost_fee_amount >= 0);

alter table public.withdrawal_requests
add column if not exists fee_amount numeric(14, 2) not null default 0 check (fee_amount >= 0);

update public.withdrawal_requests
set fee_amount = 100.00
where status = 'pending'
  and fee_amount = 0;

alter table public.withdrawal_requests
alter column fee_amount set default 100.00;

alter table public.withdrawal_requests
drop constraint if exists withdrawal_requests_pending_fee_amount;

alter table public.withdrawal_requests
add constraint withdrawal_requests_pending_fee_amount
check (status <> 'pending' or fee_amount = 100.00);

alter table public.loans
add column if not exists funding_source public.loan_funding_source;

update public.loans
set funding_source = case
  when lender_id is null then 'me2u_balance_sheet'::public.loan_funding_source
  else 'peer_lender'::public.loan_funding_source
end
where funding_source is null;

alter table public.loans
alter column funding_source set default 'peer_lender'::public.loan_funding_source;

alter table public.loans
alter column funding_source set not null;

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  type public.revenue_event_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  user_id uuid references public.profiles(id) on delete set null,
  source_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.revenue_events enable row level security;

grant select on public.revenue_events to authenticated;
grant all on public.revenue_events to service_role;

drop policy if exists "Admins can read revenue events" on public.revenue_events;
create policy "Admins can read revenue events"
on public.revenue_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create index if not exists revenue_events_type_created_at_idx
on public.revenue_events (type, created_at desc);

create index if not exists revenue_events_user_id_created_at_idx
on public.revenue_events (user_id, created_at desc);

create index if not exists marketplace_items_boosted_until_idx
on public.marketplace_items (boosted_until desc)
where boosted_until is not null;

update public.profiles p
set welcome_bonus_unlocked_at = coalesce(p.registration_deposit_confirmed_at, p.updated_at, now())
where p.welcome_bonus_unlocked_at is null
  and exists (
    select 1
    from public.transactions t
    where t.user_id = p.id
      and t.type = 'deposit'
      and t.amount = 2000.00
      and t.description ~* '(onboarding credit|welcome bonus|reversal of old onboarding credit)'
  );

update public.transactions
set description = 'Welcome bonus unlocked after verification'
where type = 'deposit'
  and amount = 2000.00
  and description = 'Onboarding credit after registration deposit approval';

create or replace function private.me2u_unlock_welcome_bonus(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_welcome_bonus numeric(14, 2) := 2000.00;
  v_affiliate_reward numeric(14, 2) := 500.00;
  v_reward_exists boolean;
  v_updated integer;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_profile.registration_deposit_paid or not v_profile.kyc_verified then
    return;
  end if;

  if v_profile.welcome_bonus_unlocked_at is not null then
    return;
  end if;

  update public.wallets
  set balance = balance + v_welcome_bonus
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  update public.profiles
  set welcome_bonus_unlocked_at = now()
  where id = p_user_id;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'deposit',
    v_welcome_bonus,
    'Welcome bonus unlocked after verification'
  );

  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    'Welcome Bonus Unlocked',
    'Your NGN ' || v_welcome_bonus || ' welcome bonus has been added to your wallet after verification.'
  );

  if v_profile.referred_by is not null then
    select exists (
      select 1
      from public.affiliate_rewards
      where referred_user_id = p_user_id
    )
    into v_reward_exists;

    if not v_reward_exists then
      update public.wallets
      set balance = balance + v_affiliate_reward
      where user_id = v_profile.referred_by;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'Referrer wallet not found.';
      end if;

      update public.profiles
      set affiliate_earnings = affiliate_earnings + v_affiliate_reward
      where id = v_profile.referred_by;

      insert into public.affiliate_rewards (
        referrer_id,
        referred_user_id,
        amount
      )
      values (
        v_profile.referred_by,
        p_user_id,
        v_affiliate_reward
      );

      insert into public.transactions (user_id, type, amount, description)
      values (
        v_profile.referred_by,
        'affiliate_reward',
        v_affiliate_reward,
        'Affiliate reward from verified referral onboarding'
      );

      insert into public.notifications (user_id, title, message)
      values (
        v_profile.referred_by,
        'Affiliate Reward Credited',
        'Your direct referral completed verified onboarding. NGN ' || v_affiliate_reward || ' has been added to your wallet.'
      );
    end if;
  end if;
end;
$$;

create or replace function public.me2u_unlock_welcome_bonus(p_user_id uuid)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_unlock_welcome_bonus(p_user_id);
$$;

create or replace function private.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer,
  p_boost boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author_name text;
  v_trust_score integer;
  v_boost_fee numeric(14, 2) := 100.00;
  v_boosted_at timestamptz;
  v_boosted_until timestamptz;
  v_item_id uuid;
  v_updated integer;
begin
  if p_amount is null or p_amount < 1000 then
    raise exception 'Amount must be at least 1000.';
  end if;

  if p_days is null or p_days < 1 or p_days > 14 then
    raise exception 'Duration must be between 1 and 14 days.';
  end if;

  if coalesce(p_boost, false) and p_type <> 'borrow_request' then
    raise exception 'Only borrow requests can be promoted.';
  end if;

  select first_name, trust_score
  into v_author_name, v_trust_score
  from public.profiles
  where id = p_user_id
    and kyc_verified = true;

  if v_author_name is null then
    raise exception 'Verified profile not found.';
  end if;

  if coalesce(p_boost, false) then
    update public.wallets
    set balance = balance - v_boost_fee
    where user_id = p_user_id
      and balance >= v_boost_fee;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Insufficient wallet balance for the NGN 100 boost fee.';
    end if;

    v_boosted_at := now();
    v_boosted_until := now() + interval '24 hours';
  end if;

  insert into public.marketplace_items (
    type,
    amount,
    rate,
    days,
    author_id,
    author_name,
    trust_score,
    status,
    boosted_at,
    boosted_until,
    boost_fee_amount
  )
  values (
    p_type,
    round(p_amount, 2),
    0,
    p_days,
    p_user_id,
    v_author_name,
    v_trust_score,
    'active',
    v_boosted_at,
    v_boosted_until,
    case when coalesce(p_boost, false) then v_boost_fee else 0 end
  )
  returning id into v_item_id;

  if coalesce(p_boost, false) then
    insert into public.revenue_events (
      type,
      amount,
      user_id,
      source_id,
      description
    )
    values (
      'marketplace_boost',
      v_boost_fee,
      p_user_id,
      v_item_id,
      'Borrow request visibility boost'
    );
  end if;
end;
$$;

create or replace function public.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer,
  p_boost boolean default false
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_create_marketplace_item(
    p_user_id,
    p_type,
    p_amount,
    p_rate,
    p_days,
    p_boost
  );
$$;

create or replace function private.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select private.me2u_create_marketplace_item(
    p_user_id,
    p_type,
    p_amount,
    p_rate,
    p_days,
    false
  );
$$;

create or replace function public.me2u_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_create_marketplace_item(
    p_user_id,
    p_type,
    p_amount,
    p_rate,
    p_days,
    false
  );
$$;

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_retained_deposit numeric(14, 2);
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
  v_loan_days integer := 14;
begin
  select registration_deposit_paid, kyc_verified
  into v_registration_deposit_paid, v_kyc_verified
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before requesting a loan.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before requesting a loan.';
  end if;

  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active loan before requesting another one.';
  end if;

  v_amount := coalesce(round(p_amount, 2), 5000.00);

  if v_amount < 5000.00 then
    raise exception 'Loans start from NGN 5,000.';
  end if;

  v_retained_deposit := round(v_amount * 0.50, 2);

  if v_wallet_balance < v_retained_deposit then
    v_shortfall := round(v_retained_deposit - v_wallet_balance, 2);
    raise exception 'Fund NGN % first. The 50%% condition of NGN % remains in your wallet.',
      v_shortfall,
      v_retained_deposit;
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    funding_source,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    v_loan_days,
    p_user_id,
    null,
    'me2u_balance_sheet',
    'active',
    now() + make_interval(days => v_loan_days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    'Loan disbursed with 50% retained wallet condition'
  );
end;
$$;

create or replace function private.me2u_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.marketplace_items%rowtype;
  v_amount numeric;
  v_borrower_id uuid;
  v_lender_id uuid;
  v_updated integer;
begin
  select *
  into v_item
  from public.marketplace_items
  where id = p_item_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Marketplace listing is no longer available.';
  end if;

  if v_item.author_id = p_user_id then
    raise exception 'You cannot accept your own listing.';
  end if;

  v_amount := round(v_item.amount, 2);

  if v_item.type = 'borrow_request' then
    v_borrower_id := v_item.author_id;
    v_lender_id := p_user_id;
  else
    v_borrower_id := p_user_id;
    v_lender_id := v_item.author_id;
  end if;

  update public.wallets
  set balance = balance - v_amount,
      locked = locked + v_amount
  where user_id = v_lender_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender has insufficient available balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = v_borrower_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Borrower wallet not found.';
  end if;

  update public.marketplace_items
  set status = 'funded'
  where id = v_item.id;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    funding_source,
    status,
    due_date
  )
  values (
    v_amount,
    v_item.rate,
    v_item.days,
    v_borrower_id,
    v_lender_id,
    'peer_lender',
    'active',
    now() + make_interval(days => v_item.days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values
    (v_lender_id, 'investment', v_amount, 'Funded peer loan'),
    (v_borrower_id, 'loan_disbursed', v_amount, 'Loan disbursed to wallet');
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_fee_amount numeric default 100.00,
  p_source_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_fee_amount numeric;
  v_total_debit numeric;
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_retained_deposit numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select registration_deposit_paid, kyc_verified
  into v_registration_deposit_paid, v_kyc_verified
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your NGN 2,000 registration deposit before withdrawal.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before withdrawal.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);
  v_fee_amount := round(coalesce(p_fee_amount, 100.00), 2);

  if v_fee_amount < 0 then
    raise exception 'Withdrawal fee cannot be negative.';
  end if;

  v_total_debit := v_withdrawal_amount + v_fee_amount;

  select coalesce(sum(round(amount * 0.5, 2)), 0)
  into v_retained_deposit
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active'
    and amount >= 5000.00;

  update public.wallets
  set balance = balance - v_total_debit
  where user_id = p_user_id
    and balance >= (v_total_debit + v_retained_deposit);

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient available balance. The active loan condition and processing fee must be covered.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );

  if v_fee_amount > 0 then
    insert into public.revenue_events (
      type,
      amount,
      user_id,
      source_id,
      description
    )
    values (
      'withdrawal_fee',
      v_fee_amount,
      p_user_id,
      p_source_id,
      'Flat withdrawal processing fee'
    );
  end if;
end;
$$;

create or replace function private.me2u_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select private.me2u_withdraw_wallet(p_user_id, p_amount, 100.00, null::uuid);
$$;

create or replace function public.admin_approve_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_admin_id uuid := (select auth.uid());
  v_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve withdrawal requests.';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Withdrawal request is not pending.';
  end if;

  perform private.me2u_withdraw_wallet(
    v_request.user_id,
    v_request.amount,
    v_request.fee_amount,
    p_request_id
  );

  update public.withdrawal_requests
  set status = 'approved',
      processed_by = v_admin_id,
      processed_at = now(),
      admin_note = 'Approved by admin. Fee applied: NGN ' || v_request.fee_amount
  where id = p_request_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Approved',
    'Your withdrawal request of NGN ' || v_request.amount || ' has been approved. Processing fee: NGN ' || v_request.fee_amount || '.'
  );
end;
$$;

create or replace function public.admin_approve_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_proof public.payment_proofs%rowtype;
  v_profile public.profiles%rowtype;
  v_admin boolean;
  v_updated integer;
begin
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve payments.';
  end if;

  select *
  into v_proof
  from public.payment_proofs
  where id = p_proof_id
  for update;

  if not found then
    raise exception 'Payment proof not found.';
  end if;

  if v_proof.status <> 'pending' then
    raise exception 'Payment proof is not pending.';
  end if;

  if v_proof.type = 'wallet_funding' then
    update public.wallets
    set balance = balance + v_proof.amount
    where user_id = v_proof.user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Wallet not found.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  elsif v_proof.type = 'registration_deposit' then
    select *
    into v_profile
    from public.profiles
    where id = v_proof.user_id
    for update;

    if not found then
      raise exception 'Profile not found.';
    end if;

    if v_profile.registration_deposit_paid then
      raise exception 'Registration deposit has already been confirmed.';
    end if;

    update public.profiles
    set registration_deposit_paid = true,
        registration_deposit_amount = v_proof.amount,
        registration_payment_reference = v_proof.reference,
        registration_deposit_confirmed_at = now()
    where id = v_proof.user_id;

    perform private.me2u_unlock_welcome_bonus(v_proof.user_id);
  else
    raise exception 'Unsupported payment proof type.';
  end if;

  update public.payment_proofs
  set status = 'approved'
  where id = p_proof_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_proof.user_id,
    case
      when v_proof.type = 'registration_deposit' then 'Registration Deposit Approved'
      else 'Payment Approved'
    end,
    case
      when v_proof.type = 'registration_deposit'
      then case
        when v_profile.kyc_verified
        then 'Your registration deposit has been approved and your NGN 2000 welcome bonus has been unlocked.'
        else 'Your registration deposit has been approved. Complete KYC to unlock your NGN 2000 welcome bonus.'
      end
      else 'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
    end
  );
end;
$$;

revoke execute on function private.me2u_unlock_welcome_bonus(uuid) from public, anon, authenticated;
revoke execute on function public.me2u_unlock_welcome_bonus(uuid) from public, anon, authenticated;
revoke execute on function private.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer, boolean) from public, anon, authenticated;
revoke execute on function public.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer, boolean) from public, anon, authenticated;
revoke execute on function private.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) from public, anon, authenticated;
revoke execute on function public.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) from public, anon, authenticated;
revoke execute on function private.me2u_request_platform_loan(uuid, numeric) from public, anon, authenticated;
revoke execute on function private.me2u_accept_marketplace_item(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.me2u_withdraw_wallet(uuid, numeric, numeric, uuid) from public, anon, authenticated;
revoke execute on function private.me2u_withdraw_wallet(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.admin_approve_withdrawal_request(uuid) from public, anon;
revoke execute on function public.admin_approve_payment_proof(uuid) from public, anon;

grant execute on function private.me2u_unlock_welcome_bonus(uuid) to service_role;
grant execute on function public.me2u_unlock_welcome_bonus(uuid) to service_role;
grant execute on function private.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer, boolean) to service_role;
grant execute on function public.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer, boolean) to service_role;
grant execute on function private.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) to service_role;
grant execute on function public.me2u_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) to service_role;
grant execute on function private.me2u_request_platform_loan(uuid, numeric) to service_role;
grant execute on function private.me2u_accept_marketplace_item(uuid, uuid) to service_role;
grant execute on function private.me2u_withdraw_wallet(uuid, numeric, numeric, uuid) to service_role;
grant execute on function private.me2u_withdraw_wallet(uuid, numeric) to service_role;
grant execute on function public.admin_approve_withdrawal_request(uuid) to authenticated;
grant execute on function public.admin_approve_payment_proof(uuid) to authenticated;


-- ============================================================
-- Migration: 20260519174839_global_profile_preferences.sql
-- ============================================================

alter table public.profiles
add column if not exists country_code text not null default 'NG',
add column if not exists preferred_currency text not null default 'NGN',
add column if not exists preferred_language text not null default 'en';

update public.profiles
set country_code = coalesce(nullif(country_code, ''), 'NG'),
    preferred_currency = coalesce(nullif(preferred_currency, ''), 'NGN'),
    preferred_language = coalesce(nullif(preferred_language, ''), 'en');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_country_code_supported'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_country_code_supported
    check (country_code in ('NG', 'GH', 'KE', 'ZA', 'GB', 'US', 'CA', 'AE'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_currency_supported'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_preferred_currency_supported
    check (preferred_currency in ('NGN', 'GHS', 'KES', 'ZAR', 'GBP', 'USD', 'CAD', 'AED'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_language_supported'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_preferred_language_supported
    check (preferred_language in ('en', 'fr', 'sw', 'ar', 'pt'));
  end if;
end;
$$;

create index if not exists profiles_country_code_idx
on public.profiles (country_code);

comment on column public.profiles.country_code is
'User-selected onboarding country. Lending remains country-gated until local requirements are ready.';

comment on column public.profiles.preferred_currency is
'Display currency derived from the selected onboarding country.';

comment on column public.profiles.preferred_language is
'User-selected language preference for global-ready onboarding.';


-- ============================================================
-- Migration: 20260520000000_add_transaction_pin.sql
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transaction_pin text;


-- ============================================================
-- Migration: 20260520010000_add_group_lending.sql
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_lending_enabled boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pool_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (pool_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id uuid REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read all circles" ON public.circles;
CREATE POLICY "Authenticated users can read all circles"
ON public.circles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create circles" ON public.circles;
CREATE POLICY "Users can create circles"
ON public.circles FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creator can update or delete circle" ON public.circles;
CREATE POLICY "Creator can update or delete circle"
ON public.circles FOR ALL TO authenticated USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can read circle members" ON public.circle_members;
CREATE POLICY "Authenticated users can read circle members"
ON public.circle_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Circle members can manage members" ON public.circle_members;
CREATE POLICY "Circle members can manage members"
ON public.circle_members FOR ALL TO authenticated USING (true);


-- ============================================================
-- Migration: 20260520111355_real_user_growth_features.sql
-- ============================================================

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  locked boolean not null default true,
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_deals (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,
  category text not null,
  title text not null,
  description text not null,
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  country_code text not null default 'NG',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_deal_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.merchant_deals(id) on delete cascade,
  status text not null default 'claimed' check (status in ('claimed', 'redeemed', 'expired')),
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

create table if not exists public.learning_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'wallet_frozen',
      'wallet_unfrozen',
      'fraud_reported',
      'recovery_requested',
      'trusted_device_reviewed',
      'session_reviewed',
      'mfa_started'
    )
  ),
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_security_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wallet_frozen boolean not null default false,
  trusted_device_label text,
  updated_at timestamptz not null default now()
);

create table if not exists public.support_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  beneficiary_name text not null check (char_length(trim(beneficiary_name)) between 2 and 120),
  relationship text not null default 'Family',
  purpose text not null default 'Family support',
  support_mode text not null default 'non_repayment' check (support_mode in ('repayment', 'non_repayment')),
  verified boolean not null default false,
  last_support_amount numeric(14, 2) not null default 0 check (last_support_amount >= 0),
  spending_proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savings_goals_user_status_idx on public.savings_goals (user_id, status, created_at desc);
create index if not exists merchant_deals_active_country_idx on public.merchant_deals (active, country_code, category);
create index if not exists merchant_deal_claims_user_idx on public.merchant_deal_claims (user_id, created_at desc);
create index if not exists learning_progress_user_idx on public.learning_progress (user_id, completed_at desc);
create index if not exists security_events_user_created_idx on public.security_events (user_id, created_at desc);
create index if not exists support_beneficiaries_sponsor_idx on public.support_beneficiaries (sponsor_id, created_at desc);

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

drop trigger if exists user_security_settings_set_updated_at on public.user_security_settings;
create trigger user_security_settings_set_updated_at
before update on public.user_security_settings
for each row execute function public.set_updated_at();

drop trigger if exists support_beneficiaries_set_updated_at on public.support_beneficiaries;
create trigger support_beneficiaries_set_updated_at
before update on public.support_beneficiaries
for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;
alter table public.merchant_deals enable row level security;
alter table public.merchant_deal_claims enable row level security;
alter table public.learning_progress enable row level security;
alter table public.security_events enable row level security;
alter table public.user_security_settings enable row level security;
alter table public.support_beneficiaries enable row level security;

grant select, insert, update, delete on public.savings_goals to authenticated;
grant select on public.merchant_deals to anon, authenticated;
grant select, insert, update on public.merchant_deal_claims to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;
grant select, insert on public.security_events to authenticated;
grant select, insert, update on public.user_security_settings to authenticated;
grant select, insert, update, delete on public.support_beneficiaries to authenticated;

drop policy if exists "Users can manage their savings goals" on public.savings_goals;
create policy "Users can manage their savings goals"
on public.savings_goals for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Anyone can read active merchant deals" on public.merchant_deals;
create policy "Anyone can read active merchant deals"
on public.merchant_deals for select to anon, authenticated
using (active = true);

drop policy if exists "Users can manage their deal claims" on public.merchant_deal_claims;
create policy "Users can manage their deal claims"
on public.merchant_deal_claims for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their learning progress" on public.learning_progress;
create policy "Users can manage their learning progress"
on public.learning_progress for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read and create their security events" on public.security_events;
create policy "Users can read and create their security events"
on public.security_events for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their security settings" on public.user_security_settings;
create policy "Users can manage their security settings"
on public.user_security_settings for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage support beneficiaries" on public.support_beneficiaries;
create policy "Users can manage support beneficiaries"
on public.support_beneficiaries for all to authenticated
using (sponsor_id = auth.uid())
with check (sponsor_id = auth.uid());

insert into public.merchant_deals (merchant_name, category, title, description, discount_percent, country_code)
values
  ('Campus Food Partner', 'Food', '5% off verified meal orders', 'Claim this deal and show it to a verified food vendor before wallet payment.', 5, 'NG'),
  ('CarePlus Pharmacy', 'Health', 'Medicine support discount', 'Use Me2U wallet records when buying from participating pharmacy partners.', 4, 'NG'),
  ('SkillBridge Training', 'Education', 'Training enrollment deal', 'Claim before paying for approved short courses or skill programs.', 7, 'NG'),
  ('PrintHub Business', 'Business', 'Print and design savings', 'Small businesses can claim this before print or document services.', 5, 'NG'),
  ('PhoneMart Verified', 'Devices', 'Phone accessory discount', 'Claim for verified phone accessories from participating merchants.', 3, 'NG')
on conflict do nothing;

comment on column public.profiles.transaction_pin is
'Stores a server-generated PIN verifier only. Legacy 4-digit values are cleared by the 20260520111355 migration.';

update public.profiles
set transaction_pin = null
where transaction_pin ~ '^[0-9]{4}$';

create or replace function private.me2u_refresh_trust_score(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile record;
  v_completed_loans integer;
  v_active_loans integer;
  v_wallet_activity integer;
  v_referrals integer;
  v_age_days integer;
  v_verified_contacts integer;
  v_score integer;
begin
  select p.*
  into v_profile
  from public.profiles p
  where p.id = p_user_id;

  if v_profile is null then
    return 0;
  end if;

  select count(*)::integer
  into v_completed_loans
  from public.loans l
  where (l.borrower_id = p_user_id or l.lender_id = p_user_id)
    and l.status = 'completed';

  select count(*)::integer
  into v_active_loans
  from public.loans l
  where (l.borrower_id = p_user_id or l.lender_id = p_user_id)
    and l.status = 'active';

  select count(*)::integer
  into v_wallet_activity
  from public.transactions t
  where t.user_id = p_user_id;

  select count(*)::integer
  into v_referrals
  from public.affiliate_rewards a
  where a.referrer_id = p_user_id;

  v_age_days := greatest(0, floor(extract(epoch from (now() - v_profile.created_at)) / 86400)::integer);
  v_verified_contacts :=
    (case when coalesce(v_profile.email, '') <> '' then 1 else 0 end) +
    (case when coalesce(v_profile.phone, '') <> '' then 1 else 0 end) +
    (case when coalesce(v_profile.kyc_verified, false) then 1 else 0 end);

  v_score :=
    case when coalesce(v_profile.kyc_verified, false) then 18 when coalesce(v_profile.registration_deposit_paid, false) then 8 else 0 end +
    case when v_completed_loans > 0 then 18 when v_active_loans > 0 then 9 else 0 end +
    case when v_wallet_activity >= 5 then 12 when v_wallet_activity > 0 then 7 else 0 end +
    case when v_referrals >= 5 then 10 when v_referrals > 0 then 7 else 0 end +
    case when v_completed_loans >= 3 then 12 when v_completed_loans > 0 then 8 when v_active_loans > 0 then 4 else 0 end +
    10 +
    case when v_age_days >= 90 then 8 when v_age_days >= 30 then 5 when v_age_days > 0 then 2 else 0 end +
    case when v_verified_contacts >= 3 then 7 when v_verified_contacts >= 2 then 5 when v_verified_contacts > 0 then 2 else 0 end +
    case when v_completed_loans > 0 then 5 else 0 end;

  v_score := least(100, greatest(0, v_score));

  update public.profiles
  set trust_score = v_score
  where id = p_user_id;

  return v_score;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.user_id);
  return new;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_loan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.borrower_id);
  if new.lender_id is not null then
    perform private.me2u_refresh_trust_score(new.lender_id);
  end if;
  return new;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_affiliate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.referrer_id);
  return new;
end;
$$;

drop trigger if exists transactions_refresh_trust_score on public.transactions;
create trigger transactions_refresh_trust_score
after insert on public.transactions
for each row execute function private.me2u_refresh_trust_score_from_transaction();

drop trigger if exists loans_refresh_trust_score on public.loans;
create trigger loans_refresh_trust_score
after insert or update of status on public.loans
for each row execute function private.me2u_refresh_trust_score_from_loan();

drop trigger if exists affiliate_rewards_refresh_trust_score on public.affiliate_rewards;
create trigger affiliate_rewards_refresh_trust_score
after insert on public.affiliate_rewards
for each row execute function private.me2u_refresh_trust_score_from_affiliate();

do $$
declare
  v_profile_id uuid;
begin
  for v_profile_id in select id from public.profiles loop
    perform private.me2u_refresh_trust_score(v_profile_id);
  end loop;
end;
$$;

do $$
begin
  alter table public.circles replica identity full;
  alter table public.circle_members replica identity full;
  alter table public.savings_goals replica identity full;
  alter table public.learning_progress replica identity full;
  alter table public.merchant_deal_claims replica identity full;
  alter table public.security_events replica identity full;
  alter table public.user_security_settings replica identity full;
  alter table public.support_beneficiaries replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.circles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.circle_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;


-- ============================================================
-- Migration: 20260521000000_tiered_security_deposit.sql
-- ============================================================

-- Tiered Security Deposit & Duration Model
-- Applies to both platform and peer-to-peer loans.
-- Trust tiers are stored in a table so admins can adjust thresholds without code changes.

-- â”€â”€â”€ 1. Trust Tiers Table â”€â”€â”€

create table if not exists public.trust_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  min_score integer not null check (min_score >= 0),
  max_score integer not null check (max_score <= 100),
  deposit_rate numeric(4,2) not null check (deposit_rate between 0 and 1),
  max_duration_days integer not null check (max_duration_days > 0),
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  constraint valid_tier_range check (min_score < max_score)
);

-- Seed default tiers
insert into public.trust_tiers (label, min_score, max_score, deposit_rate, max_duration_days, sort_order)
values
  ('Standard', 0, 50, 0.50, 14, 1),
  ('Building', 51, 65, 0.40, 14, 2),
  ('Trusted', 66, 80, 0.25, 14, 3),
  ('Gold', 81, 95, 0.10, 30, 4),
  ('Premium', 96, 100, 0.00, 60, 5)
on conflict (label) do nothing;

-- Enable RLS on trust_tiers (read-only for everyone, write for service_role)
alter table public.trust_tiers enable row level security;

drop policy if exists "Anyone can read trust tiers" on public.trust_tiers;
create policy "Anyone can read trust tiers"
  on public.trust_tiers for select to anon, authenticated
  using (true);

grant select on public.trust_tiers to anon, authenticated;
grant all on public.trust_tiers to service_role;

-- â”€â”€â”€ 2. Add security_deposit to loans â”€â”€â”€

alter table public.loans
  add column if not exists security_deposit numeric(14,2) not null default 0;

-- â”€â”€â”€ 3. Tier Calculation Functions â”€â”€â”€

-- Get the trust tier for a given score
create or replace function private.me2u_get_trust_tier(p_trust_score integer)
returns public.trust_tiers
language plpgsql
security definer set search_path = ''
as $$
declare v_tier public.trust_tiers;
begin
  select * into v_tier
  from public.trust_tiers
  where p_trust_score between min_score and max_score
  order by sort_order desc
  limit 1;

  if v_tier is null then
    select * into v_tier from public.trust_tiers where label = 'Standard' limit 1;
  end if;

  return v_tier;
end;
$$;

-- Calculate security deposit for a loan amount given trust score
create or replace function private.me2u_calculate_deposit(p_amount numeric, p_trust_score integer)
returns numeric
language plpgsql
security definer set search_path = ''
as $$
declare v_tier public.trust_tiers;
begin
  v_tier := private.me2u_get_trust_tier(p_trust_score);
  return round(p_amount * v_tier.deposit_rate, 2);
end;
$$;

-- Get max loan duration for a trust score
create or replace function private.me2u_get_max_duration(p_trust_score integer)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare v_tier public.trust_tiers;
begin
  v_tier := private.me2u_get_trust_tier(p_trust_score);
  return v_tier.max_duration_days;
end;
$$;

-- Get tier label for a trust score
create or replace function private.me2u_get_tier_label(p_trust_score integer)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare v_tier public.trust_tiers;
begin
  v_tier := private.me2u_get_trust_tier(p_trust_score);
  return v_tier.label;
end;
$$;

-- â”€â”€â”€ 4. Modified: me2u_accept_marketplace_item (peer loans with tiered deposit) â”€â”€â”€

create or replace function private.me2u_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.marketplace_items%rowtype;
  v_amount numeric;
  v_borrower_id uuid;
  v_lender_id uuid;
  v_updated integer;
  v_borrower_trust_score integer;
  v_deposit numeric;
  v_max_duration integer;
begin
  select *
  into v_item
  from public.marketplace_items
  where id = p_item_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Marketplace listing is no longer available.';
  end if;

  if v_item.author_id = p_user_id then
    raise exception 'You cannot accept your own listing.';
  end if;

  v_amount := round(v_item.amount, 2);

  if v_item.type = 'borrow_request' then
    v_borrower_id := v_item.author_id;
    v_lender_id := p_user_id;
  else
    v_borrower_id := p_user_id;
    v_lender_id := v_item.author_id;
  end if;

  -- Look up borrower's trust score
  select trust_score into v_borrower_trust_score
  from public.profiles
  where id = v_borrower_id;

  if v_borrower_trust_score is null then
    raise exception 'Borrower profile not found.';
  end if;

  -- Calculate deposit and max duration from tier
  v_deposit := private.me2u_calculate_deposit(v_amount, v_borrower_trust_score);
  v_max_duration := private.me2u_get_max_duration(v_borrower_trust_score);

  -- Validate duration against borrower's tier
  if v_item.days > v_max_duration then
    raise exception 'This %-day loan requires % tier (your max: % days).',
      v_item.days,
      private.me2u_get_tier_label(v_borrower_trust_score),
      v_max_duration;
  end if;

  -- Lender locks full amount
  update public.wallets
  set balance = balance - v_amount,
      locked = locked + v_amount
  where user_id = v_lender_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender has insufficient available balance.';
  end if;

  -- Borrower receives full amount
  update public.wallets
  set balance = balance + v_amount
  where user_id = v_borrower_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Borrower wallet not found.';
  end if;

  -- Lock borrower's security deposit (if any)
  if v_deposit > 0 then
    update public.wallets
    set balance = balance - v_deposit,
        locked = locked + v_deposit
    where user_id = v_borrower_id
      and balance >= v_deposit;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      -- Rollback lender changes
      update public.wallets
      set balance = balance + v_amount,
          locked = locked - v_amount
      where user_id = v_lender_id;

      -- Rollback borrower full amount
      update public.wallets
      set balance = balance - v_amount
      where user_id = v_borrower_id;

      raise exception 'Borrower must have â‚¦% in wallet as security deposit.', v_deposit;
    end if;
  end if;

  update public.marketplace_items
  set status = 'funded'
  where id = v_item.id;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    funding_source,
    security_deposit,
    status,
    due_date
  )
  values (
    v_amount,
    v_item.rate,
    v_item.days,
    v_borrower_id,
    v_lender_id,
    'peer_lender',
    v_deposit,
    'active',
    now() + make_interval(days => v_item.days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values
    (v_lender_id, 'investment', v_amount, 'Funded peer loan'),
    (v_borrower_id, 'loan_disbursed', v_amount, 'Loan disbursed to wallet');

  if v_deposit > 0 then
    insert into public.transactions (user_id, type, amount, description)
    values (v_borrower_id, 'deposit_locked', v_deposit, 'Security deposit locked for peer loan');
  end if;
end;
$$;

-- â”€â”€â”€ 5. Modified: me2u_repay_loan (unlock deposit on repayment) â”€â”€â”€

create or replace function private.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan public.loans%rowtype;
  v_repayment_amount numeric;
  v_updated integer;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and borrower_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'This loan cannot be repaid from this account.';
  end if;

  v_repayment_amount := round(v_loan.amount + ((v_loan.amount * v_loan.rate) / 100), 2);

  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

  -- Unlock lender's locked amount
  update public.wallets
  set locked = locked - v_loan.amount,
      balance = balance + v_repayment_amount
  where user_id = v_loan.lender_id
    and locked >= v_loan.amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender locked balance is inconsistent.';
  end if;

  -- Unlock borrower's security deposit back to usable balance
  if v_loan.security_deposit > 0 then
    update public.wallets
    set locked = locked - v_loan.security_deposit,
        balance = balance + v_loan.security_deposit
    where user_id = p_user_id
      and locked >= v_loan.security_deposit;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Borrower locked balance is inconsistent for deposit unlock.';
    end if;
  end if;

  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  insert into public.transactions (user_id, type, amount, description)
  values
    (p_user_id, 'loan_repayment', v_repayment_amount, 'Loan Repayment (Principal + Interest)'),
    (v_loan.lender_id, 'repayment_received', v_repayment_amount, 'Loan repayment received');

  if v_loan.security_deposit > 0 then
    insert into public.transactions (user_id, type, amount, description)
    values (p_user_id, 'deposit_unlocked', v_loan.security_deposit, 'Security deposit unlocked after repayment');
  end if;
end;
$$;

-- â”€â”€â”€ 6. Modified: me2u_request_platform_loan (tiered deposit + duration) â”€â”€â”€

create or replace function private.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null,
  p_days integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration_deposit_paid boolean;
  v_kyc_verified boolean;
  v_active_platform_loans integer;
  v_amount numeric(14, 2);
  v_loan_days integer;
  v_trust_score integer;
  v_deposit numeric(14, 2);
  v_max_duration integer;
  v_wallet_balance numeric(14, 2);
  v_shortfall numeric(14, 2);
  v_updated integer;
begin
  select registration_deposit_paid, kyc_verified, trust_score
  into v_registration_deposit_paid, v_kyc_verified, v_trust_score
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if not v_registration_deposit_paid then
    raise exception 'Confirm your registration deposit before requesting a loan.';
  end if;

  if not v_kyc_verified then
    raise exception 'Complete KYC before requesting a loan.';
  end if;

  select balance
  into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  select count(*)
  into v_active_platform_loans
  from public.loans
  where borrower_id = p_user_id
    and lender_id is null
    and status = 'active';

  if v_active_platform_loans > 0 then
    raise exception 'Repay your active loan before requesting another one.';
  end if;

  v_amount := coalesce(round(p_amount, 2), 5000.00);

  if v_amount < 5000.00 then
    raise exception 'Loans start from NGN 5,000.';
  end if;

  -- Tiered deposit and duration
  v_deposit := private.me2u_calculate_deposit(v_amount, v_trust_score);
  v_max_duration := private.me2u_get_max_duration(v_trust_score);

  -- Use provided days or default to max for tier
  v_loan_days := coalesce(p_days, v_max_duration);

  if v_loan_days > v_max_duration then
    raise exception 'Your tier allows max % days. Current tier: %.',
      v_max_duration, private.me2u_get_tier_label(v_trust_score);
  end if;

  if v_loan_days < 1 then
    raise exception 'Loan duration must be at least 1 day.';
  end if;

  -- Check borrower has enough for deposit
  if v_deposit > 0 and v_wallet_balance < v_deposit then
    v_shortfall := round(v_deposit - v_wallet_balance, 2);
    raise exception 'Fund NGN % first. The %%% deposit of NGN % must remain in your wallet.',
      v_shortfall,
      round(v_deposit / v_amount * 100, 0),
      v_deposit;
  end if;

  -- Disburse loan amount
  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  -- Lock security deposit
  if v_deposit > 0 then
    update public.wallets
    set balance = balance - v_deposit,
        locked = locked + v_deposit
    where user_id = p_user_id;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      -- Rollback disbursement
      update public.wallets
      set balance = balance - v_amount
      where user_id = p_user_id;

      raise exception 'Failed to lock security deposit.';
    end if;
  end if;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    funding_source,
    security_deposit,
    status,
    due_date
  )
  values (
    v_amount,
    0,
    v_loan_days,
    p_user_id,
    null,
    'me2u_balance_sheet',
    v_deposit,
    'active',
    now() + make_interval(days => v_loan_days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_disbursed',
    v_amount,
    'Platform loan disbursed with ' || private.me2u_get_tier_label(v_trust_score) || ' tier deposit'
  );

  if v_deposit > 0 then
    insert into public.transactions (user_id, type, amount, description)
    values (p_user_id, 'deposit_locked', v_deposit, 'Security deposit locked for platform loan');
  end if;
end;
$$;

-- â”€â”€â”€ 7. NEW: me2u_process_loan_defaults (auto-transfer deposit after 7 days past due) â”€â”€â”€

create or replace function private.me2u_process_loan_defaults()
returns table(loan_id uuid, borrower_id uuid, lender_id uuid, deposit_transferred numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan record;
  v_updated integer;
begin
  for v_loan in
    select l.*, p.trust_score
    from public.loans l
    join public.profiles p on p.id = l.borrower_id
    where l.status = 'active'
      and l.due_date < now() - interval '7 days'
      and l.security_deposit > 0
  loop
    -- Transfer security deposit from borrower locked to lender balance
    update public.wallets
    set locked = locked - v_loan.security_deposit,
        balance = balance + v_loan.security_deposit
    where user_id = v_loan.lender_id
      and locked >= 0;

    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      -- Lender wallet might not exist, create transaction record anyway
      null;
    end if;

    -- Remove deposit from borrower's locked
    update public.wallets
    set locked = locked - v_loan.security_deposit
    where user_id = v_loan.borrower_id;

    -- Record transactions
    insert into public.transactions (user_id, type, amount, description)
    values
      (v_loan.borrower_id, 'deposit_forfeited', v_loan.security_deposit, 'Security deposit forfeited â€” loan defaulted'),
      (v_loan.lender_id, 'deposit_recovery', v_loan.security_deposit, 'Security deposit recovered from defaulted loan');

    -- Mark loan as defaulted
    update public.loans
    set status = 'completed'
    where id = v_loan.id;

    loan_id := v_loan.id;
    borrower_id := v_loan.borrower_id;
    lender_id := v_loan.lender_id;
    deposit_transferred := v_loan.security_deposit;
    return next;
  end loop;
end;
$$;

-- â”€â”€â”€ 8. Public wrapper functions â”€â”€â”€

create or replace function public.me2u_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_accept_marketplace_item(p_user_id, p_item_id);
$$;

create or replace function public.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_repay_loan(p_user_id, p_loan_id);
$$;

create or replace function public.me2u_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null,
  p_days integer default null
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_request_platform_loan(p_user_id, p_amount, p_days);
$$;

create or replace function public.me2u_process_loan_defaults()
returns table(loan_id uuid, borrower_id uuid, lender_id uuid, deposit_transferred numeric)
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select * from private.me2u_process_loan_defaults();
$$;

-- â”€â”€â”€ 9. Permissions â”€â”€â”€

grant select on public.trust_tiers to authenticated;
grant all on public.trust_tiers to service_role;

-- â”€â”€â”€ 10. Update existing loans without security_deposit â”€â”€â”€

-- For existing active peer loans, calculate and set deposit based on borrower's current trust score
update public.loans l
set security_deposit = private.me2u_calculate_deposit(l.amount, p.trust_score)
from public.profiles p
where l.borrower_id = p.id
  and l.security_deposit = 0
  and l.status = 'active'
  and l.lender_id is not null;

-- â”€â”€â”€ 11. Replica identity for realtime â”€â”€â”€

do $$
begin
  alter table public.trust_tiers replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.trust_tiers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;


-- ============================================================
-- Migration: 20260521000001_paystack_withdrawals.sql
-- ============================================================

-- Paystack Integration for Automated Withdrawals
-- Extends the existing withdrawal_requests table with Paystack transfer details.

-- â”€â”€â”€ 1. Add Paystack columns to withdrawal_requests â”€â”€â”€

alter table public.withdrawal_requests
  add column if not exists fee numeric(14,2) not null default 0,
  add column if not exists net_amount numeric(14,2) not null default 0,
  add column if not exists bank_code text,
  add column if not exists account_name text,
  add column if not exists paystack_recipient_code text,
  add column if not exists paystack_transfer_code text,
  add column if not exists paystack_reference text;

-- Add fee_amount column if it doesn't exist (from previous migrations)
alter table public.withdrawal_requests
  add column if not exists fee_amount numeric(14,2) not null default 0;

-- Update the status enum to include processing, success, failed, reversed
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'processing'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'processing';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'success'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'success';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'failed'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'failed';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reversed'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'reversed';
  end if;
end;
$$;

-- â”€â”€â”€ 2. Helper RPC for refunds (failed/reversed transfers) â”€â”€â”€

create or replace function private.me2u_increment_balance(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_updated integer;
begin
  update public.wallets
  set balance = balance + round(p_amount, 2)
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found for refund.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'deposit', round(p_amount, 2), 'Withdrawal refund â€” transfer failed or reversed');
end;
$$;

create or replace function public.me2u_increment_balance(p_user_id uuid, p_amount numeric)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_increment_balance(p_user_id, p_amount);
$$;

revoke execute on function public.me2u_increment_balance(uuid, numeric) from public, anon;
grant execute on function public.me2u_increment_balance(uuid, numeric) to service_role;

-- â”€â”€â”€ 3. Function to process Paystack withdrawal (called from Edge Function) â”€â”€â”€

create or replace function private.me2u_initiate_paystack_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_fee numeric,
  p_net_amount numeric,
  p_bank_code text,
  p_account_number text,
  p_account_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet_balance numeric(14, 2);
  v_updated integer;
  v_request_id uuid;
  v_total_debit numeric(14, 2);
begin
  -- Check available balance (balance - locked)
  select balance into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  v_total_debit := round(p_amount + p_fee, 2);

  if v_wallet_balance < v_total_debit then
    raise exception 'Insufficient available balance. Required: â‚¦%, Available: â‚¦%',
      v_total_debit, v_wallet_balance;
  end if;

  -- Deduct from wallet immediately (optimistic)
  update public.wallets
  set balance = balance - v_total_debit
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet update failed.';
  end if;

  -- Record transaction
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'withdrawal', v_total_debit, 'Withdrawal to ' || p_account_name || ' (Paystack)');

  -- Create withdrawal request
  insert into public.withdrawal_requests (
    user_id,
    amount,
    fee,
    fee_amount,
    net_amount,
    bank_code,
    account_number,
    account_name,
    status
  )
  values (
    p_user_id,
    p_amount,
    p_fee,
    p_fee,
    p_net_amount,
    p_bank_code,
    p_account_number,
    p_account_name,
    'processing'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- â”€â”€â”€ 4. Function to confirm successful transfer (called from webhook) â”€â”€â”€

create or replace function private.me2u_confirm_withdrawal_success(
  p_request_id uuid,
  p_transfer_code text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.withdrawal_requests
  set status = 'success',
      paystack_transfer_code = p_transfer_code,
      paystack_reference = p_reference,
      processed_at = now()
  where id = p_request_id
    and status = 'processing';

  if not found then
    raise exception 'Withdrawal request not found or not in processing state.';
  end if;
end;
$$;

-- â”€â”€â”€ 5. Function to handle failed/reversed transfer (called from webhook) â”€â”€â”€

create or replace function private.me2u_handle_withdrawal_failure(
  p_request_id uuid,
  p_transfer_code text,
  p_reason text default 'Transfer failed'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
begin
  select * into v_request
  from public.withdrawal_requests
  where id = p_request_id
    and paystack_transfer_code = p_transfer_code
  for update;

  if not found then
    raise exception 'Withdrawal request not found for transfer code: %', p_transfer_code;
  end if;

  -- Refund wallet
  perform private.me2u_increment_balance(v_request.user_id, v_request.amount + v_request.fee);

  -- Update status
  update public.withdrawal_requests
  set status = 'failed',
      admin_note = p_reason,
      processed_at = now()
  where id = p_request_id;

  -- Notify user
  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Failed',
    'Your withdrawal of NGN ' || v_request.net_amount || ' failed. Funds have been refunded to your wallet. Reason: ' || p_reason
  );
end;
$$;

-- â”€â”€â”€ 6. Public wrapper functions for Edge Functions â”€â”€â”€

create or replace function public.me2u_initiate_paystack_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_fee numeric,
  p_net_amount numeric,
  p_bank_code text,
  p_account_number text,
  p_account_name text
)
returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_initiate_paystack_withdrawal(
    p_user_id, p_amount, p_fee, p_net_amount, p_bank_code, p_account_number, p_account_name
  );
$$;

create or replace function public.me2u_confirm_withdrawal_success(
  p_request_id uuid,
  p_transfer_code text,
  p_reference text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_confirm_withdrawal_success(p_request_id, p_transfer_code, p_reference);
$$;

create or replace function public.me2u_handle_withdrawal_failure(
  p_request_id uuid,
  p_transfer_code text,
  p_reason text default 'Transfer failed'
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_handle_withdrawal_failure(p_request_id, p_transfer_code, p_reason);
$$;

-- â”€â”€â”€ 7. Permissions â”€â”€â”€

revoke execute on function public.me2u_initiate_paystack_withdrawal(uuid, numeric, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.me2u_initiate_paystack_withdrawal(uuid, numeric, numeric, numeric, text, text, text) to service_role;

revoke execute on function public.me2u_confirm_withdrawal_success(uuid, text, text) from public, anon, authenticated;
grant execute on function public.me2u_confirm_withdrawal_success(uuid, text, text) to service_role;

revoke execute on function public.me2u_handle_withdrawal_failure(uuid, text, text) from public, anon, authenticated;
grant execute on function public.me2u_handle_withdrawal_failure(uuid, text, text) to service_role;

revoke execute on function public.me2u_increment_balance(uuid, numeric) from public, anon, authenticated;
grant execute on function public.me2u_increment_balance(uuid, numeric) to service_role;


-- ============================================================
-- Migration: 20260521000002_earned_credit_referrals.sql
-- ============================================================

-- Earned Credit Referral System
-- Referrers earn wallet credit only when referees generate revenue (withdrawals, loan repayments).
-- Never pays on signup. Wallet credit only â€” must be earned out through their own activity.

-- â”€â”€â”€ 1. Referrals Table â”€â”€â”€

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  first_withdrawal_rewarded boolean not null default false,
  first_repayment_rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unique_referral_pair unique (referrer_id, referee_id),
  constraint no_self_referral check (referrer_id <> referee_id)
);

create index if not exists referrals_referee_idx on public.referrals(referee_id);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id);
create index if not exists referrals_pending_rewards_idx on public.referrals(referee_id)
  where first_withdrawal_rewarded = false or first_repayment_rewarded = false;

-- â”€â”€â”€ 2. RLS Policies â”€â”€â”€

alter table public.referrals enable row level security;

drop policy if exists "Users can read their own referrals" on public.referrals;
create policy "Users can read their own referrals"
  on public.referrals for select to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referee_id);

drop policy if exists "Users can create referrals for their referees" on public.referrals;
create policy "Users can create referrals for their referees"
  on public.referrals for insert to authenticated
  with check (auth.uid() = referrer_id);

grant select, insert, update on public.referrals to authenticated;
grant all on public.referrals to service_role;

-- â”€â”€â”€ 3. Referral Reward Amount â”€â”€â”€

-- â‚¦250 per milestone, â‚¦500 max per referral
-- Stored as a constant in the function for easy adjustment

-- â”€â”€â”€ 4. Trigger: Reward on First Successful Withdrawal â”€â”€â”€

create or replace function private.me2u_handle_referral_withdrawal_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 250;
  v_updated integer;
begin
  -- Only fires on transition to success status
  if new.status = 'success' and old.status in ('pending', 'processing') then
    -- Find the referral where referee is this user and reward not yet given
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.user_id
      and first_withdrawal_rewarded = false
    limit 1;

    if v_referrer_id is not null then
      -- Credit referrer wallet
      update public.wallets
      set balance = balance + v_reward
      where user_id = v_referrer_id;

      get diagnostics v_updated = row_count;
      if v_updated = 1 then
        -- Mark rewarded
        update public.referrals
        set first_withdrawal_rewarded = true
        where referee_id = new.user_id
          and referrer_id = v_referrer_id;

        -- Log transaction
        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward â€” first withdrawal by referee');

        -- Notify referrer
        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          'You earned â‚¦250 wallet credit because your referral completed their first withdrawal.'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists referral_withdrawal_trigger on public.withdrawal_requests;
create trigger referral_withdrawal_trigger
  after update on public.withdrawal_requests
  for each row
  execute function private.me2u_handle_referral_withdrawal_reward();

-- â”€â”€â”€ 5. Trigger: Reward on First Loan Repayment â”€â”€â”€

create or replace function private.me2u_handle_referral_repayment_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 250;
  v_updated integer;
begin
  -- Only fires when a loan transitions to completed
  if new.status = 'completed' and old.status = 'active' then
    -- Find the referral where referee is this borrower and reward not yet given
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.borrower_id
      and first_repayment_rewarded = false
    limit 1;

    if v_referrer_id is not null then
      -- Credit referrer wallet
      update public.wallets
      set balance = balance + v_reward
      where user_id = v_referrer_id;

      get diagnostics v_updated = row_count;
      if v_updated = 1 then
        -- Mark rewarded
        update public.referrals
        set first_repayment_rewarded = true
        where referee_id = new.borrower_id
          and referrer_id = v_referrer_id;

        -- Log transaction
        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward â€” first loan repayment by referee');

        -- Notify referrer
        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          'You earned â‚¦250 wallet credit because your referral completed their first loan repayment.'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists referral_repayment_trigger on public.loans;
create trigger referral_repayment_trigger
  after update on public.loans
  for each row
  execute function private.me2u_handle_referral_repayment_reward();

-- â”€â”€â”€ 6. Function: Record Referral (called during registration) â”€â”€â”€

create or replace function private.me2u_record_referral(
  p_referrer_id uuid,
  p_referee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_referrer_id = p_referee_id then
    return; -- No self-referrals
  end if;

  insert into public.referrals (referrer_id, referee_id)
  values (p_referrer_id, p_referee_id)
  on conflict (referrer_id, referee_id) do nothing;
end;
$$;

create or replace function public.me2u_record_referral(
  p_referrer_id uuid,
  p_referee_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_record_referral(p_referrer_id, p_referee_id);
$$;

grant execute on function public.me2u_record_referral(uuid, uuid) to authenticated;

-- â”€â”€â”€ 7. Function: Get Referral Stats for a User â”€â”€â”€

create or replace function public.me2u_get_referral_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_referrals integer;
  v_pending_withdrawal integer;
  v_pending_repayment integer;
  v_earned_withdrawal integer;
  v_earned_repayment integer;
  v_total_earned numeric;
begin
  select count(*) into v_total_referrals
  from public.referrals
  where referrer_id = p_user_id;

  select count(*) into v_pending_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = false;

  select count(*) into v_pending_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = false;

  select count(*) into v_earned_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = true;

  select count(*) into v_earned_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = true;

  v_total_earned := (v_earned_withdrawal * 250) + (v_earned_repayment * 250);

  return json_build_object(
    'total_referrals', v_total_referrals,
    'pending_withdrawal', v_pending_withdrawal,
    'pending_repayment', v_pending_repayment,
    'earned_withdrawal', v_earned_withdrawal,
    'earned_repayment', v_earned_repayment,
    'total_earned', v_total_earned
  );
end;
$$;

grant execute on function public.me2u_get_referral_stats(uuid) to authenticated;

-- â”€â”€â”€ 8. Function: Get Referral Details with Progress â”€â”€â”€

create or replace function public.me2u_get_referral_details(p_user_id uuid)
returns table(
  referee_id uuid,
  referee_name text,
  referee_email text,
  referee_trust_score integer,
  referee_kyc_verified boolean,
  signed_up_at timestamptz,
  first_withdrawal_rewarded boolean,
  first_repayment_rewarded boolean,
  pending_rewards text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    r.referee_id,
    p.first_name || ' ' || p.last_name as referee_name,
    p.email as referee_email,
    p.trust_score as referee_trust_score,
    p.kyc_verified as referee_kyc_verified,
    r.created_at as signed_up_at,
    r.first_withdrawal_rewarded,
    r.first_repayment_rewarded,
    case
      when not r.first_withdrawal_rewarded and not r.first_repayment_rewarded then 'â‚¦500 pending (2 steps)'
      when not r.first_withdrawal_rewarded and r.first_repayment_rewarded then 'â‚¦250 pending (withdrawal)'
      when r.first_withdrawal_rewarded and not r.first_repayment_rewarded then 'â‚¦250 pending (repayment)'
      else 'â‚¦500 earned'
    end as pending_rewards
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id
  order by r.created_at desc;
end;
$$;

grant execute on function public.me2u_get_referral_details(uuid) to authenticated;

-- â”€â”€â”€ 9. Replica Identity for Realtime â”€â”€â”€

do $$
begin
  alter table public.referrals replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.referrals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;


-- ============================================================
-- Migration: 20260521000003_fix_repayment_and_defaults.sql
-- ============================================================

-- Fix: Repayment and default processing bugs for platform loans
-- BUG 1: me2u_repay_loan fails for platform loans (lender_id is NULL)
--   because it tries to unlock a non-existent lender's locked balance.
-- BUG 2: me2u_process_loan_defaults tries to transfer deposit to NULL lender.
--
-- FIX: Skip lender balance operations when lender_id is NULL (platform loans).
-- Platform loans are balance-sheet loans: money is created on disbursement
-- and removed from circulation on repayment. No lender wallet is involved.

-- â”€â”€â”€ 1. Fixed: me2u_repay_loan â”€â”€â”€

create or replace function private.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan public.loans%rowtype;
  v_repayment_amount numeric;
  v_updated integer;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and borrower_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'This loan cannot be repaid from this account.';
  end if;

  v_repayment_amount := round(v_loan.amount + ((v_loan.amount * v_loan.rate) / 100), 2);

  -- Debit borrower's balance for repayment
  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

  -- For PEER loans: unlock lender's locked principal and credit repayment to lender
  if v_loan.lender_id is not null then
    update public.wallets
    set locked = locked - v_loan.amount,
        balance = balance + v_repayment_amount
    where user_id = v_loan.lender_id
      and locked >= v_loan.amount;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Lender locked balance is inconsistent.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (v_loan.lender_id, 'repayment_received', v_repayment_amount, 'Loan repayment received');
  end if;
  -- For PLATFORM loans (lender_id is NULL):
  -- Repayment amount is removed from circulation (no lender to credit).
  -- The principal was created on disbursement, so it disappears on repayment.

  -- Unlock borrower's security deposit back to usable balance
  if v_loan.security_deposit > 0 then
    update public.wallets
    set locked = locked - v_loan.security_deposit,
        balance = balance + v_loan.security_deposit
    where user_id = p_user_id
      and locked >= v_loan.security_deposit;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Borrower locked balance is inconsistent for deposit unlock.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (p_user_id, 'deposit_unlocked', v_loan.security_deposit, 'Security deposit unlocked after repayment');
  end if;

  -- Mark loan as completed
  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  -- Record borrower repayment transaction
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'loan_repayment', v_repayment_amount, 'Loan Repayment (Principal + Interest)');
end;
$$;

-- â”€â”€â”€ 2. Fixed: me2u_process_loan_defaults â”€â”€â”€

create or replace function private.me2u_process_loan_defaults()
returns table(loan_id uuid, borrower_id uuid, lender_id uuid, deposit_transferred numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan record;
  v_updated integer;
begin
  for v_loan in
    select l.*
    from public.loans l
    where l.status = 'active'
      and l.due_date < now() - interval '7 days'
      and l.security_deposit > 0
  loop
    -- Remove security deposit from borrower's locked balance
    update public.wallets
    set locked = locked - v_loan.security_deposit
    where user_id = v_loan.borrower_id
      and locked >= v_loan.security_deposit;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      -- Borrower's locked balance inconsistent, skip this loan
      continue;
    end if;

    -- For PEER loans: transfer forfeited deposit to lender balance
    if v_loan.lender_id is not null then
      update public.wallets
      set balance = balance + v_loan.security_deposit
      where user_id = v_loan.lender_id;

      if not found then
        -- Lender wallet doesn't exist, create it
        insert into public.wallets (user_id, balance, locked)
        values (v_loan.lender_id, v_loan.security_deposit, 0);
      end if;

      insert into public.transactions (user_id, type, amount, description)
      values (v_loan.lender_id, 'deposit_recovery', v_loan.security_deposit, 'Security deposit recovered from defaulted loan');
    end if;
    -- For PLATFORM loans: deposit is forfeited (no lender to receive it).
    -- Simply removed from borrower's locked balance.

    -- Record borrower forfeiture
    insert into public.transactions (user_id, type, amount, description)
    values (v_loan.borrower_id, 'deposit_forfeited', v_loan.security_deposit, 'Security deposit forfeited â€” loan defaulted');

    -- Mark loan as completed (defaulted)
    update public.loans
    set status = 'completed'
    where id = v_loan.id;

    loan_id := v_loan.id;
    borrower_id := v_loan.borrower_id;
    lender_id := v_loan.lender_id;
    deposit_transferred := v_loan.security_deposit;
    return next;
  end loop;
end;
$$;


-- ============================================================
-- Migration: 20260522000000_remove_welcome_bonus_update_referral.sql
-- ============================================================

-- Final Cleanup: Remove Welcome Bonus and Update Referral Logic
-- This file is synchronized with the live Supabase environment fixes.

DO $$ 
BEGIN
    -- 1. Update Referrals Table Structure
    ALTER TABLE public.referrals 
    ADD COLUMN IF NOT EXISTS rewarded BOOLEAN NOT NULL DEFAULT false;

    UPDATE public.referrals
    SET rewarded = true
    WHERE first_withdrawal_rewarded = true AND first_repayment_rewarded = true;

    -- 2. Drop Legacy Bonus Functions
    DROP FUNCTION IF EXISTS public.me2u_unlock_welcome_bonus(uuid);
    DROP FUNCTION IF EXISTS private.me2u_unlock_welcome_bonus(uuid);

    -- 3. Drop existing stats functions to avoid return type conflicts
    DROP FUNCTION IF EXISTS public.me2u_get_referral_details(uuid);
    DROP FUNCTION IF EXISTS public.me2u_get_referral_stats(uuid);
END $$;

-- 4. Update Admin Approval Logic (Remove Bonus Trigger)
CREATE OR REPLACE FUNCTION public.admin_approve_payment_proof(p_proof_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_proof public.payment_proofs%rowtype;
  v_profile public.profiles%rowtype;
  v_admin boolean;
BEGIN
  SELECT exists (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  INTO v_admin;

  IF NOT v_admin THEN RAISE EXCEPTION 'Only admins can approve payments.'; END IF;

  SELECT * INTO v_proof FROM public.payment_proofs WHERE id = p_proof_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment proof not found.'; END IF;
  IF v_proof.status <> 'pending' THEN RAISE EXCEPTION 'Payment proof is not pending.'; END IF;

  IF v_proof.type = 'wallet_funding' THEN
    UPDATE public.wallets SET balance = balance + v_proof.amount WHERE user_id = v_proof.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  ELSIF v_proof.type = 'registration_deposit' THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_proof.user_id FOR UPDATE;
    IF v_profile.registration_deposit_paid THEN RAISE EXCEPTION 'Registration deposit has already been confirmed.'; END IF;

    UPDATE public.profiles
    SET registration_deposit_paid = true,
        registration_deposit_amount = v_proof.amount,
        registration_payment_reference = v_proof.reference,
        registration_deposit_confirmed_at = now()
    WHERE id = v_proof.user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported payment proof type.';
  END IF;

  UPDATE public.payment_proofs SET status = 'approved' WHERE id = p_proof_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_proof.user_id,
    CASE WHEN v_proof.type = 'registration_deposit' THEN 'Registration Deposit Approved' ELSE 'Payment Approved' END,
    CASE WHEN v_proof.type = 'registration_deposit'
      THEN 'Your registration deposit has been approved. You can now request your first loan after completing KYC.'
      ELSE 'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
    END
  );
END;
$$;

-- 5. Update Referral Reward Trigger (KYC + First Loan)
DROP TRIGGER IF EXISTS referral_withdrawal_trigger ON public.withdrawal_requests;
DROP FUNCTION IF EXISTS private.me2u_handle_referral_withdrawal_reward();

CREATE OR REPLACE FUNCTION private.me2u_handle_referral_repayment_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referrer_id uuid;
  v_reward numeric := 500;
  v_referee_kyc_verified boolean;
  v_updated integer;
BEGIN
  IF new.status = 'completed' AND old.status = 'active' THEN
    SELECT kyc_verified INTO v_referee_kyc_verified FROM public.profiles WHERE id = new.borrower_id;
    IF NOT v_referee_kyc_verified THEN RETURN new; END IF;

    SELECT referrer_id INTO v_referrer_id FROM public.referrals
    WHERE referee_id = new.borrower_id AND rewarded = false LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_reward WHERE user_id = v_referrer_id;
      GET DIAGNOSTICS v_updated = row_count;
      IF v_updated = 1 THEN
        UPDATE public.referrals SET rewarded = true, first_repayment_rewarded = true, first_withdrawal_rewarded = true
        WHERE referee_id = new.borrower_id AND referrer_id = v_referrer_id;
        INSERT INTO public.transactions (user_id, type, amount, description)
        VALUES (v_referrer_id, 'deposit', v_reward, 'Referral reward â€” referee completed first loan and KYC');
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (v_referrer_id, 'Referral Reward Earned!', 'You earned â‚¦500 wallet credit because your referral completed their first loan repayment and KYC.');
      END IF;
    END IF;
  END IF;
  return new;
END;
$$;

-- 6. Re-create Statistics Functions with New Schema
CREATE OR REPLACE FUNCTION public.me2u_get_referral_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_referrals integer;
  v_pending_rewards integer;
  v_earned_rewards integer;
  v_total_earned numeric;
BEGIN
  SELECT count(*) INTO v_total_referrals FROM public.referrals WHERE referrer_id = p_user_id;
  SELECT count(*) INTO v_pending_rewards FROM public.referrals WHERE referrer_id = p_user_id AND rewarded = false;
  SELECT count(*) INTO v_earned_rewards FROM public.referrals WHERE referrer_id = p_user_id AND rewarded = true;
  v_total_earned := (v_earned_rewards * 500);

  RETURN json_build_object(
    'total_referrals', v_total_referrals,
    'pending_rewards', v_pending_rewards,
    'earned_rewards', v_earned_rewards,
    'total_earned', v_total_earned
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.me2u_get_referral_details(p_user_id uuid)
RETURNS table(referee_id uuid, referee_name text, referee_email text, referee_trust_score integer, referee_kyc_verified boolean, signed_up_at timestamptz, rewarded boolean, pending_rewards text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT r.referee_id, p.first_name || ' ' || p.last_name, p.email, p.trust_score, p.kyc_verified, r.created_at, r.rewarded,
    CASE WHEN NOT r.rewarded THEN 'â‚¦500 pending (KYC + first loan)' ELSE 'â‚¦500 earned' END
  FROM public.referrals r
  JOIN public.profiles p ON p.id = r.referee_id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$;
               

-- ============================================================
-- Migration: 20260523110905_harden_auth_and_atomic_bill_payments.sql
-- ============================================================

create or replace function private.me2u_pay_bill(
  p_user_id uuid,
  p_amount numeric,
  p_service_label text,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount numeric;
  v_label text;
  v_detail text;
  v_updated integer;
begin
  v_amount := round(coalesce(p_amount, 0), 2);
  v_label := nullif(left(trim(coalesce(p_service_label, 'Bill Payment')), 80), '');
  v_detail := nullif(left(trim(coalesce(p_detail, '')), 160), '');

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  if v_label is null then
    v_label := 'Bill Payment';
  end if;

  update public.wallets
  set balance = balance - v_amount
  where user_id = p_user_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient wallet balance.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_amount,
    'Paid ' || v_label || coalesce(' (' || v_detail || ')', '')
  );
end;
$$;

create or replace function public.me2u_pay_bill(
  p_user_id uuid,
  p_amount numeric,
  p_service_label text,
  p_detail text default null
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_pay_bill(p_user_id, p_amount, p_service_label, p_detail);
$$;

revoke execute on function private.me2u_pay_bill(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function private.me2u_pay_bill(uuid, numeric, text, text) to service_role;

revoke execute on function public.me2u_pay_bill(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.me2u_pay_bill(uuid, numeric, text, text) to service_role;

revoke insert, update on public.referrals from authenticated;
revoke execute on function public.me2u_record_referral(uuid, uuid) from public, anon, authenticated;
grant execute on function public.me2u_record_referral(uuid, uuid) to service_role;

create or replace function public.me2u_get_referral_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_referrals integer;
  v_pending_withdrawal integer;
  v_pending_repayment integer;
  v_earned_withdrawal integer;
  v_earned_repayment integer;
  v_total_earned numeric;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'You can only read your own referral stats.';
  end if;

  select count(*) into v_total_referrals
  from public.referrals
  where referrer_id = p_user_id;

  select count(*) into v_pending_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = false;

  select count(*) into v_pending_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = false;

  select count(*) into v_earned_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = true;

  select count(*) into v_earned_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = true;

  v_total_earned := (v_earned_withdrawal * 250) + (v_earned_repayment * 250);

  return json_build_object(
    'total_referrals', v_total_referrals,
    'pending_withdrawal', v_pending_withdrawal,
    'pending_repayment', v_pending_repayment,
    'earned_withdrawal', v_earned_withdrawal,
    'earned_repayment', v_earned_repayment,
    'total_earned', v_total_earned
  );
end;
$$;

create or replace function public.me2u_get_referral_details(p_user_id uuid)
returns table(
  referee_id uuid,
  referee_name text,
  referee_email text,
  referee_trust_score integer,
  referee_kyc_verified boolean,
  signed_up_at timestamptz,
  first_withdrawal_rewarded boolean,
  first_repayment_rewarded boolean,
  pending_rewards text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'You can only read your own referral details.';
  end if;

  return query
  select
    r.referee_id,
    p.first_name || ' ' || p.last_name as referee_name,
    p.email as referee_email,
    p.trust_score as referee_trust_score,
    p.kyc_verified as referee_kyc_verified,
    r.created_at as signed_up_at,
    r.first_withdrawal_rewarded,
    r.first_repayment_rewarded,
    case
      when not r.first_withdrawal_rewarded and not r.first_repayment_rewarded then 'NGN 500 pending (2 steps)'
      when not r.first_withdrawal_rewarded and r.first_repayment_rewarded then 'NGN 250 pending (withdrawal)'
      when r.first_withdrawal_rewarded and not r.first_repayment_rewarded then 'NGN 250 pending (repayment)'
      else 'NGN 500 earned'
    end as pending_rewards
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id
  order by r.created_at desc;
end;
$$;

revoke execute on function public.me2u_get_referral_stats(uuid) from public, anon;
revoke execute on function public.me2u_get_referral_details(uuid) from public, anon;
grant execute on function public.me2u_get_referral_stats(uuid) to authenticated, service_role;
grant execute on function public.me2u_get_referral_details(uuid) to authenticated, service_role;


-- ============================================================
-- Migration: 20260526170504_me2u_bills_architecture.sql
-- ============================================================

create extension if not exists pgcrypto;

do $$
begin
  alter type public.transaction_type add value if not exists 'bill_payment';
  alter type public.transaction_type add value if not exists 'bill_refund';
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.bill_record_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.bill_provider as enum ('vtpass', 'flutterwave');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.bill_transaction_status as enum (
    'initiated',
    'debited',
    'pending',
    'successful',
    'failed',
    'reversed',
    'refunded'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.wallet_ledger_transaction_type as enum ('credit', 'debit', 'refund', 'reversal');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.wallet_ledger_source as enum (
    'deposit',
    'loan',
    'bill_payment',
    'repayment',
    'admin_adjustment',
    'withdrawal',
    'referral'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.wallets
add column if not exists id uuid default gen_random_uuid();

update public.wallets
set id = gen_random_uuid()
where id is null;

alter table public.wallets
alter column id set not null;

create unique index if not exists wallets_id_key
on public.wallets (id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallets_id_unique'
      and conrelid = 'public.wallets'::regclass
  ) then
    alter table public.wallets
    add constraint wallets_id_unique unique using index wallets_id_key;
  end if;
end;
$$;

create table if not exists public.bill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.bill_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.bill_categories(id) on delete cascade,
  provider public.bill_provider not null default 'vtpass',
  service_id text not null,
  variation_code text,
  network text,
  name text not null,
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14, 2) not null default 0 check (selling_price >= 0),
  commission numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id),
  product_id uuid references public.bill_products(id),
  reference text not null unique,
  idempotency_key text,
  provider public.bill_provider not null default 'vtpass',
  provider_reference text,
  category text not null,
  service_id text not null,
  variation_code text,
  network text,
  customer_identifier text not null,
  amount numeric(14, 2) not null check (amount > 0),
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14, 2) not null check (selling_price > 0),
  profit numeric(14, 2) not null default 0,
  status public.bill_transaction_status not null default 'initiated',
  provider_response jsonb,
  failure_reason text,
  requery_count integer not null default 0 check (requery_count >= 0),
  next_requery_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bill_transactions_user_idempotency_key_idx
on public.bill_transactions (user_id, idempotency_key)
where idempotency_key is not null;

create index if not exists bill_transactions_user_created_idx
on public.bill_transactions (user_id, created_at desc);

create index if not exists bill_transactions_status_requery_idx
on public.bill_transactions (status, next_requery_at)
where status = 'pending';

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id),
  transaction_type public.wallet_ledger_transaction_type not null,
  source public.wallet_ledger_source not null,
  amount numeric(14, 2) not null check (amount > 0),
  balance_before numeric(14, 2) not null check (balance_before >= 0),
  balance_after numeric(14, 2) not null check (balance_after >= 0),
  reference text not null unique,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx
on public.wallet_ledger (user_id, created_at desc);

create table if not exists public.provider_logs (
  id uuid primary key default gen_random_uuid(),
  provider public.bill_provider not null,
  endpoint text not null,
  reference text,
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  created_at timestamptz not null default now()
);

create index if not exists provider_logs_reference_idx
on public.provider_logs (reference, created_at desc);

create table if not exists public.provider_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  reference text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.paystack_dedicated_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_code text,
  dedicated_account_id text,
  account_name text,
  account_number text,
  bank_name text,
  bank_slug text,
  assignment_payload jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (account_number)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists bill_categories_set_updated_at on public.bill_categories;
create trigger bill_categories_set_updated_at
before update on public.bill_categories
for each row execute function public.set_updated_at();

drop trigger if exists bill_products_set_updated_at on public.bill_products;
create trigger bill_products_set_updated_at
before update on public.bill_products
for each row execute function public.set_updated_at();

drop trigger if exists bill_transactions_set_updated_at on public.bill_transactions;
create trigger bill_transactions_set_updated_at
before update on public.bill_transactions
for each row execute function public.set_updated_at();

drop trigger if exists paystack_dedicated_accounts_set_updated_at on public.paystack_dedicated_accounts;
create trigger paystack_dedicated_accounts_set_updated_at
before update on public.paystack_dedicated_accounts
for each row execute function public.set_updated_at();

alter table public.bill_categories enable row level security;
alter table public.bill_products enable row level security;
alter table public.bill_transactions enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.provider_logs enable row level security;
alter table public.provider_webhooks enable row level security;
alter table public.paystack_dedicated_accounts enable row level security;
alter table public.admin_audit_logs enable row level security;

grant select on public.bill_categories, public.bill_products to authenticated;
grant select on public.bill_transactions, public.wallet_ledger, public.paystack_dedicated_accounts to authenticated;
grant all on public.bill_categories, public.bill_products, public.bill_transactions, public.wallet_ledger, public.provider_logs, public.provider_webhooks, public.paystack_dedicated_accounts, public.admin_audit_logs to service_role;

drop policy if exists "Authenticated users can read active bill categories" on public.bill_categories;
create policy "Authenticated users can read active bill categories"
on public.bill_categories for select to authenticated
using (status = 'active');

drop policy if exists "Authenticated users can read active bill products" on public.bill_products;
create policy "Authenticated users can read active bill products"
on public.bill_products for select to authenticated
using (is_active = true);

drop policy if exists "Users can read own bill transactions" on public.bill_transactions;
create policy "Users can read own bill transactions"
on public.bill_transactions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own wallet ledger" on public.wallet_ledger;
create policy "Users can read own wallet ledger"
on public.wallet_ledger for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own dedicated account" on public.paystack_dedicated_accounts;
create policy "Users can read own dedicated account"
on public.paystack_dedicated_accounts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read provider logs" on public.provider_logs;
create policy "Admins can read provider logs"
on public.provider_logs for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read provider webhooks" on public.provider_webhooks;
create policy "Admins can read provider webhooks"
on public.provider_webhooks for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
on public.admin_audit_logs for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

insert into public.bill_categories (name, slug)
values
  ('Airtime', 'airtime'),
  ('Data', 'data'),
  ('Electricity', 'electricity'),
  ('Cable TV', 'cable')
on conflict (slug) do update
set name = excluded.name,
    status = bill_categories.status;

insert into public.bill_products (category_id, provider, service_id, variation_code, network, name, selling_price, is_active, metadata)
select c.id, 'vtpass', seed.service_id, seed.variation_code, seed.network, seed.name, seed.selling_price, seed.is_active, seed.metadata
from public.bill_categories c
join (
  values
    ('airtime', 'mtn', null, 'MTN', 'MTN Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('airtime', 'airtel', null, 'Airtel', 'Airtel Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('airtime', 'glo', null, 'Glo', 'Glo Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('airtime', 'etisalat', null, '9mobile', '9mobile Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('data', 'mtn-data', 'mtn-10mb-100', 'MTN', 'MTN Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
    ('data', 'airtel-data', 'airtel-default', 'Airtel', 'Airtel Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
    ('data', 'glo-data', 'glo-default', 'Glo', 'Glo Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
    ('data', 'etisalat-data', 'etisalat-default', '9mobile', '9mobile Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb)
) as seed(slug, service_id, variation_code, network, name, selling_price, is_active, metadata)
on c.slug = seed.slug
where not exists (
  select 1
  from public.bill_products p
  where p.category_id = c.id
    and p.provider = 'vtpass'
    and p.service_id = seed.service_id
    and coalesce(p.variation_code, '') = coalesce(seed.variation_code, '')
);

create or replace function private.me2u_create_bill_debit(
  p_user_id uuid,
  p_product_id uuid,
  p_reference text,
  p_idempotency_key text,
  p_amount numeric,
  p_customer_identifier text
)
returns public.bill_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product record;
  v_wallet record;
  v_existing public.bill_transactions%rowtype;
  v_amount numeric(14, 2);
  v_balance_before numeric(14, 2);
  v_balance_after numeric(14, 2);
  v_transaction public.bill_transactions%rowtype;
begin
  if p_idempotency_key is not null then
    select *
    into v_existing
    from public.bill_transactions
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if v_existing.id is not null then
      return v_existing;
    end if;
  end if;

  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  if nullif(trim(coalesce(p_reference, '')), '') is null then
    raise exception 'Transaction reference is required.';
  end if;

  if nullif(trim(coalesce(p_customer_identifier, '')), '') is null then
    raise exception 'Customer identifier is required.';
  end if;

  select
    p.*,
    c.slug as category_slug
  into v_product
  from public.bill_products p
  join public.bill_categories c on c.id = p.category_id
  where p.id = p_product_id
    and p.is_active = true
    and c.status = 'active';

  if v_product.id is null then
    raise exception 'Bill product is unavailable.';
  end if;

  if v_product.selling_price > 0 and v_amount <> v_product.selling_price then
    raise exception 'Amount does not match selected product price.';
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  if (v_wallet.balance - v_wallet.locked) < v_amount then
    raise exception 'Insufficient available wallet balance.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_amount;

  update public.wallets
  set balance = v_balance_after
  where user_id = p_user_id;

  insert into public.bill_transactions (
    user_id,
    wallet_id,
    product_id,
    reference,
    idempotency_key,
    provider,
    category,
    service_id,
    variation_code,
    network,
    customer_identifier,
    amount,
    cost_price,
    selling_price,
    profit,
    status,
    next_requery_at
  )
  values (
    p_user_id,
    v_wallet.id,
    v_product.id,
    trim(p_reference),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    v_product.provider,
    v_product.category_slug,
    v_product.service_id,
    v_product.variation_code,
    v_product.network,
    left(trim(p_customer_identifier), 120),
    v_amount,
    coalesce(v_product.cost_price, 0),
    v_amount,
    greatest(0, v_amount - coalesce(nullif(v_product.cost_price, 0), v_amount)),
    'debited',
    now() + interval '5 minutes'
  )
  returning * into v_transaction;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description,
    metadata
  )
  values (
    p_user_id,
    v_wallet.id,
    'debit',
    'bill_payment',
    v_amount,
    v_balance_before,
    v_balance_after,
    trim(p_reference) || ':debit',
    'Bill payment debit for ' || v_product.name,
    jsonb_build_object('bill_reference', trim(p_reference), 'product_id', v_product.id)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'bill_payment', v_amount, 'Bill payment: ' || v_product.name);

  return v_transaction;
end;
$$;

create or replace function public.me2u_create_bill_debit(
  p_user_id uuid,
  p_product_id uuid,
  p_reference text,
  p_idempotency_key text,
  p_amount numeric,
  p_customer_identifier text
)
returns public.bill_transactions
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_create_bill_debit(
    p_user_id,
    p_product_id,
    p_reference,
    p_idempotency_key,
    p_amount,
    p_customer_identifier
  );
$$;

create or replace function private.me2u_refund_bill_transaction(
  p_reference text,
  p_reason text default null
)
returns public.bill_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bill public.bill_transactions%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(14, 2);
  v_balance_after numeric(14, 2);
begin
  select *
  into v_bill
  from public.bill_transactions
  where reference = trim(p_reference)
  for update;

  if v_bill.id is null then
    raise exception 'Bill transaction not found.';
  end if;

  if v_bill.status = 'refunded' then
    return v_bill;
  end if;

  if exists (
    select 1
    from public.wallet_ledger
    where reference = v_bill.reference || ':refund'
  ) then
    update public.bill_transactions
    set status = 'refunded',
        refunded_at = coalesce(refunded_at, now()),
        failure_reason = coalesce(p_reason, failure_reason)
    where id = v_bill.id
    returning * into v_bill;

    return v_bill;
  end if;

  select *
  into v_wallet
  from public.wallets
  where id = v_bill.wallet_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_bill.selling_price;

  update public.wallets
  set balance = v_balance_after
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description,
    metadata
  )
  values (
    v_bill.user_id,
    v_bill.wallet_id,
    'refund',
    'bill_payment',
    v_bill.selling_price,
    v_balance_before,
    v_balance_after,
    v_bill.reference || ':refund',
    'Automatic refund for failed bill payment',
    jsonb_build_object('bill_reference', v_bill.reference, 'reason', p_reason)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (v_bill.user_id, 'bill_refund', v_bill.selling_price, 'Refund for bill payment ' || v_bill.reference);

  insert into public.notifications (user_id, title, message)
  values (
    v_bill.user_id,
    'Bill Payment Refunded',
    'Your failed bill payment of NGN ' || v_bill.selling_price || ' has been refunded to your wallet.'
  );

  update public.bill_transactions
  set status = 'refunded',
      refunded_at = now(),
      failure_reason = coalesce(p_reason, failure_reason)
  where id = v_bill.id
  returning * into v_bill;

  perform private.me2u_refresh_trust_score(v_bill.user_id);

  return v_bill;
end;
$$;

create or replace function public.me2u_refund_bill_transaction(
  p_reference text,
  p_reason text default null
)
returns public.bill_transactions
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_refund_bill_transaction(p_reference, p_reason);
$$;

create or replace function private.me2u_credit_wallet_funding(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Paystack dedicated account funding'
)
returns public.wallet_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.wallet_ledger%rowtype;
  v_wallet public.wallets%rowtype;
  v_amount numeric(14, 2);
  v_ledger public.wallet_ledger%rowtype;
begin
  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select *
  into v_existing
  from public.wallet_ledger
  where reference = trim(p_reference);

  if v_existing.id is not null then
    return v_existing;
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description
  )
  values (
    p_user_id,
    v_wallet.id,
    'credit',
    'deposit',
    v_amount,
    v_wallet.balance,
    v_wallet.balance + v_amount,
    trim(p_reference),
    left(coalesce(p_description, 'Wallet funding'), 180)
  )
  returning * into v_ledger;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'deposit', v_amount, left(coalesce(p_description, 'Wallet funding'), 180));

  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    'Wallet Funded',
    'NGN ' || v_amount || ' has been added to your Me2U wallet.'
  );

  perform private.me2u_refresh_trust_score(p_user_id);

  return v_ledger;
end;
$$;

create or replace function public.me2u_credit_wallet_funding(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Paystack dedicated account funding'
)
returns public.wallet_ledger
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_credit_wallet_funding(p_user_id, p_amount, p_reference, p_description);
$$;

create or replace function private.me2u_refresh_trust_score(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile record;
  v_completed_loans integer;
  v_active_loans integer;
  v_wallet_activity integer;
  v_referrals integer;
  v_age_days integer;
  v_verified_contacts integer;
  v_successful_bills_30d integer;
  v_bill_total_30d integer;
  v_bill_failed_30d integer;
  v_bill_activity_points integer;
  v_bill_consistency_points integer;
  v_bill_failure_penalty integer;
  v_score integer;
begin
  select p.*
  into v_profile
  from public.profiles p
  where p.id = p_user_id;

  if v_profile is null then
    return 0;
  end if;

  select count(*)::integer
  into v_completed_loans
  from public.loans l
  where (l.borrower_id = p_user_id or l.lender_id = p_user_id)
    and l.status = 'completed';

  select count(*)::integer
  into v_active_loans
  from public.loans l
  where (l.borrower_id = p_user_id or l.lender_id = p_user_id)
    and l.status = 'active';

  select count(*)::integer
  into v_wallet_activity
  from public.transactions t
  where t.user_id = p_user_id;

  select count(*)::integer
  into v_referrals
  from public.affiliate_rewards a
  where a.referrer_id = p_user_id;

  select count(*)::integer
  into v_successful_bills_30d
  from public.bill_transactions b
  where b.user_id = p_user_id
    and b.status = 'successful'
    and b.created_at >= now() - interval '30 days';

  select count(*)::integer
  into v_bill_total_30d
  from public.bill_transactions b
  where b.user_id = p_user_id
    and b.created_at >= now() - interval '30 days';

  select count(*)::integer
  into v_bill_failed_30d
  from public.bill_transactions b
  where b.user_id = p_user_id
    and b.status in ('failed', 'reversed', 'refunded')
    and b.created_at >= now() - interval '30 days';

  v_bill_activity_points :=
    case
      when v_successful_bills_30d >= 5 then 8
      when v_successful_bills_30d >= 3 then 5
      when v_successful_bills_30d > 0 then 2
      else 0
    end;

  v_bill_consistency_points := case when v_successful_bills_30d >= 1 and v_wallet_activity >= 5 then 2 else 0 end;
  v_bill_failure_penalty := case when v_bill_total_30d >= 5 and (v_bill_failed_30d::numeric / v_bill_total_30d) > 0.20 then 3 else 0 end;

  v_age_days := greatest(0, floor(extract(epoch from (now() - v_profile.created_at)) / 86400)::integer);
  v_verified_contacts :=
    (case when coalesce(v_profile.email, '') <> '' then 1 else 0 end) +
    (case when coalesce(v_profile.phone, '') <> '' then 1 else 0 end) +
    (case when coalesce(v_profile.kyc_verified, false) then 1 else 0 end);

  v_score :=
    case when coalesce(v_profile.kyc_verified, false) then 18 when coalesce(v_profile.registration_deposit_paid, false) then 8 else 0 end +
    case when v_completed_loans > 0 then 18 when v_active_loans > 0 then 9 else 0 end +
    case when v_wallet_activity >= 5 then 12 when v_wallet_activity > 0 then 7 else 0 end +
    case when v_referrals >= 5 then 10 when v_referrals > 0 then 7 else 0 end +
    case when v_completed_loans >= 3 then 12 when v_completed_loans > 0 then 8 when v_active_loans > 0 then 4 else 0 end +
    10 +
    case when v_age_days >= 90 then 8 when v_age_days >= 30 then 5 when v_age_days > 0 then 2 else 0 end +
    case when v_verified_contacts >= 3 then 7 when v_verified_contacts >= 2 then 5 when v_verified_contacts > 0 then 2 else 0 end +
    case when v_completed_loans > 0 then 5 else 0 end +
    v_bill_activity_points +
    v_bill_consistency_points -
    v_bill_failure_penalty;

  v_score := least(100, greatest(0, v_score));

  update public.profiles
  set trust_score = v_score
  where id = p_user_id;

  return v_score;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_bill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.user_id);
  return new;
end;
$$;

drop trigger if exists bill_transactions_refresh_trust_score on public.bill_transactions;
create trigger bill_transactions_refresh_trust_score
after insert or update of status on public.bill_transactions
for each row execute function private.me2u_refresh_trust_score_from_bill();

revoke execute on function private.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function private.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) to service_role;

revoke execute on function public.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) to service_role;

revoke execute on function private.me2u_refund_bill_transaction(text, text) from public, anon, authenticated;
grant execute on function private.me2u_refund_bill_transaction(text, text) to service_role;

revoke execute on function public.me2u_refund_bill_transaction(text, text) from public, anon, authenticated;
grant execute on function public.me2u_refund_bill_transaction(text, text) to service_role;

revoke execute on function private.me2u_credit_wallet_funding(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function private.me2u_credit_wallet_funding(uuid, numeric, text, text) to service_role;

revoke execute on function public.me2u_credit_wallet_funding(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.me2u_credit_wallet_funding(uuid, numeric, text, text) to service_role;


-- ============================================================
-- Migration: 20260527001749_wema_primary_banking_rails.sql
-- ============================================================

do $$
begin
  alter type public.bill_provider add value if not exists 'wema';
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter type public.wallet_ledger_source add value if not exists 'bank_transfer';
  alter type public.wallet_ledger_source add value if not exists 'transfer';
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.virtual_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'wema',
  provider_reference text,
  account_name text,
  account_number text,
  bank_name text,
  bank_code text,
  currency text not null default 'NGN',
  status text not null default 'pending',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, user_id),
  unique (provider, account_number)
);

create table if not exists public.wallet_inflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid references public.wallets(id),
  virtual_account_id uuid references public.virtual_accounts(id),
  provider text not null default 'wema',
  provider_reference text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending',
  sender_name text,
  sender_account_number text,
  narration text,
  credited_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid references public.wallets(id),
  provider text not null default 'wema',
  reference text not null unique,
  provider_reference text,
  amount numeric(14, 2) not null check (amount > 0),
  bank_code text not null,
  account_number text not null,
  account_name text,
  narration text,
  status text not null default 'initiated',
  failure_reason text,
  provider_response jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists virtual_accounts_set_updated_at on public.virtual_accounts;
create trigger virtual_accounts_set_updated_at
before update on public.virtual_accounts
for each row execute function public.set_updated_at();

drop trigger if exists wallet_inflows_set_updated_at on public.wallet_inflows;
create trigger wallet_inflows_set_updated_at
before update on public.wallet_inflows
for each row execute function public.set_updated_at();

drop trigger if exists bank_transfers_set_updated_at on public.bank_transfers;
create trigger bank_transfers_set_updated_at
before update on public.bank_transfers
for each row execute function public.set_updated_at();

alter table public.virtual_accounts enable row level security;
alter table public.wallet_inflows enable row level security;
alter table public.bank_transfers enable row level security;

grant select on public.virtual_accounts, public.wallet_inflows, public.bank_transfers to authenticated;
grant all on public.virtual_accounts, public.wallet_inflows, public.bank_transfers to service_role;

drop policy if exists "Users can read own virtual accounts" on public.virtual_accounts;
create policy "Users can read own virtual accounts"
on public.virtual_accounts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own wallet inflows" on public.wallet_inflows;
create policy "Users can read own wallet inflows"
on public.wallet_inflows for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own bank transfers" on public.bank_transfers;
create policy "Users can read own bank transfers"
on public.bank_transfers for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all virtual accounts" on public.virtual_accounts;
create policy "Admins can read all virtual accounts"
on public.virtual_accounts for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read all wallet inflows" on public.wallet_inflows;
create policy "Admins can read all wallet inflows"
on public.wallet_inflows for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read all bank transfers" on public.bank_transfers;
create policy "Admins can read all bank transfers"
on public.bank_transfers for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create or replace function private.me2u_credit_wallet_inflow(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Wema virtual account funding',
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.wallet_ledger%rowtype;
  v_wallet public.wallets%rowtype;
  v_amount numeric(14, 2);
  v_ledger public.wallet_ledger%rowtype;
begin
  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  if nullif(trim(coalesce(p_reference, '')), '') is null then
    raise exception 'Wallet inflow reference is required.';
  end if;

  select *
  into v_existing
  from public.wallet_ledger
  where reference = trim(p_reference);

  if v_existing.id is not null then
    return v_existing;
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description,
    metadata
  )
  values (
    p_user_id,
    v_wallet.id,
    'credit',
    'bank_transfer',
    v_amount,
    v_wallet.balance,
    v_wallet.balance + v_amount,
    trim(p_reference),
    left(coalesce(p_description, 'Virtual account funding'), 180),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_ledger;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'deposit', v_amount, left(coalesce(p_description, 'Virtual account funding'), 180));

  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    'Wallet Funded',
    'NGN ' || v_amount || ' has been added to your Me2U wallet.'
  );

  perform private.me2u_refresh_trust_score(p_user_id);

  return v_ledger;
end;
$$;

create or replace function public.me2u_credit_wallet_inflow(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Wema virtual account funding',
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_ledger
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_credit_wallet_inflow(p_user_id, p_amount, p_reference, p_description, p_metadata);
$$;

revoke execute on function private.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function private.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) to service_role;

revoke execute on function public.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) to service_role;


-- ============================================================
-- Migration: 20260915000000_update_registration_deposit_to_2000.sql
-- ============================================================

-- Update registration deposit validation messages to NGN 2,000
-- Updates validation messages in core functions and preserves existing logic.

DO $$
BEGIN
  -- 1. Update platform loan request function message
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'me2u_request_platform_loan') THEN
    EXECUTE $e$
      CREATE OR REPLACE FUNCTION private.me2u_request_platform_loan(p_user_id uuid, p_amount numeric)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
      declare
        v_profile public.profiles%rowtype;
        v_registration_deposit_paid boolean;
        v_prior_platform_loans integer;
        v_retained_deposit numeric;
        v_shortfall numeric;
        v_amount numeric := round(p_amount, 2);
        v_updated integer;
      begin
        if v_amount is null or v_amount < 5000 then
          raise exception 'Loans start from NGN 5,000.';
        end if;
        select id, registration_deposit_paid into v_profile.id, v_registration_deposit_paid
        from public.profiles where id = p_user_id;
        if not found then raise exception 'Profile not found.'; end if;
        if not v_registration_deposit_paid then
          raise exception 'Confirm your NGN 2,000 registration deposit before requesting a loan.';
        end if;
        select count(*) into v_prior_platform_loans
        from public.loans where borrower_id = p_user_id and lender_id is null and status = 'active' and amount >= 5000;
        if v_prior_platform_loans > 0 then
          raise exception 'You already have an active platform loan. Repay it first.';
        end if;
        v_retained_deposit := round(v_amount * 0.5, 2);
        if v_retained_deposit > 0 then
          select coalesce(sum(round(amount * 0.5, 2)), 0) into v_shortfall
          from public.loans where borrower_id = p_user_id and lender_id is null and status = 'active' and amount >= 5000;
          if v_amount * 0.5 > v_retained_deposit + coalesce((select balance from public.wallets where user_id = p_user_id), 0) then
            raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.', v_shortfall, v_retained_deposit;
          end if;
        end if;
        update public.wallets set balance = balance + v_amount where user_id = p_user_id;
        get diagnostics v_updated = row_count;
        if v_updated <> 1 then raise exception 'Wallet not found.'; end if;
        insert into public.loans (amount, rate, days, borrower_id, lender_id, status, due_date)
        values (v_amount, 0, 30, p_user_id, null, 'active', now() + make_interval(days => 30));
        insert into public.transactions (user_id, type, amount, description)
        values (p_user_id, 'loan_disbursed', v_amount, case when v_prior_platform_loans = 0 then 'First platform loan disbursed' else 'Platform loan disbursed with 50% retained wallet condition' end);
      end;
      $$;
    $e$;
  END IF;

  -- 2. Update withdraw function message
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'me2u_withdraw_wallet') THEN
    EXECUTE $e$
      CREATE OR REPLACE FUNCTION private.me2u_withdraw_wallet(p_user_id uuid, p_amount numeric)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
      declare
        v_withdrawal_amount numeric;
        v_registration_deposit_paid boolean;
        v_platform_retained_deposit numeric;
        v_updated integer;
      begin
        if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero.'; end if;
        select registration_deposit_paid into v_registration_deposit_paid from public.profiles where id = p_user_id;
        if not found then raise exception 'Profile not found.'; end if;
        if not v_registration_deposit_paid then
          raise exception 'Confirm your NGN 2,000 registration deposit before withdrawal.';
        end if;
        v_withdrawal_amount := round(p_amount, 2);
        select coalesce(sum(round(amount * 0.5, 2)), 0) into v_platform_retained_deposit
        from public.loans where borrower_id = p_user_id and lender_id is null and status = 'active' and amount >= 5000;
        update public.wallets set balance = balance - v_withdrawal_amount
        where user_id = p_user_id and balance >= (v_withdrawal_amount + v_platform_retained_deposit);
        get diagnostics v_updated = row_count;
        if v_updated <> 1 then raise exception 'Insufficient available balance. The active platform loan deposit must remain in your wallet.'; end if;
        insert into public.transactions (user_id, type, amount, description)
        values (p_user_id, 'withdrawal', v_withdrawal_amount, 'Withdrawal to Bank Account');
      end;
      $$;
    $e$;
  END IF;

  -- 3. Update registration deposit confirmation wrapper
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'me2u_confirm_registration_deposit' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $e$
      CREATE OR REPLACE FUNCTION public.me2u_confirm_registration_deposit(p_user_id uuid, p_reference text)
      RETURNS void LANGUAGE sql SECURITY invoker SET search_path = public, private, pg_temp AS $$
        select private.me2u_confirm_registration_deposit(p_user_id, p_reference);
      $$;
    $e$;
    EXECUTE $e$ revoke execute on function public.me2u_confirm_registration_deposit(uuid, text) from public, anon, authenticated; $e$;
    EXECUTE $e$ grant execute on function public.me2u_confirm_registration_deposit(uuid, text) to service_role; $e$;
  END IF;
END $$;

-- ============================================================
-- Migration: 20260916000000_gamification_and_social_proof.sql
-- ============================================================

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- GAMIFICATION & SOCIAL PROOF SYSTEM
-- Features: Badges, Achievements, Platform Stats, Success Stories, Circle Rewards
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€ 1. BADGES & ACHIEVEMENTS â”€â”€â”€

create type public.badge_type as enum (
  'trust_builder',
  'early_adopter',
  'community_lender',
  'responsible_borrower',
  'circle_champion',
  'referral_master',
  'financial_literacy',
  'milestone_5k',
  'milestone_50k',
  'milestone_100k',
  'perfect_record',
  'speed_repayer',
  'super_saver'
);

create type public.achievement_category as enum (
  'trust',
  'lending',
  'borrowing',
  'circles',
  'referrals',
  'education',
  'milestones',
  'repayment'
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  badge_type public.badge_type not null unique,
  name text not null,
  description text not null,
  category public.achievement_category not null,
  icon text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  requirement jsonb not null default '{}'::jsonb,
  reward_amount numeric(14, 2) not null default 0 check (reward_amount >= 0),
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_type public.badge_type not null references public.badges(badge_type) on delete cascade,
  earned_at timestamptz not null default now(),
  notified boolean not null default false,
  unique (user_id, badge_type)
);

create index user_badges_user_earned_idx on public.user_badges(user_id, earned_at desc);
create index user_badges_badge_type_idx on public.user_badges(badge_type);

-- â”€â”€â”€ 2. PLATFORM STATISTICS (For Social Proof) â”€â”€â”€

create table public.platform_stats (
  stat_key text primary key,
  stat_value numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Initialize platform stats
insert into public.platform_stats (stat_key, stat_value) values
  ('total_borrowed', 0),
  ('total_repaid', 0),
  ('active_circles', 0),
  ('total_users', 0),
  ('successful_loans', 0),
  ('total_lent', 0),
  ('active_loans', 0),
  ('trust_score_avg', 85)
on conflict (stat_key) do nothing;

-- â”€â”€â”€ 3. SUCCESS STORIES â”€â”€â”€

create table public.success_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  story text not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (category in ('education', 'business', 'emergency', 'family', 'other')),
  is_featured boolean not null default false,
  is_public boolean not null default false,
  display_name text not null,
  created_at timestamptz not null default now(),
  featured_at timestamptz
);

create index success_stories_featured_idx on public.success_stories(is_featured, featured_at desc)
  where is_featured = true and is_public = true;
create index success_stories_public_idx on public.success_stories(is_public, created_at desc)
  where is_public = true;

-- â”€â”€â”€ 4. CIRCLE PERFORMANCE & REWARDS â”€â”€â”€

create table public.circle_performance (
  circle_id uuid primary key references public.circles(id) on delete cascade,
  total_loans_issued integer not null default 0,
  total_loans_repaid integer not null default 0,
  on_time_repayment_rate numeric(5, 2) not null default 100.00 check (on_time_repayment_rate between 0 and 100),
  total_volume numeric(14, 2) not null default 0 check (total_volume >= 0),
  member_count integer not null default 0,
  performance_score integer not null default 0 check (performance_score between 0 and 100),
  last_calculated timestamptz not null default now()
);

create table public.circle_rewards (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  reward_type text not null check (reward_type in ('perfect_month', 'milestone_volume', 'member_growth', 'perfect_quarter')),
  reward_per_member numeric(14, 2) not null check (reward_per_member > 0),
  total_amount numeric(14, 2) not null check (total_amount > 0),
  disbursed boolean not null default false,
  earned_at timestamptz not null default now(),
  disbursed_at timestamptz
);

create index circle_rewards_circle_disbursed_idx on public.circle_rewards(circle_id, disbursed, earned_at desc);

-- â”€â”€â”€ 5. TRUST SCORE MILESTONES â”€â”€â”€

create table public.trust_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_score integer not null check (milestone_score in (50, 60, 70, 80, 85, 90, 95, 100)),
  reached_at timestamptz not null default now(),
  celebrated boolean not null default false,
  unique (user_id, milestone_score)
);

create index trust_milestones_user_idx on public.trust_milestones(user_id, milestone_score desc);

-- â”€â”€â”€ 6. FRIEND DISCOVERY & NETWORK EFFECTS â”€â”€â”€

create table public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_hash text not null,
  contact_name text,
  matched_user_id uuid references public.profiles(id) on delete set null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, phone_hash)
);

create index user_contacts_user_idx on public.user_contacts(user_id);
create index user_contacts_phone_hash_idx on public.user_contacts(phone_hash)
  where matched_user_id is null;
create index user_contacts_matched_idx on public.user_contacts(matched_user_id)
  where matched_user_id is not null;

-- â”€â”€â”€ 7. FINANCIAL EDUCATION CONTENT â”€â”€â”€

create table public.education_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  category text not null check (category in ('borrowing', 'saving', 'trust_score', 'security', 'circles', 'general')),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes integer not null default 5 check (estimated_minutes > 0),
  order_index integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index education_content_category_order_idx on public.education_content(category, order_index);
create index education_content_featured_idx on public.education_content(is_featured)
  where is_featured = true;

-- â”€â”€â”€ 8. RLS POLICIES â”€â”€â”€

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.platform_stats enable row level security;
alter table public.success_stories enable row level security;
alter table public.circle_performance enable row level security;
alter table public.circle_rewards enable row level security;
alter table public.trust_milestones enable row level security;
alter table public.user_contacts enable row level security;
alter table public.education_content enable row level security;

-- Badges (public read, system write)
drop policy if exists "Anyone can read badges" on public.badges;
create policy "Anyone can read badges"
  on public.badges for select
  to anon, authenticated
  using (true);

-- User badges (own badges readable)
drop policy if exists "Users can read own badges" on public.user_badges;
create policy "Users can read own badges"
  on public.user_badges for select
  to authenticated
  using (user_id = auth.uid());

-- Platform stats (public read)
drop policy if exists "Anyone can read platform stats" on public.platform_stats;
create policy "Anyone can read platform stats"
  on public.platform_stats for select
  to anon, authenticated
  using (true);

-- Success stories (public read for public stories)
drop policy if exists "Anyone can read public success stories" on public.success_stories;
create policy "Anyone can read public success stories"
  on public.success_stories for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Users can create own success stories" on public.success_stories;
create policy "Users can create own success stories"
  on public.success_stories for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own success stories" on public.success_stories;
create policy "Users can update own success stories"
  on public.success_stories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Circle performance (readable by all authenticated)
drop policy if exists "Authenticated users can read circle performance" on public.circle_performance;
create policy "Authenticated users can read circle performance"
  on public.circle_performance for select
  to authenticated
  using (true);

-- Circle rewards (readable by circle members)
drop policy if exists "Circle members can read rewards" on public.circle_rewards;
create policy "Circle members can read rewards"
  on public.circle_rewards for select
  to authenticated
  using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_rewards.circle_id
        and cm.user_id = auth.uid()
    )
  );

-- Trust milestones (own milestones only)
drop policy if exists "Users can read own trust milestones" on public.trust_milestones;
create policy "Users can read own trust milestones"
  on public.trust_milestones for select
  to authenticated
  using (user_id = auth.uid());

-- User contacts (own contacts only)
drop policy if exists "Users can manage own contacts" on public.user_contacts;
create policy "Users can manage own contacts"
  on public.user_contacts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Education content (public read)
drop policy if exists "Anyone can read education content" on public.education_content;
create policy "Anyone can read education content"
  on public.education_content for select
  to anon, authenticated
  using (true);

-- â”€â”€â”€ 9. GRANTS â”€â”€â”€

grant select on public.badges to anon, authenticated;
grant select on public.user_badges to authenticated;
grant select on public.platform_stats to anon, authenticated;
grant select, insert, update on public.success_stories to authenticated;
grant select on public.circle_performance to authenticated;
grant select on public.circle_rewards to authenticated;
grant select on public.trust_milestones to authenticated;
grant select, insert, update, delete on public.user_contacts to authenticated;
grant select on public.education_content to authenticated;

-- â”€â”€â”€ 10. SEED BADGES â”€â”€â”€

insert into public.badges (badge_type, name, description, category, icon, rarity, requirement, reward_amount) values
  ('trust_builder', 'Trust Builder', 'Reached 90+ trust score', 'trust', 'ðŸ†', 'epic', '{"min_trust_score": 90}', 500),
  ('early_adopter', 'Early Adopter', 'Joined within first 1000 users', 'milestones', 'ðŸŒŸ', 'legendary', '{"max_user_number": 1000}', 1000),
  ('community_lender', 'Community Lender', 'Lent to 5+ different people', 'lending', 'ðŸ¤', 'rare', '{"unique_loans_lent": 5}', 300),
  ('responsible_borrower', 'Responsible Borrower', 'Repaid 5 loans on time', 'borrowing', 'âœ…', 'rare', '{"on_time_repayments": 5}', 300),
  ('circle_champion', 'Circle Champion', 'Created a circle with 10+ members', 'circles', 'ðŸ‘¥', 'epic', '{"circle_members": 10}', 500),
  ('referral_master', 'Referral Master', 'Referred 10+ verified users', 'referrals', 'ðŸ“£', 'epic', '{"verified_referrals": 10}', 500),
  ('financial_literacy', 'Financial Literacy', 'Completed all education modules', 'education', 'ðŸ“š', 'rare', '{"completed_modules": "all"}', 200),
  ('milestone_5k', '5K Club', 'Total borrowed/lent: â‚¦5,000+', 'milestones', 'ðŸ’°', 'common', '{"total_volume": 5000}', 100),
  ('milestone_50k', '50K Club', 'Total borrowed/lent: â‚¦50,000+', 'milestones', 'ðŸ’Ž', 'rare', '{"total_volume": 50000}', 500),
  ('milestone_100k', '100K Club', 'Total borrowed/lent: â‚¦100,000+', 'milestones', 'ðŸ‘‘', 'legendary', '{"total_volume": 100000}', 2000),
  ('perfect_record', 'Perfect Record', '100% on-time repayment history', 'repayment', 'â­', 'legendary', '{"perfect_repayment": true}', 1000),
  ('speed_repayer', 'Speed Repayer', 'Repaid a loan within 24 hours', 'repayment', 'âš¡', 'rare', '{"repaid_within_hours": 24}', 250),
  ('super_saver', 'Super Saver', 'Saved â‚¦50,000+ in savings goals', 'milestones', 'ðŸŽ¯', 'epic', '{"total_savings": 50000}', 500)
on conflict (badge_type) do nothing;

-- â”€â”€â”€ 11. SEED EDUCATION CONTENT â”€â”€â”€

insert into public.education_content (slug, title, summary, content, category, difficulty, estimated_minutes, order_index, is_featured) values
  ('understanding-trust-scores', 'Understanding Trust Scores', 'Learn how your trust score is calculated and how to improve it', 
   E'# Understanding Trust Scores\n\nYour trust score determines your borrowing limits, loan duration, and security deposit requirements. Here''s how it works:\n\n## What Affects Your Trust Score\n\n1. **KYC Verification** (+18 points)\n2. **Completed Loans** (+18 points for first, +12 for 3+)\n3. **Wallet Activity** (+12 points for 5+ transactions)\n4. **Referrals** (+10 points for 5+ verified referrals)\n5. **Account Age** (+8 points for 90+ days)\n6. **Verified Contacts** (+7 points for email, phone, KYC)\n\n## How to Improve Your Score\n\n- Complete your KYC verification\n- Repay loans on time\n- Maintain regular wallet activity\n- Refer friends who use the platform\n- Build a long-term relationship with Me2U\n\nYour trust score updates automatically after each action!',
   'trust_score', 'beginner', 5, 1, true),
  
  ('borrowing-responsibly', 'Borrowing Responsibly', 'Best practices for taking and repaying loans',
   E'# Borrowing Responsibly\n\n## Before You Borrow\n\n1. **Assess Your Need**: Only borrow what you actually need\n2. **Plan Repayment**: Ensure you can repay before the due date\n3. **Check Your Trust Score**: Higher scores unlock better terms\n4. **Understand the Terms**: 0% interest, but on-time repayment matters\n\n## Repayment Tips\n\n- Set reminders before your due date\n- Repay early if possible to boost your trust score\n- Maintain wallet balance for smooth repayment\n- Communicate with lenders if issues arise\n\n## Benefits of Good Repayment\n\n- Higher trust score\n- Access to larger loans\n- Longer loan durations\n- Lower security deposits\n- Community reputation',
   'borrowing', 'beginner', 7, 2, true),
  
  ('building-wealth-circles', 'Building Wealth with Circles', 'Maximize the power of group lending',
   E'# Building Wealth with Circles\n\nCircles are modern cooperatives that pool resources for mutual benefit.\n\n## Creating a Strong Circle\n\n1. **Invite Trusted Members**: Quality over quantity\n2. **Set Clear Rules**: Agree on contribution amounts and terms\n3. **Regular Activity**: Consistent contributions build momentum\n4. **Celebrate Milestones**: Recognize achievements together\n\n## Circle Benefits\n\n- Access to larger pool of funds\n- Lower personal risk\n- Community support\n- Group rewards for perfect repayment\n- Shared financial goals\n\n## Circle Rewards\n\n- **Perfect Month**: â‚¦100 per member for 100% on-time repayments\n- **Volume Milestones**: Bonuses at â‚¦100K, â‚¦500K, â‚¦1M\n- **Member Growth**: â‚¦50 per member at 10, 25, 50 members\n\nBuild your financial future together!',
   'circles', 'intermediate', 8, 3, true),
  
  ('maximizing-referrals', 'Maximizing Referral Rewards', 'Earn wallet credit by growing the community',
   E'# Maximizing Referral Rewards\n\n## How Referrals Work\n\nYou earn â‚¦250 for each milestone your referee reaches:\n\n1. **First Withdrawal**: â‚¦250 when they make their first successful withdrawal\n2. **First Repayment**: â‚¦250 when they complete their first loan repayment\n\n**Total: â‚¦500 per active referral**\n\n## Best Referral Practices\n\n1. **Target Active Users**: Refer people who need financial services\n2. **Explain the Benefits**: Help them understand 0% interest loans\n3. **Support Their Journey**: Guide them through KYC and first loan\n4. **Leverage Networks**: Family, friends, colleagues, communities\n\n## Referral Milestones\n\n- 5 referrals: â‚¦2,500 potential\n- 10 referrals: â‚¦5,000 + Referral Master badge\n- 25 referrals: â‚¦12,500 potential\n- 50+ referrals: Elite referrer status\n\n## Tips for Success\n\n- Share your referral code on social media\n- Tell your success story\n- Join community groups\n- Host financial literacy sessions\n\nGrow Me2U, grow your wallet!',
   'referrals', 'intermediate', 6, 4, false),
  
  ('security-best-practices', 'Security Best Practices', 'Protect your account and funds',
   E'# Security Best Practices\n\n## Account Security\n\n1. **Strong Password**: Mix letters, numbers, symbols\n2. **Transaction PIN**: Never share with anyone\n3. **Trusted Device**: Monitor login sessions\n4. **Regular Reviews**: Check transactions weekly\n\n## Red Flags to Watch\n\n- Unsolicited withdrawal requests\n- Requests to share your PIN\n- Suspicious transaction notifications\n- Unusual login locations\n\n## What Me2U Will Never Do\n\n- Ask for your password via email/SMS\n- Request your transaction PIN\n- Pressure you to make urgent transfers\n- Contact you from unofficial numbers\n\n## If Something Looks Wrong\n\n1. Freeze your wallet immediately\n2. Contact support through official channels\n3. Review recent transactions\n4. Change your password\n5. Reset your transaction PIN\n\nYour security is our priority!',
   'security', 'beginner', 5, 5, false)
on conflict (slug) do nothing;

-- â”€â”€â”€ 12. FUNCTIONS â”€â”€â”€

-- Update platform stats (called by triggers)
create or replace function private.me2u_update_platform_stats()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_borrowed numeric;
  v_total_repaid numeric;
  v_successful_loans integer;
  v_active_loans integer;
  v_total_lent numeric;
  v_active_circles integer;
  v_total_users integer;
  v_avg_trust numeric;
begin
  -- Total borrowed (all disbursed loans)
  select coalesce(sum(amount), 0) into v_total_borrowed
  from public.loans;
  
  -- Total repaid (completed loans)
  select coalesce(sum(amount), 0) into v_total_repaid
  from public.loans where status = 'completed';
  
  -- Successful loans count
  select count(*) into v_successful_loans
  from public.loans where status = 'completed';
  
  -- Active loans count
  select count(*) into v_active_loans
  from public.loans where status = 'active';
  
  -- Total lent (same as borrowed)
  v_total_lent := v_total_borrowed;
  
  -- Active circles
  select count(*) into v_active_circles
  from public.circles;
  
  -- Total users
  select count(*) into v_total_users
  from public.profiles;
  
  -- Average trust score
  select coalesce(avg(trust_score), 85) into v_avg_trust
  from public.profiles where kyc_verified = true;
  
  -- Update stats
  update public.platform_stats set stat_value = v_total_borrowed, updated_at = now() where stat_key = 'total_borrowed';
  update public.platform_stats set stat_value = v_total_repaid, updated_at = now() where stat_key = 'total_repaid';
  update public.platform_stats set stat_value = v_successful_loans, updated_at = now() where stat_key = 'successful_loans';
  update public.platform_stats set stat_value = v_active_loans, updated_at = now() where stat_key = 'active_loans';
  update public.platform_stats set stat_value = v_total_lent, updated_at = now() where stat_key = 'total_lent';
  update public.platform_stats set stat_value = v_active_circles, updated_at = now() where stat_key = 'active_circles';
  update public.platform_stats set stat_value = v_total_users, updated_at = now() where stat_key = 'total_users';
  update public.platform_stats set stat_value = round(v_avg_trust, 0), updated_at = now() where stat_key = 'trust_score_avg';
end;
$$;

-- Award badge to user
create or replace function private.me2u_award_badge(
  p_user_id uuid,
  p_badge_type public.badge_type
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_badge_id uuid;
  v_reward numeric;
  v_name text;
  v_already_has boolean;
begin
  -- Check if user already has this badge
  select exists(
    select 1 from public.user_badges
    where user_id = p_user_id and badge_type = p_badge_type
  ) into v_already_has;
  
  if v_already_has then
    return false;
  end if;
  
  -- Get badge details
  select reward_amount, name into v_reward, v_name
  from public.badges
  where badge_type = p_badge_type;
  
  if not found then
    return false;
  end if;
  
  -- Award badge
  insert into public.user_badges (user_id, badge_type)
  values (p_user_id, p_badge_type)
  on conflict (user_id, badge_type) do nothing;
  
  -- Award wallet credit if any
  if v_reward > 0 then
    update public.wallets
    set balance = balance + v_reward
    where user_id = p_user_id;
    
    insert into public.transactions (user_id, type, amount, description)
    values (p_user_id, 'deposit', v_reward, 'Badge reward: ' || v_name);
  end if;
  
  -- Notify user
  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    'ðŸŽ‰ Badge Unlocked!',
    'You earned the "' || v_name || '" badge' || 
    case when v_reward > 0 then ' and â‚¦' || v_reward || ' wallet credit!' else '!' end
  );
  
  return true;
end;
$$;

-- Check and award badges for a user
create or replace function private.me2u_check_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile record;
  v_loans_completed integer;
  v_loans_lent integer;
  v_total_volume numeric;
  v_total_savings numeric;
  v_verified_referrals integer;
  v_circle_members integer;
  v_education_completed integer;
  v_on_time_repayments integer;
  v_total_repayments integer;
  v_has_speed_repayment boolean;
begin
  -- Get profile
  select * into v_profile
  from public.profiles where id = p_user_id;
  
  if not found then
    return;
  end if;
  
  -- Gather stats
  select count(*) into v_loans_completed
  from public.loans where borrower_id = p_user_id and status = 'completed';
  
  select count(distinct borrower_id) into v_loans_lent
  from public.loans where lender_id = p_user_id and status = 'completed';
  
  select coalesce(sum(amount), 0) into v_total_volume
  from public.loans where borrower_id = p_user_id or lender_id = p_user_id;
  
  select coalesce(sum(current_amount), 0) into v_total_savings
  from public.savings_goals where user_id = p_user_id;
  
  select count(*) into v_verified_referrals
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id and p.kyc_verified = true;
  
  select max(member_count) into v_circle_members
  from public.circles c
  join public.circle_performance cp on cp.circle_id = c.id
  where c.creator_id = p_user_id;
  
  select count(distinct lesson_key) into v_education_completed
  from public.learning_progress where user_id = p_user_id;
  
  -- Check for speed repayment (loan completed within 24h of start)
  select exists(
    select 1 from public.loans
    where borrower_id = p_user_id
      and status = 'completed'
      and created_at >= (select max(created_at) from public.loans where borrower_id = p_user_id and status = 'completed')
      and extract(epoch from (
        (select max(updated_at) from public.transactions
         where user_id = p_user_id and type = 'loan_repayment'
         and description like '%' || id::text || '%')
        - start_date
      )) <= 86400
  ) into v_has_speed_repayment;
  
  -- Award badges based on criteria
  if v_profile.trust_score >= 90 then
    perform private.me2u_award_badge(p_user_id, 'trust_builder');
  end if;
  
  if v_loans_lent >= 5 then
    perform private.me2u_award_badge(p_user_id, 'community_lender');
  end if;
  
  if v_loans_completed >= 5 then
    perform private.me2u_award_badge(p_user_id, 'responsible_borrower');
  end if;
  
  if v_circle_members >= 10 then
    perform private.me2u_award_badge(p_user_id, 'circle_champion');
  end if;
  
  if v_verified_referrals >= 10 then
    perform private.me2u_award_badge(p_user_id, 'referral_master');
  end if;
  
  if v_total_volume >= 100000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_100k');
  elsif v_total_volume >= 50000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_50k');
  elsif v_total_volume >= 5000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_5k');
  end if;
  
  if v_total_savings >= 50000 then
    perform private.me2u_award_badge(p_user_id, 'super_saver');
  end if;
  
  if v_has_speed_repayment then
    perform private.me2u_award_badge(p_user_id, 'speed_repayer');
  end if;
  
  -- Check perfect record
  select count(*) into v_total_repayments
  from public.loans where borrower_id = p_user_id and status = 'completed';
  
  if v_total_repayments >= 5 then
    select count(*) into v_on_time_repayments
    from public.loans 
    where borrower_id = p_user_id 
      and status = 'completed'
      and updated_at <= due_date;
    
    if v_on_time_repayments = v_total_repayments then
      perform private.me2u_award_badge(p_user_id, 'perfect_record');
    end if;
  end if;
end;
$$;

-- Record trust milestone
create or replace function private.me2u_record_trust_milestone(
  p_user_id uuid,
  p_new_score integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_milestone integer;
  v_milestones integer[] := array[50, 60, 70, 80, 85, 90, 95, 100];
begin
  foreach v_milestone in array v_milestones loop
    if p_new_score >= v_milestone then
      insert into public.trust_milestones (user_id, milestone_score)
      values (p_user_id, v_milestone)
      on conflict (user_id, milestone_score) do nothing;
      
      -- Notify on major milestones
      if v_milestone in (70, 80, 90, 100) and not exists(
        select 1 from public.trust_milestones
        where user_id = p_user_id and milestone_score = v_milestone and celebrated = true
      ) then
        insert into public.notifications (user_id, title, message)
        values (
          p_user_id,
          'ðŸŽŠ Trust Score Milestone!',
          'Congratulations! You reached a trust score of ' || v_milestone || '!'
        );
        
        update public.trust_milestones
        set celebrated = true
        where user_id = p_user_id and milestone_score = v_milestone;
      end if;
    end if;
  end loop;
end;
$$;

-- Trigger to update platform stats after loan changes
create or replace function private.me2u_trigger_platform_stats()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.me2u_update_platform_stats();
  return new;
end;
$$;

drop trigger if exists loans_update_platform_stats on public.loans;
create trigger loans_update_platform_stats
  after insert or update or delete on public.loans
  for each statement
  execute function private.me2u_trigger_platform_stats();

drop trigger if exists circles_update_platform_stats on public.circles;
create trigger circles_update_platform_stats
  after insert or delete on public.circles
  for each statement
  execute function private.me2u_trigger_platform_stats();

drop trigger if exists profiles_update_platform_stats on public.profiles;
create trigger profiles_update_platform_stats
  after insert on public.profiles
  for each statement
  execute function private.me2u_trigger_platform_stats();

-- Trigger to check badges after relevant actions
create or replace function private.me2u_trigger_badge_check()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'loans' then
    perform private.me2u_check_user_badges(new.borrower_id);
    if new.lender_id is not null then
      perform private.me2u_check_user_badges(new.lender_id);
    end if;
  elsif tg_table_name = 'profiles' then
    if new.trust_score <> coalesce(old.trust_score, 85) then
      perform private.me2u_record_trust_milestone(new.id, new.trust_score);
      perform private.me2u_check_user_badges(new.id);
    end if;
  elsif tg_table_name = 'referrals' then
    perform private.me2u_check_user_badges(new.referrer_id);
  elsif tg_table_name = 'savings_goals' then
    perform private.me2u_check_user_badges(new.user_id);
  end if;
  
  return new;
end;
$$;

drop trigger if exists loans_check_badges on public.loans;
create trigger loans_check_badges
  after insert or update on public.loans
  for each row
  execute function private.me2u_trigger_badge_check();

drop trigger if exists profiles_check_badges on public.profiles;
create trigger profiles_check_badges
  after update of trust_score on public.profiles
  for each row
  execute function private.me2u_trigger_badge_check();

drop trigger if exists referrals_check_badges on public.referrals;
create trigger referrals_check_badges
  after insert on public.referrals
  for each row
  execute function private.me2u_trigger_badge_check();

drop trigger if exists savings_goals_check_badges on public.savings_goals;
create trigger savings_goals_check_badges
  after insert or update of current_amount on public.savings_goals
  for each row
  execute function private.me2u_trigger_badge_check();

-- Initialize platform stats
select private.me2u_update_platform_stats();

-- â”€â”€â”€ 13. REPLICA IDENTITY FOR REALTIME â”€â”€â”€

do $$
begin
  alter table public.badges replica identity full;
  alter table public.user_badges replica identity full;
  alter table public.platform_stats replica identity full;
  alter table public.success_stories replica identity full;
  alter table public.circle_performance replica identity full;
  alter table public.circle_rewards replica identity full;
  alter table public.trust_milestones replica identity full;
  alter table public.user_contacts replica identity full;
  alter table public.education_content replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.user_badges;
  alter publication supabase_realtime add table public.platform_stats;
  alter publication supabase_realtime add table public.trust_milestones;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on table public.badges is 'Defines available badges users can earn';
comment on table public.user_badges is 'Tracks badges earned by each user';
comment on table public.platform_stats is 'Real-time platform statistics for social proof';
comment on table public.success_stories is 'User success stories for testimonials';
comment on table public.circle_performance is 'Performance metrics for lending circles';
comment on table public.circle_rewards is 'Rewards earned by circles for achievements';
comment on table public.trust_milestones is 'Trust score milestones reached by users';
comment on table public.user_contacts is 'Hashed phone contacts for friend discovery';
comment on table public.education_content is 'Financial education articles and guides';


-- ============================================================
-- Migration: 20260916100000_enhanced_viral_referral_system.sql
-- ============================================================

-- Enhanced Viral Referral System
-- 1. Double-sided incentive: â‚¦1500 signup bonus for referee
-- 2. Weekly challenges: 3 refs/week = â‚¦4500 bonus
-- 3. Milestone rewards: 10 refs = â‚¦10K + badge
-- 4. Monthly leaderboard: Top 10 referrers win prizes
-- 5. Account unlock: â‚¦2000 fee OR 10 verified referrals to withdraw
-- 6. Share templates tracking

-- â”€â”€â”€ 1. Add Account Unlock Tracking to Profiles â”€â”€â”€

alter table public.profiles 
  add column if not exists account_unlocked boolean not null default false,
  add column if not exists account_unlock_paid_at timestamptz,
  add column if not exists verified_referral_count integer not null default 0,
  add column if not exists weekly_referral_count integer not null default 0,
  add column if not exists last_referral_week timestamptz;

create index if not exists profiles_account_unlocked_idx on public.profiles(account_unlocked) where account_unlocked = false;
create index if not exists profiles_verified_referral_count_idx on public.profiles(verified_referral_count);

comment on column public.profiles.account_unlocked is 'User can withdraw if true (paid â‚¦2000 OR has 10+ verified referrals)';
comment on column public.profiles.verified_referral_count is 'Count of referrals who completed first withdrawal (verified active users)';

-- â”€â”€â”€ 2. Account Unlock Payments Table â”€â”€â”€

create table if not exists public.account_unlock_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null default 2000,
  payment_reference text not null unique,
  payment_provider text not null default 'paystack',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_unlock_payments_user_idx on public.account_unlock_payments(user_id);
create index if not exists account_unlock_payments_ref_idx on public.account_unlock_payments(payment_reference);
create index if not exists account_unlock_payments_status_idx on public.account_unlock_payments(status) where status = 'pending';

alter table public.account_unlock_payments enable row level security;

drop policy if exists "Users can view their own unlock payments" on public.account_unlock_payments;
create policy "Users can view their own unlock payments"
  on public.account_unlock_payments for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create unlock payment records" on public.account_unlock_payments;
create policy "Users can create unlock payment records"
  on public.account_unlock_payments for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.account_unlock_payments to authenticated;
grant all on public.account_unlock_payments to service_role;

-- â”€â”€â”€ 3. Referral Challenges Table (Weekly) â”€â”€â”€

create table if not exists public.referral_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_type text not null check (challenge_type in ('weekly_3_refs', 'monthly_10_refs', 'custom')),
  target_count integer not null,
  current_count integer not null default 0,
  reward_amount numeric not null,
  week_start timestamptz not null,
  week_end timestamptz not null,
  completed boolean not null default false,
  completed_at timestamptz,
  reward_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists referral_challenges_user_idx on public.referral_challenges(user_id);
create index if not exists referral_challenges_week_idx on public.referral_challenges(week_start, week_end);
create index if not exists referral_challenges_active_idx on public.referral_challenges(user_id, week_start) 
  where completed = false;

alter table public.referral_challenges enable row level security;

drop policy if exists "Users can view their own challenges" on public.referral_challenges;
create policy "Users can view their own challenges"
  on public.referral_challenges for select to authenticated
  using (auth.uid() = user_id);

grant select on public.referral_challenges to authenticated;
grant all on public.referral_challenges to service_role;

-- â”€â”€â”€ 4. Referral Milestones Table â”€â”€â”€

create table if not exists public.referral_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_type text not null check (milestone_type in ('10_refs', '25_refs', '50_refs', '100_refs', 'custom')),
  referral_count integer not null,
  reward_amount numeric not null,
  badge_awarded text,
  achieved_at timestamptz not null default now(),
  reward_paid boolean not null default false
);

create unique index if not exists referral_milestones_user_type_idx 
  on public.referral_milestones(user_id, milestone_type);

alter table public.referral_milestones enable row level security;

drop policy if exists "Users can view their own milestones" on public.referral_milestones;
create policy "Users can view their own milestones"
  on public.referral_milestones for select to authenticated
  using (auth.uid() = user_id);

grant select on public.referral_milestones to authenticated;
grant all on public.referral_milestones to service_role;

-- â”€â”€â”€ 5. Referral Leaderboard Table (Monthly) â”€â”€â”€

create table if not exists public.referral_leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null,
  month_end date not null,
  referral_count integer not null default 0,
  verified_referral_count integer not null default 0,
  rank integer,
  prize_amount numeric,
  prize_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists referral_leaderboard_user_month_idx 
  on public.referral_leaderboard(user_id, month_start);
create index if not exists referral_leaderboard_month_rank_idx 
  on public.referral_leaderboard(month_start, rank) where rank is not null;

alter table public.referral_leaderboard enable row level security;

drop policy if exists "Anyone can view leaderboard" on public.referral_leaderboard;
create policy "Anyone can view leaderboard"
  on public.referral_leaderboard for select to authenticated
  using (true);

grant select on public.referral_leaderboard to authenticated;
grant all on public.referral_leaderboard to service_role;

-- â”€â”€â”€ 6. Share Templates Usage Tracking â”€â”€â”€

create table if not exists public.share_template_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_type text not null check (template_type in ('whatsapp', 'sms', 'copy', 'native_share')),
  shared_at timestamptz not null default now()
);

create index if not exists share_template_usage_user_idx on public.share_template_usage(user_id);
create index if not exists share_template_usage_type_idx on public.share_template_usage(template_type);

alter table public.share_template_usage enable row level security;

drop policy if exists "Users can create their own share tracking" on public.share_template_usage;
create policy "Users can create their own share tracking"
  on public.share_template_usage for insert to authenticated
  with check (auth.uid() = user_id);

grant insert on public.share_template_usage to authenticated;
grant all on public.share_template_usage to service_role;

-- â”€â”€â”€ 7. Update Referral Reward Triggers for New System â”€â”€â”€

-- Modified: Give â‚¦1500 to referee on signup
create or replace function private.me2u_give_signup_bonus_to_referee()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_signup_bonus numeric := 1500;
begin
  -- Credit new user's wallet with signup bonus
  update public.wallets
  set balance = balance + v_signup_bonus
  where user_id = new.referee_id;

  -- Log transaction
  insert into public.transactions (user_id, type, amount, description)
  values (new.referee_id, 'deposit', v_signup_bonus, 'Welcome bonus â€” signed up with referral code');

  -- Notify new user
  insert into public.notifications (user_id, title, message)
  values (
    new.referee_id,
    'Welcome Bonus!',
    'You received â‚¦1,500 welcome bonus for joining Me2U with a referral code. Start borrowing today!'
  );

  -- Notify referrer
  insert into public.notifications (user_id, title, message)
  values (
    new.referrer_id,
    'New Referral Signed Up!',
    'Someone just joined using your referral code. Help them succeed to earn your rewards!'
  );

  return new;
end;
$$;

drop trigger if exists referral_signup_bonus_trigger on public.referrals;
create trigger referral_signup_bonus_trigger
  after insert on public.referrals
  for each row
  execute function private.me2u_give_signup_bonus_to_referee();

-- Modified: Increment verified_referral_count on first withdrawal + check unlock
create or replace function private.me2u_handle_referral_withdrawal_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 250;
  v_updated integer;
  v_new_verified_count integer;
begin
  if new.status = 'success' and old.status in ('pending', 'processing') then
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.user_id
      and first_withdrawal_rewarded = false
    limit 1;

    if v_referrer_id is not null then
      -- Credit referrer wallet
      update public.wallets
      set balance = balance + v_reward
      where user_id = v_referrer_id;

      get diagnostics v_updated = row_count;
      if v_updated = 1 then
        -- Mark rewarded
        update public.referrals
        set first_withdrawal_rewarded = true
        where referee_id = new.user_id
          and referrer_id = v_referrer_id;

        -- Increment verified referral count
        update public.profiles
        set verified_referral_count = verified_referral_count + 1
        where id = v_referrer_id
        returning verified_referral_count into v_new_verified_count;

        -- Auto-unlock account if reached 10 verified referrals
        if v_new_verified_count >= 10 then
          update public.profiles
          set account_unlocked = true
          where id = v_referrer_id and account_unlocked = false;
          
          if found then
            insert into public.notifications (user_id, title, message)
            values (
              v_referrer_id,
              'Account Unlocked! ðŸŽ‰',
              'You reached 10 verified referrals! Your account is now unlocked and you can withdraw anytime.'
            );
          end if;
        end if;

        -- Log transaction
        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward â€” first withdrawal by referee');

        -- Notify referrer
        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          format('You earned â‚¦250 wallet credit! %s/%s verified referrals for account unlock.', 
            v_new_verified_count, 10)
        );

        -- Check weekly challenge progress
        perform private.me2u_check_weekly_challenge(v_referrer_id);
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- â”€â”€â”€ 8. Weekly Challenge Checker â”€â”€â”€

create or replace function private.me2u_check_weekly_challenge(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_weekly_count integer;
  v_challenge_reward numeric := 4500;
  v_existing_challenge uuid;
begin
  -- Calculate current week (Monday to Sunday)
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days';

  -- Count verified referrals this week
  select count(*) into v_weekly_count
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = true
    and created_at >= v_week_start
    and created_at < v_week_end;

  -- Check if challenge exists for this week
  select id into v_existing_challenge
  from public.referral_challenges
  where user_id = p_user_id
    and week_start = v_week_start
    and challenge_type = 'weekly_3_refs'
  limit 1;

  -- Create or update challenge
  if v_existing_challenge is null and v_weekly_count >= 1 then
    insert into public.referral_challenges 
      (user_id, challenge_type, target_count, current_count, reward_amount, week_start, week_end)
    values 
      (p_user_id, 'weekly_3_refs', 3, v_weekly_count, v_challenge_reward, v_week_start, v_week_end);
  elsif v_existing_challenge is not null then
    update public.referral_challenges
    set current_count = v_weekly_count,
        completed = (v_weekly_count >= 3),
        completed_at = case when v_weekly_count >= 3 and not completed then now() else completed_at end
    where id = v_existing_challenge;
  end if;

  -- Pay reward if just completed
  if v_weekly_count = 3 then
    update public.referral_challenges
    set reward_paid = true
    where id = v_existing_challenge
      and completed = true
      and reward_paid = false;

    if found then
      update public.wallets
      set balance = balance + v_challenge_reward
      where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'deposit', v_challenge_reward, 'Weekly challenge reward â€” 3 verified referrals this week');

      insert into public.notifications (user_id, title, message)
      values (
        p_user_id,
        'Weekly Challenge Complete! ðŸ”¥',
        'You referred 3 verified users this week and earned â‚¦4,500 bonus!'
      );
    end if;
  end if;
end;
$$;

-- â”€â”€â”€ 9. Milestone Checker (10 refs = â‚¦10K) â”€â”€â”€

create or replace function private.me2u_check_milestones(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_verified_count integer;
  v_milestone_exists boolean;
begin
  select verified_referral_count into v_verified_count
  from public.profiles
  where id = p_user_id;

  -- 10 referrals milestone
  if v_verified_count >= 10 then
    select exists(
      select 1 from public.referral_milestones
      where user_id = p_user_id and milestone_type = '10_refs'
    ) into v_milestone_exists;

    if not v_milestone_exists then
      insert into public.referral_milestones 
        (user_id, milestone_type, referral_count, reward_amount, badge_awarded)
      values 
        (p_user_id, '10_refs', 10, 10000, 'network_builder_gold');

      update public.wallets
      set balance = balance + 10000
      where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'deposit', 10000, 'Milestone reward â€” 10 verified referrals');

      -- Award badge
      insert into public.user_badges (user_id, badge_id)
      select p_user_id, b.id
      from public.badges b
      where b.badge_type = 'referrals' and b.name = 'Network Builder Gold'
      on conflict (user_id, badge_id) do nothing;

      insert into public.notifications (user_id, title, message)
      values (
        p_user_id,
        'Milestone Unlocked! ðŸ†',
        'You reached 10 verified referrals! You earned â‚¦10,000 bonus + Network Builder Gold badge!'
      );
    end if;
  end if;

  -- 25 referrals milestone
  if v_verified_count >= 25 then
    select exists(
      select 1 from public.referral_milestones
      where user_id = p_user_id and milestone_type = '25_refs'
    ) into v_milestone_exists;

    if not v_milestone_exists then
      insert into public.referral_milestones 
        (user_id, milestone_type, referral_count, reward_amount, badge_awarded)
      values 
        (p_user_id, '25_refs', 25, 25000, 'network_builder_platinum');

      update public.wallets
      set balance = balance + 25000
      where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'deposit', 25000, 'Milestone reward â€” 25 verified referrals');

      insert into public.notifications (user_id, title, message)
      values (
        p_user_id,
        'Legendary Achievement! ðŸ’Ž',
        'You reached 25 verified referrals! You earned â‚¦25,000 bonus + Platinum badge!'
      );
    end if;
  end if;
end;
$$;

-- Trigger milestone checks after withdrawal reward
create or replace function private.me2u_trigger_milestone_check()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.me2u_check_milestones(new.id);
  return new;
end;
$$;

drop trigger if exists profile_milestone_check_trigger on public.profiles;
create trigger profile_milestone_check_trigger
  after update of verified_referral_count on public.profiles
  for each row
  execute function private.me2u_trigger_milestone_check();

-- â”€â”€â”€ 10. Monthly Leaderboard Builder (Cron Job) â”€â”€â”€

create or replace function private.me2u_build_monthly_leaderboard()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month_start date;
  v_month_end date;
  v_rank integer;
  v_prize_structure numeric[] := ARRAY[50000, 30000, 20000, 15000, 10000, 5000, 5000, 5000, 5000, 5000];
begin
  v_month_start := date_trunc('month', now() - interval '1 month')::date;
  v_month_end := date_trunc('month', now())::date;

  -- Build leaderboard entries
  insert into public.referral_leaderboard 
    (user_id, month_start, month_end, referral_count, verified_referral_count, rank, prize_amount)
  select 
    r.referrer_id,
    v_month_start,
    v_month_end,
    count(*) as referral_count,
    count(*) filter (where r.first_withdrawal_rewarded = true) as verified_referral_count,
    row_number() over (order by count(*) filter (where r.first_withdrawal_rewarded = true) desc) as rank,
    case 
      when row_number() over (order by count(*) filter (where r.first_withdrawal_rewarded = true) desc) <= 10
      then v_prize_structure[row_number() over (order by count(*) filter (where r.first_withdrawal_rewarded = true) desc)]
      else null
    end as prize_amount
  from public.referrals r
  where r.created_at >= v_month_start and r.created_at < v_month_end
  group by r.referrer_id
  having count(*) filter (where r.first_withdrawal_rewarded = true) > 0
  on conflict (user_id, month_start) do update
  set referral_count = excluded.referral_count,
      verified_referral_count = excluded.verified_referral_count,
      rank = excluded.rank,
      prize_amount = excluded.prize_amount,
      updated_at = now();

  -- Pay prizes to top 10
  update public.referral_leaderboard rl
  set prize_paid = true
  where rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = false
    and rl.prize_amount > 0;

  -- Credit wallets
  update public.wallets w
  set balance = w.balance + rl.prize_amount
  from public.referral_leaderboard rl
  where w.user_id = rl.user_id
    and rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = true
    and not exists (
      select 1 from public.transactions t
      where t.user_id = rl.user_id 
        and t.description like 'Monthly leaderboard prize â€” Rank ' || rl.rank::text || '%'
        and t.created_at >= v_month_start
    );

  -- Log transactions and notify
  insert into public.transactions (user_id, type, amount, description)
  select 
    rl.user_id,
    'deposit',
    rl.prize_amount,
    format('Monthly leaderboard prize â€” Rank %s', rl.rank)
  from public.referral_leaderboard rl
  where rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = true
    and not exists (
      select 1 from public.transactions t
      where t.user_id = rl.user_id 
        and t.description like 'Monthly leaderboard prize â€” Rank ' || rl.rank::text || '%'
        and t.created_at >= v_month_start
    );

  insert into public.notifications (user_id, title, message)
  select 
    rl.user_id,
    format('Leaderboard Winner! ðŸ† Rank #%s', rl.rank),
    format('You ranked #%s in last month''s referral leaderboard and won â‚¦%s!', 
      rl.rank, rl.prize_amount::text)
  from public.referral_leaderboard rl
  where rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = true
    and not exists (
      select 1 from public.notifications n
      where n.user_id = rl.user_id 
        and n.title like 'Leaderboard Winner! ðŸ† Rank #' || rl.rank::text
        and n.created_at >= v_month_start
    );
end;
$$;

-- Grant execute to cron job scheduler
grant execute on function private.me2u_build_monthly_leaderboard() to service_role;

-- â”€â”€â”€ 11. New Badges for Milestones â”€â”€â”€

insert into public.badges (badge_type, name, description, icon_name, required_value)
values 
  ('referrals', 'Network Builder Gold', 'Referred 10 verified active users', 'trophy', 10),
  ('referrals', 'Network Builder Platinum', 'Referred 25 verified active users', 'trophy', 25),
  ('referrals', 'Weekly Champion', 'Completed 3 referrals in a single week', 'fire', 3)
on conflict (badge_type, name) do nothing;

-- â”€â”€â”€ 12. Helper Functions â”€â”€â”€

-- Check if user can withdraw
create or replace function public.me2u_can_user_withdraw(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_unlocked boolean;
  v_verified_count integer;
begin
  select account_unlocked, verified_referral_count
  into v_account_unlocked, v_verified_count
  from public.profiles
  where id = p_user_id;

  -- Can withdraw if account is unlocked OR has 10+ verified referrals
  return v_account_unlocked or v_verified_count >= 10;
end;
$$;

grant execute on function public.me2u_can_user_withdraw(uuid) to authenticated;

-- Get current week's challenge status
create or replace function public.me2u_get_current_week_challenge(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_challenge record;
begin
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days';

  select * into v_challenge
  from public.referral_challenges
  where user_id = p_user_id
    and week_start = v_week_start
    and challenge_type = 'weekly_3_refs'
  limit 1;

  if v_challenge is null then
    return json_build_object(
      'active', false,
      'target', 3,
      'current', 0,
      'reward', 4500,
      'week_end', v_week_end
    );
  else
    return json_build_object(
      'active', true,
      'target', v_challenge.target_count,
      'current', v_challenge.current_count,
      'reward', v_challenge.reward_amount,
      'completed', v_challenge.completed,
      'week_end', v_week_end
    );
  end if;
end;
$$;

grant execute on function public.me2u_get_current_week_challenge(uuid) to authenticated;

-- â”€â”€â”€ 13. Update Affiliate Rewards Table â”€â”€â”€

comment on table public.referrals is 'Enhanced referral tracking with signup bonuses, challenges, and milestones';

-- â”€â”€â”€ 14. Replica Identity for Realtime â”€â”€â”€

do $$
begin
  alter table public.account_unlock_payments replica identity full;
  alter table public.referral_challenges replica identity full;
  alter table public.referral_milestones replica identity full;
  alter table public.referral_leaderboard replica identity full;
exception
  when undefined_table then null;
end;
$$;


-- ============================================================
-- Migration: 20260916120000_upgrade_unlock_subscriptions.sql
-- ============================================================

-- ============================================================
-- Me2U Upgrade: 15-Day Unlock + Subscriptions Foundation
-- Migration: 20260916120000
-- ============================================================
--
-- PART 1: Enhanced Withdrawal Unlock System
--   - Replace hard 10-referral lock with 15-day grace period
--   - Allow unlock via: (1) 15 days + one-time â‚¦2,000 payment, OR (2) 10 referrals
--   - Track unlock method for analytics
--
-- PART 2: Subscriptions & Premium Foundation
--   - Subscription plans (Free, Plus, Lender Pro, Circles Pro)
--   - Feature entitlements system
--   - Revenue events expansion
--   - Analytics tracking
-- ============================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1. Update profiles table for 15-day unlock
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Add unlock tracking columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS unlock_eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlock_method text CHECK (unlock_method IN ('time_based', 'referrals', 'payment', 'subscription')),
  ADD COLUMN IF NOT EXISTS unlock_requested_at timestamptz;

-- Compute unlock_eligible_at for existing users (15 days after registration)
UPDATE profiles 
SET unlock_eligible_at = created_at + INTERVAL '15 days'
WHERE unlock_eligible_at IS NULL;

-- Create index for unlock checks
CREATE INDEX IF NOT EXISTS idx_profiles_unlock_eligible 
  ON profiles(unlock_eligible_at) 
  WHERE account_unlocked = false;

COMMENT ON COLUMN profiles.unlock_eligible_at IS 'Date when user becomes eligible for time-based unlock (15 days after registration + payment)';
COMMENT ON COLUMN profiles.unlock_method IS 'How account was unlocked: time_based (15d+payment), referrals (10+), payment (immediate â‚¦2k), subscription (Plus)';
COMMENT ON COLUMN profiles.unlock_requested_at IS 'When user clicked unlock button (for conversion tracking)';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2. Subscription plans & entitlements
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Subscription plans enum
DO $$ BEGIN
  CREATE TYPE subscription_plan_type AS ENUM (
    'free',
    'plus_monthly',      -- â‚¦1,500/mo for borrowers
    'plus_annual',       -- â‚¦12,000/yr (save â‚¦6,000)
    'lender_pro_monthly', -- â‚¦2,500/mo for lenders
    'lender_pro_volume',  -- 2% of funded volume
    'circles_pro'         -- â‚¦5,000/mo per circle
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan subscription_plan_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Pricing
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  billing_period text CHECK (billing_period IN ('monthly', 'annual', 'volume_based')),
  
  -- Dates
  started_at timestamptz NOT NULL DEFAULT NOW(),
  current_period_start timestamptz NOT NULL DEFAULT NOW(),
  current_period_end timestamptz NOT NULL,
  canceled_at timestamptz,
  trial_end timestamptz,
  
  -- Payment
  payment_method text, -- 'paystack', 'wallet_balance', 'bank_transfer'
  paystack_subscription_code text UNIQUE,
  paystack_customer_code text,
  last_payment_at timestamptz,
  next_payment_due timestamptz,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  CONSTRAINT subscriptions_period_valid CHECK (current_period_end > current_period_start),
  CONSTRAINT subscriptions_one_active_per_user UNIQUE (user_id, plan) 
    WHERE status IN ('active', 'trialing')
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_next_payment ON subscriptions(next_payment_due) 
  WHERE status IN ('active', 'past_due');
CREATE INDEX idx_subscriptions_paystack_code ON subscriptions(paystack_subscription_code) 
  WHERE paystack_subscription_code IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE subscriptions IS 'User subscription plans (Plus, Lender Pro, Circles Pro)';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3. Feature entitlements
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Withdrawal features
  instant_withdrawals_enabled boolean NOT NULL DEFAULT false,
  instant_withdraw_quota integer NOT NULL DEFAULT 0, -- per month
  instant_withdraw_used integer NOT NULL DEFAULT 0,
  withdraw_fee_discount_percent integer NOT NULL DEFAULT 0 CHECK (withdraw_fee_discount_percent BETWEEN 0 AND 100),
  
  -- Loan features
  max_platform_loan_multiplier numeric(3,2) NOT NULL DEFAULT 1.0 CHECK (max_platform_loan_multiplier >= 1.0),
  extended_duration_days integer NOT NULL DEFAULT 0, -- extra days beyond standard 14
  priority_support boolean NOT NULL DEFAULT false,
  
  -- Marketplace features
  boost_quota integer NOT NULL DEFAULT 1, -- free boosts per month
  boost_used integer NOT NULL DEFAULT 0,
  boost_discount_percent integer NOT NULL DEFAULT 0 CHECK (boost_discount_percent BETWEEN 0 AND 100),
  featured_listing boolean NOT NULL DEFAULT false,
  auto_match_enabled boolean NOT NULL DEFAULT false,
  
  -- Lender features
  verified_lender_badge boolean NOT NULL DEFAULT false,
  portfolio_analytics boolean NOT NULL DEFAULT false,
  auto_relend boolean NOT NULL DEFAULT false,
  lender_insurance_enabled boolean NOT NULL DEFAULT false,
  lender_insurance_coverage_percent integer NOT NULL DEFAULT 0 CHECK (lender_insurance_coverage_percent BETWEEN 0 AND 100),
  
  -- Circle features
  max_circles integer NOT NULL DEFAULT 1,
  circle_admin_tools boolean NOT NULL DEFAULT false,
  circle_analytics boolean NOT NULL DEFAULT false,
  
  -- Reporting
  advanced_credit_report boolean NOT NULL DEFAULT false,
  downloadable_certificate boolean NOT NULL DEFAULT false,
  
  -- Reset tracking
  quota_reset_at timestamptz NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  CONSTRAINT feature_entitlements_one_per_user UNIQUE (user_id)
);

CREATE INDEX idx_feature_entitlements_user ON feature_entitlements(user_id);
CREATE INDEX idx_feature_entitlements_quota_reset ON feature_entitlements(quota_reset_at);

CREATE TRIGGER feature_entitlements_set_updated_at
  BEFORE UPDATE ON feature_entitlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE feature_entitlements IS 'Per-user feature flags and quotas based on subscription tier';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 4. Expand revenue_events
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Add new revenue event types
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'subscription_recurring';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'instant_payout_fee';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'credit_report_sale';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'circle_subscription';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'lender_insurance_fee';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'featured_listing';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'unlock_payment';
ALTER TYPE revenue_event_type ADD VALUE IF NOT EXISTS 'bills_convenience_fee';

-- Add subscription tracking to revenue_events
ALTER TABLE revenue_events 
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_type subscription_plan_type;

CREATE INDEX IF NOT EXISTS idx_revenue_events_subscription ON revenue_events(subscription_id) 
  WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_events_plan_type ON revenue_events(plan_type) 
  WHERE plan_type IS NOT NULL;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 5. Analytics & metrics tracking
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS user_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Engagement metrics
  loans_taken integer NOT NULL DEFAULT 0,
  loans_given integer NOT NULL DEFAULT 0,
  total_borrowed numeric(14,2) NOT NULL DEFAULT 0,
  total_lent numeric(14,2) NOT NULL DEFAULT 0,
  on_time_repayments integer NOT NULL DEFAULT 0,
  late_repayments integer NOT NULL DEFAULT 0,
  
  -- Revenue metrics
  lifetime_fees_paid numeric(14,2) NOT NULL DEFAULT 0,
  lifetime_referral_earned numeric(14,2) NOT NULL DEFAULT 0,
  subscription_months integer NOT NULL DEFAULT 0,
  
  -- Behavior
  bills_purchased integer NOT NULL DEFAULT 0,
  bills_value numeric(14,2) NOT NULL DEFAULT 0,
  withdrawals_count integer NOT NULL DEFAULT 0,
  marketplace_posts integer NOT NULL DEFAULT 0,
  boost_purchases integer NOT NULL DEFAULT 0,
  
  -- Timestamps
  first_loan_at timestamptz,
  last_active_at timestamptz,
  ltv_calculated_at timestamptz,
  lifetime_value numeric(14,2) NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_metrics_one_per_user UNIQUE (user_id)
);

CREATE INDEX idx_user_metrics_user ON user_metrics(user_id);
CREATE INDEX idx_user_metrics_ltv ON user_metrics(lifetime_value DESC);
CREATE INDEX idx_user_metrics_last_active ON user_metrics(last_active_at DESC);

CREATE TRIGGER user_metrics_set_updated_at
  BEFORE UPDATE ON user_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE user_metrics IS 'Aggregated user behavior and revenue metrics for LTV/CAC analysis';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 6. Functions for unlock eligibility
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Function to check if user is eligible for time-based unlock
CREATE OR REPLACE FUNCTION is_eligible_for_time_based_unlock(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_profile RECORD;
  v_payment_made boolean;
BEGIN
  -- Get profile info
  SELECT 
    created_at,
    registration_deposit_paid,
    account_unlocked,
    unlock_eligible_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- Already unlocked
  IF v_profile.account_unlocked THEN
    RETURN true;
  END IF;
  
  -- Check if registration payment made
  SELECT EXISTS (
    SELECT 1 FROM account_unlock_payments
    WHERE user_id = p_user_id 
      AND status = 'success'
      AND amount >= 2000
    LIMIT 1
  ) INTO v_payment_made;
  
  -- Eligible if: 15 days passed + payment made
  RETURN (
    v_profile.registration_deposit_paid AND
    v_payment_made AND
    v_profile.unlock_eligible_at <= NOW()
  );
END;
$$;

COMMENT ON FUNCTION is_eligible_for_time_based_unlock IS 'Check if user can unlock via 15-day + â‚¦2,000 payment method';

-- Function to check if user is eligible for referral unlock
CREATE OR REPLACE FUNCTION is_eligible_for_referral_unlock(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COALESCE(verified_referral_count, 0)
  INTO v_count
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN v_count >= 10;
END;
$$;

COMMENT ON FUNCTION is_eligible_for_referral_unlock IS 'Check if user has 10+ verified referrals for free unlock';

-- Function to check if user is eligible for subscription unlock (Plus or higher)
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND plan IN ('plus_monthly', 'plus_annual', 'lender_pro_monthly', 'lender_pro_volume')
      AND current_period_end > NOW()
  );
END;
$$;

COMMENT ON FUNCTION has_active_subscription IS 'Check if user has active Plus or Lender Pro subscription (auto-unlocks)';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 7. Initialize entitlements for existing users
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Create feature entitlements for all existing users (defaults to free tier)
INSERT INTO feature_entitlements (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM feature_entitlements WHERE user_id = profiles.id
);

-- Create user metrics for all existing users
INSERT INTO user_metrics (user_id, last_active_at)
SELECT id, updated_at FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_metrics WHERE user_id = profiles.id
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 8. Update account_unlock_payments for better tracking
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE account_unlock_payments
  ADD COLUMN IF NOT EXISTS unlock_type text CHECK (unlock_type IN ('immediate', 'time_based')) DEFAULT 'time_based',
  ADD COLUMN IF NOT EXISTS eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS days_since_registration integer;

COMMENT ON COLUMN account_unlock_payments.unlock_type IS 'immediate = pay â‚¦2k now to unlock instantly, time_based = pay â‚¦2k + wait 15 days';
COMMENT ON COLUMN account_unlock_payments.eligible_at IS 'When user will be eligible for unlock (15 days after this payment)';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 9. Create views for analytics
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- View: User unlock status summary
CREATE OR REPLACE VIEW user_unlock_status AS
SELECT 
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at as registered_at,
  p.unlock_eligible_at,
  p.account_unlocked,
  p.account_unlock_paid_at,
  p.unlock_method,
  p.unlock_requested_at,
  p.verified_referral_count,
  
  -- Eligibility flags
  is_eligible_for_time_based_unlock(p.id) as time_unlock_eligible,
  is_eligible_for_referral_unlock(p.id) as referral_unlock_eligible,
  has_active_subscription(p.id) as has_subscription,
  
  -- Payment info
  aup.amount as unlock_payment_amount,
  aup.status as payment_status,
  aup.unlock_type,
  aup.eligible_at as payment_eligible_at,
  aup.created_at as payment_made_at,
  
  -- Subscription info
  s.plan as subscription_plan,
  s.status as subscription_status,
  
  -- Computed flags
  CASE 
    WHEN p.account_unlocked THEN 'unlocked'
    WHEN has_active_subscription(p.id) THEN 'eligible_via_subscription'
    WHEN is_eligible_for_referral_unlock(p.id) THEN 'eligible_via_referrals'
    WHEN is_eligible_for_time_based_unlock(p.id) THEN 'eligible_via_time'
    WHEN p.unlock_eligible_at > NOW() THEN 'waiting_15_days'
    ELSE 'locked'
  END as unlock_status
  
FROM profiles p
LEFT JOIN account_unlock_payments aup ON aup.user_id = p.id 
  AND aup.status = 'success'
  AND aup.created_at = (
    SELECT MAX(created_at) FROM account_unlock_payments 
    WHERE user_id = p.id AND status = 'success'
  )
LEFT JOIN subscriptions s ON s.user_id = p.id 
  AND s.status IN ('active', 'trialing')
  AND s.current_period_end > NOW();

COMMENT ON VIEW user_unlock_status IS 'Comprehensive user unlock eligibility status for admin dashboard';

-- View: Subscription revenue metrics
CREATE OR REPLACE VIEW subscription_revenue_summary AS
SELECT 
  DATE_TRUNC('day', s.started_at) as signup_date,
  s.plan,
  s.status,
  COUNT(*) as subscriptions_count,
  SUM(s.amount) as total_revenue,
  AVG(s.amount) as avg_revenue,
  COUNT(DISTINCT s.user_id) as unique_users
FROM subscriptions s
WHERE s.started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', s.started_at), s.plan, s.status
ORDER BY signup_date DESC, plan;

COMMENT ON VIEW subscription_revenue_summary IS 'Daily subscription revenue by plan for analytics dashboard';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 10. Seed data: Free plan for all existing users
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Create free subscription for all users who don't have one
INSERT INTO subscriptions (
  user_id, 
  plan, 
  status, 
  amount, 
  billing_period,
  current_period_start,
  current_period_end
)
SELECT 
  id,
  'free'::subscription_plan_type,
  'active'::subscription_status,
  0,
  'monthly',
  NOW(),
  NOW() + INTERVAL '100 years' -- Free plan never expires
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE user_id = profiles.id
)
ON CONFLICT DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Done!
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Summary
DO $$
BEGIN
  RAISE NOTICE 'âœ… Me2U Upgrade Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  â€¢ 15-day withdrawal unlock system';
  RAISE NOTICE '  â€¢ Subscription plans (Free, Plus, Lender Pro)';
  RAISE NOTICE '  â€¢ Feature entitlements framework';
  RAISE NOTICE '  â€¢ Expanded revenue tracking';
  RAISE NOTICE '  â€¢ User metrics & analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update withdrawal API to check new unlock logic';
  RAISE NOTICE '  2. Build subscription payment flow (Paystack recurring)';
  RAISE NOTICE '  3. Create Plus upgrade UI in /profile';
  RAISE NOTICE '  4. Add admin analytics dashboard';
  RAISE NOTICE '';
END $$;


-- ============================================================
-- Migration: 20260916130000_in_app_otp_system.sql
-- ============================================================

-- ============================================================
-- Me2U In-App OTP Verification System
-- Migration: 20260916130000
-- ============================================================
-- 
-- Self-contained OTP system with NO external dependencies
-- - No email services (no Gmail, SendGrid, Mailgun)
-- - No SMS services (no Termii, Twilio)
-- - OTP codes stored in database
-- - Codes displayed in-app for users to see
-- - Perfect for development and production
-- ============================================================

-- OTP purpose enum
DO $$ BEGIN
  CREATE TYPE otp_purpose_type AS ENUM ('register', 'login', 'password_reset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or phone
  code text NOT NULL, -- 6-digit code
  purpose otp_purpose_type NOT NULL,
  
  -- Expiry
  expires_at timestamptz NOT NULL,
  
  -- Status
  verified boolean NOT NULL DEFAULT false,
  
  -- Metadata
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  ip_address text,
  user_agent text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_otp_codes_identifier_purpose 
  ON otp_codes(identifier, purpose, verified, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at 
  ON otp_codes(expires_at) 
  WHERE verified = false;
CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at 
  ON otp_codes(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER otp_codes_set_updated_at
  BEFORE UPDATE ON otp_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE otp_codes IS 'Self-contained OTP verification codes - no external email/SMS services';
COMMENT ON COLUMN otp_codes.identifier IS 'Email or phone number that requested OTP';
COMMENT ON COLUMN otp_codes.code IS '6-digit verification code';
COMMENT ON COLUMN otp_codes.purpose IS 'What the OTP is for: register, login, or password_reset';
COMMENT ON COLUMN otp_codes.expires_at IS 'When this OTP expires (10 minutes from creation)';
COMMENT ON COLUMN otp_codes.verified IS 'Whether this OTP has been successfully verified';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of failed verification attempts';

-- Function to increment attempt counter
CREATE OR REPLACE FUNCTION increment_otp_attempt(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE otp_codes
  SET attempts = attempts + 1,
      last_attempt_at = NOW()
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION increment_otp_attempt IS 'Track failed OTP verification attempts';

-- Function to get active OTP for identifier
CREATE OR REPLACE FUNCTION get_active_otp(
  p_identifier text,
  p_purpose otp_purpose_type
)
RETURNS TABLE (
  code text,
  expires_at timestamptz,
  created_at timestamptz,
  minutes_until_expiry integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    otp.code,
    otp.expires_at,
    otp.created_at,
    GREATEST(0, EXTRACT(EPOCH FROM (otp.expires_at - NOW()))::integer / 60) as minutes_until_expiry
  FROM otp_codes otp
  WHERE otp.identifier = p_identifier
    AND otp.purpose = p_purpose
    AND otp.verified = false
    AND otp.expires_at > NOW()
  ORDER BY otp.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_active_otp IS 'Get currently active OTP for an identifier';

-- View: OTP verification stats
CREATE OR REPLACE VIEW otp_verification_stats AS
SELECT 
  DATE(created_at) as date,
  purpose,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE verified = true) as total_verified,
  COUNT(*) FILTER (WHERE verified = false AND expires_at < NOW()) as expired,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE verified = true) / NULLIF(COUNT(*), 0),
    2
  ) as verification_rate_percent
FROM otp_codes
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), purpose
ORDER BY date DESC, purpose;

COMMENT ON VIEW otp_verification_stats IS 'Daily OTP verification statistics for analytics';

-- Auto-cleanup: Delete expired OTPs older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_otps IS 'Delete OTP codes expired for more than 24 hours';

-- Summary
DO $$
BEGIN
  RAISE NOTICE 'âœ… In-App OTP System Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  â€¢ Self-contained OTP storage in database';
  RAISE NOTICE '  â€¢ No external email/SMS services needed';
  RAISE NOTICE '  â€¢ OTP codes displayed in-app';
  RAISE NOTICE '  â€¢ 10-minute expiry with auto-cleanup';
  RAISE NOTICE '  â€¢ Verification attempt tracking';
  RAISE NOTICE '  â€¢ Analytics and reporting';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  â€¢ otp_codes - stores verification codes';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  â€¢ get_active_otp() - retrieve current OTP';
  RAISE NOTICE '  â€¢ increment_otp_attempt() - track attempts';
  RAISE NOTICE '  â€¢ cleanup_expired_otps() - housekeeping';
  RAISE NOTICE '';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '  â€¢ otp_verification_stats - analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  âœ“ Zero external dependencies';
  RAISE NOTICE '  âœ“ Works offline';
  RAISE NOTICE '  âœ“ No API costs';
  RAISE NOTICE '  âœ“ Perfect for development & production';
  RAISE NOTICE '  âœ“ Privacy-focused (data stays in your database)';
  RAISE NOTICE '';
END $$;

