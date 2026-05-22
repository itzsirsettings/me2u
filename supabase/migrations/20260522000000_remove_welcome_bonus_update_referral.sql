-- Remove 2,000 Naira Welcome Bonus and Update Referral Logic
-- Requirement: 
-- 1. Remove welcome bonus entirely.
-- 2. Referral bonus (N500) only after referral completes KYC AND first loan repayment.

-- ─── 1. Update Referrals Table ───

-- Consolidate rewards into a single milestone
alter table public.referrals 
add column if not exists rewarded boolean not null default false;

-- Migrate existing status (if both were done, mark as rewarded)
update public.referrals
set rewarded = true
where first_withdrawal_rewarded = true and first_repayment_rewarded = true;

-- We'll keep the old columns for now to avoid breaking existing queries until we update them, 
-- but we'll stop using them in new logic.

-- ─── 2. Remove Welcome Bonus Logic ───

-- Drop the functions that handle welcome bonus
drop function if exists public.me2u_unlock_welcome_bonus(uuid);
drop function if exists private.me2u_unlock_welcome_bonus(uuid);

-- Update admin_approve_payment_proof to remove bonus call and update notifications
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

    -- REMOVED: perform private.me2u_unlock_welcome_bonus(v_proof.user_id);
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
      then 'Your registration deposit has been approved. You can now request your first loan after completing KYC.'
      else 'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
    end
  );
end;
$$;

-- ─── 3. Update Referral Reward Logic ───

-- Drop old withdrawal reward trigger and function
drop trigger if exists referral_withdrawal_trigger on public.withdrawal_requests;
drop function if exists private.me2u_handle_referral_withdrawal_reward();

-- Update repayment reward logic: Reward only after KYC + First Repayment
create or replace function private.me2u_handle_referral_repayment_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 500; -- Consolidated reward
  v_referee_kyc_verified boolean;
  v_updated integer;
begin
  -- Only fires when a loan transitions to completed
  if new.status = 'completed' and old.status = 'active' then
    
    -- Check if the borrower (referee) is KYC verified
    select kyc_verified into v_referee_kyc_verified
    from public.profiles
    where id = new.borrower_id;

    if not v_referee_kyc_verified then
      return new; -- Requirement: KYC must be complete
    end if;

    -- Find the referral where referee is this borrower and reward not yet given
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.borrower_id
      and rewarded = false
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
        set rewarded = true,
            first_repayment_rewarded = true, -- For backward compatibility
            first_withdrawal_rewarded = true -- For backward compatibility
        where referee_id = new.borrower_id
          and referrer_id = v_referrer_id;

        -- Log transaction
        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward — referee completed first loan and KYC');

        -- Notify referrer
        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          'You earned ₦500 wallet credit because your referral completed their first loan repayment and KYC.'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ─── 4. Update Referral Stats and Details ───

create or replace function public.me2u_get_referral_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_referrals integer;
  v_pending_rewards integer;
  v_earned_rewards integer;
  v_total_earned numeric;
begin
  select count(*) into v_total_referrals
  from public.referrals
  where referrer_id = p_user_id;

  select count(*) into v_pending_rewards
  from public.referrals
  where referrer_id = p_user_id
    and rewarded = false;

  select count(*) into v_earned_rewards
  from public.referrals
  where referrer_id = p_user_id
    and rewarded = true;

  v_total_earned := (v_earned_rewards * 500);

  return json_build_object(
    'total_referrals', v_total_referrals,
    'pending_rewards', v_pending_rewards,
    'earned_rewards', v_earned_rewards,
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
  rewarded boolean,
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
    r.rewarded,
    case
      when not r.rewarded then '₦500 pending (KYC + first loan)'
      else '₦500 earned'
    end as pending_rewards
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id
  order by r.created_at desc;
end;
$$;

-- ─── 5. Remove any other welcome bonus traces ───

-- Update any existing notifications or transactions descriptions if needed?
-- Better to just leave history but stop new ones.
