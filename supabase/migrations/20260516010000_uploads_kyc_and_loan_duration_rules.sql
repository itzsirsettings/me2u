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
