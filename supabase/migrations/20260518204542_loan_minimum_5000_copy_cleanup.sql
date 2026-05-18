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
    raise exception 'Confirm your NGN 1,000 registration deposit before withdrawal.';
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
