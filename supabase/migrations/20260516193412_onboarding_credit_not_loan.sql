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
    raise exception 'Confirm your NGN 1,000 registration deposit before requesting a platform loan.';
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
    raise exception 'Confirm your NGN 1,000 registration deposit before withdrawal.';
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
