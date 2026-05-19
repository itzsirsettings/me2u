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
    raise exception 'Confirm your NGN 1,000 registration deposit before requesting a loan.';
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
    raise exception 'Confirm your NGN 1,000 registration deposit before withdrawal.';
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
