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
