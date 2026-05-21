-- Earned Credit Referral System
-- Referrers earn wallet credit only when referees generate revenue (withdrawals, loan repayments).
-- Never pays on signup. Wallet credit only — must be earned out through their own activity.

-- ─── 1. Referrals Table ───

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  first_withdrawal_rewarded boolean not null default false,
  first_repayment_rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unique_referral_pair unique (referrer_id, referee_id),
  constraint no_self_referral check (referrer_id <> referee_id)
);

create index if not exists referrals_referee_idx on public.referrals(referee_id);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id);
create index if not exists referrals_pending_rewards_idx on public.referrals(referee_id)
  where first_withdrawal_rewarded = false or first_repayment_rewarded = false;

-- ─── 2. RLS Policies ───

alter table public.referrals enable row level security;

drop policy if exists "Users can read their own referrals" on public.referrals;
create policy "Users can read their own referrals"
  on public.referrals for select to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referee_id);

drop policy if exists "Users can create referrals for their referees" on public.referrals;
create policy "Users can create referrals for their referees"
  on public.referrals for insert to authenticated
  with check (auth.uid() = referrer_id);

grant select, insert, update on public.referrals to authenticated;
grant all on public.referrals to service_role;

-- ─── 3. Referral Reward Amount ───

-- ₦250 per milestone, ₦500 max per referral
-- Stored as a constant in the function for easy adjustment

-- ─── 4. Trigger: Reward on First Successful Withdrawal ───

create or replace function private.me2u_handle_referral_withdrawal_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 250;
  v_updated integer;
begin
  -- Only fires on transition to success status
  if new.status = 'success' and old.status in ('pending', 'processing') then
    -- Find the referral where referee is this user and reward not yet given
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.user_id
      and first_withdrawal_rewarded = false
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
        set first_withdrawal_rewarded = true
        where referee_id = new.user_id
          and referrer_id = v_referrer_id;

        -- Log transaction
        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward — first withdrawal by referee');

        -- Notify referrer
        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          'You earned ₦250 wallet credit because your referral completed their first withdrawal.'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists referral_withdrawal_trigger on public.withdrawal_requests;
create trigger referral_withdrawal_trigger
  after update on public.withdrawal_requests
  for each row
  execute function private.me2u_handle_referral_withdrawal_reward();

-- ─── 5. Trigger: Reward on First Loan Repayment ───

create or replace function private.me2u_handle_referral_repayment_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 250;
  v_updated integer;
begin
  -- Only fires when a loan transitions to completed
  if new.status = 'completed' and old.status = 'active' then
    -- Find the referral where referee is this borrower and reward not yet given
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.borrower_id
      and first_repayment_rewarded = false
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
        set first_repayment_rewarded = true
        where referee_id = new.borrower_id
          and referrer_id = v_referrer_id;

        -- Log transaction
        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward — first loan repayment by referee');

        -- Notify referrer
        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          'You earned ₦250 wallet credit because your referral completed their first loan repayment.'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists referral_repayment_trigger on public.loans;
create trigger referral_repayment_trigger
  after update on public.loans
  for each row
  execute function private.me2u_handle_referral_repayment_reward();

-- ─── 6. Function: Record Referral (called during registration) ───

create or replace function private.me2u_record_referral(
  p_referrer_id uuid,
  p_referee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_referrer_id = p_referee_id then
    return; -- No self-referrals
  end if;

  insert into public.referrals (referrer_id, referee_id)
  values (p_referrer_id, p_referee_id)
  on conflict (referrer_id, referee_id) do nothing;
end;
$$;

create or replace function public.me2u_record_referral(
  p_referrer_id uuid,
  p_referee_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_record_referral(p_referrer_id, p_referee_id);
$$;

grant execute on function public.me2u_record_referral(uuid, uuid) to authenticated;

-- ─── 7. Function: Get Referral Stats for a User ───

create or replace function public.me2u_get_referral_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_referrals integer;
  v_pending_withdrawal integer;
  v_pending_repayment integer;
  v_earned_withdrawal integer;
  v_earned_repayment integer;
  v_total_earned numeric;
begin
  select count(*) into v_total_referrals
  from public.referrals
  where referrer_id = p_user_id;

  select count(*) into v_pending_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = false;

  select count(*) into v_pending_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = false;

  select count(*) into v_earned_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = true;

  select count(*) into v_earned_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = true;

  v_total_earned := (v_earned_withdrawal * 250) + (v_earned_repayment * 250);

  return json_build_object(
    'total_referrals', v_total_referrals,
    'pending_withdrawal', v_pending_withdrawal,
    'pending_repayment', v_pending_repayment,
    'earned_withdrawal', v_earned_withdrawal,
    'earned_repayment', v_earned_repayment,
    'total_earned', v_total_earned
  );
end;
$$;

grant execute on function public.me2u_get_referral_stats(uuid) to authenticated;

-- ─── 8. Function: Get Referral Details with Progress ───

create or replace function public.me2u_get_referral_details(p_user_id uuid)
returns table(
  referee_id uuid,
  referee_name text,
  referee_email text,
  referee_trust_score integer,
  referee_kyc_verified boolean,
  signed_up_at timestamptz,
  first_withdrawal_rewarded boolean,
  first_repayment_rewarded boolean,
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
    r.first_withdrawal_rewarded,
    r.first_repayment_rewarded,
    case
      when not r.first_withdrawal_rewarded and not r.first_repayment_rewarded then '₦500 pending (2 steps)'
      when not r.first_withdrawal_rewarded and r.first_repayment_rewarded then '₦250 pending (withdrawal)'
      when r.first_withdrawal_rewarded and not r.first_repayment_rewarded then '₦250 pending (repayment)'
      else '₦500 earned'
    end as pending_rewards
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id
  order by r.created_at desc;
end;
$$;

grant execute on function public.me2u_get_referral_details(uuid) to authenticated;

-- ─── 9. Replica Identity for Realtime ───

do $$
begin
  alter table public.referrals replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.referrals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
