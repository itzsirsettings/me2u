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

create or replace function private.lendpeer_fund_wallet(
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

create or replace function private.lendpeer_withdraw_wallet(
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

create or replace function private.lendpeer_create_marketplace_item(
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

create or replace function private.lendpeer_accept_marketplace_item(
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

create or replace function private.lendpeer_repay_loan(
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

create or replace function public.lendpeer_fund_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.lendpeer_fund_wallet(p_user_id, p_amount);
$$;

create or replace function public.lendpeer_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.lendpeer_withdraw_wallet(p_user_id, p_amount);
$$;

create or replace function public.lendpeer_create_marketplace_item(
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
  select private.lendpeer_create_marketplace_item(
    p_user_id,
    p_type,
    p_amount,
    p_rate,
    p_days
  );
$$;

create or replace function public.lendpeer_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.lendpeer_accept_marketplace_item(p_user_id, p_item_id);
$$;

create or replace function public.lendpeer_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.lendpeer_repay_loan(p_user_id, p_loan_id);
$$;

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;
grant execute on all functions in schema private to service_role;

revoke execute on function public.lendpeer_fund_wallet(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.lendpeer_withdraw_wallet(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.lendpeer_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) from public, anon, authenticated;
revoke execute on function public.lendpeer_accept_marketplace_item(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.lendpeer_repay_loan(uuid, uuid) from public, anon, authenticated;

grant execute on function public.lendpeer_fund_wallet(uuid, numeric) to service_role;
grant execute on function public.lendpeer_withdraw_wallet(uuid, numeric) to service_role;
grant execute on function public.lendpeer_create_marketplace_item(uuid, public.marketplace_item_type, numeric, numeric, integer) to service_role;
grant execute on function public.lendpeer_accept_marketplace_item(uuid, uuid) to service_role;
grant execute on function public.lendpeer_repay_loan(uuid, uuid) to service_role;
