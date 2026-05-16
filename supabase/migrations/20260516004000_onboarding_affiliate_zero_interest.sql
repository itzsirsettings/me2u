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
  v_registration_deposit numeric(14, 2) := 1000.00;
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
      raise exception 'Confirm your NGN 1,000 registration deposit before the first NGN 2,000 loan.';
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
    raise exception 'Confirm your NGN 1,000 registration deposit before withdrawal.';
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
