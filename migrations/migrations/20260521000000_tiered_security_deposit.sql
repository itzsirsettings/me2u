-- Tiered Security Deposit & Duration Model
-- Applies to both platform and peer-to-peer loans.
-- Trust tiers are stored in a table so admins can adjust thresholds without code changes.

-- ─── 1. Trust Tiers Table ───

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

-- ─── 2. Add security_deposit to loans ───

alter table public.loans
  add column if not exists security_deposit numeric(14,2) not null default 0;

-- ─── 3. Tier Calculation Functions ───

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

-- ─── 4. Modified: me2u_accept_marketplace_item (peer loans with tiered deposit) ───

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

      raise exception 'Borrower must have ₦% in wallet as security deposit.', v_deposit;
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

-- ─── 5. Modified: me2u_repay_loan (unlock deposit on repayment) ───

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

-- ─── 6. Modified: me2u_request_platform_loan (tiered deposit + duration) ───

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

-- ─── 7. NEW: me2u_process_loan_defaults (auto-transfer deposit after 7 days past due) ───

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
      (v_loan.borrower_id, 'deposit_forfeited', v_loan.security_deposit, 'Security deposit forfeited — loan defaulted'),
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

-- ─── 8. Public wrapper functions ───

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

-- ─── 9. Permissions ───

grant select on public.trust_tiers to authenticated;
grant all on public.trust_tiers to service_role;

-- ─── 10. Update existing loans without security_deposit ───

-- For existing active peer loans, calculate and set deposit based on borrower's current trust score
update public.loans l
set security_deposit = private.me2u_calculate_deposit(l.amount, p.trust_score)
from public.profiles p
where l.borrower_id = p.id
  and l.security_deposit = 0
  and l.status = 'active'
  and l.lender_id is not null;

-- ─── 11. Replica identity for realtime ───

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
