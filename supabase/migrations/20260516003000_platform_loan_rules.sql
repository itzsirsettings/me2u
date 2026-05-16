alter table public.loans
alter column lender_id drop not null;

alter table public.loans
drop constraint if exists loans_rate_check;

alter table public.loans
add constraint loans_rate_check check (rate >= 0);

create index if not exists loans_platform_borrower_status_idx
on public.loans (borrower_id, status, created_at desc)
where lender_id is null;

create or replace function private.lendpeer_request_platform_loan(
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

create or replace function public.lendpeer_request_platform_loan(
  p_user_id uuid,
  p_amount numeric default null
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.lendpeer_request_platform_loan(p_user_id, p_amount);
$$;

revoke execute on function private.lendpeer_request_platform_loan(uuid, numeric) from public, anon, authenticated;
grant execute on function private.lendpeer_request_platform_loan(uuid, numeric) to service_role;

revoke execute on function public.lendpeer_request_platform_loan(uuid, numeric) from public, anon, authenticated;
grant execute on function public.lendpeer_request_platform_loan(uuid, numeric) to service_role;
