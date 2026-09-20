-- RAILWAY MIGRATION 015 · Referral reward consolidation
--
-- Makes the referral payout chain idempotent, resilient, and self-consistent:
--   signup:              referrer +1,500 · referee +500 · upline +500
--   first withdrawal:    referrer +250 (+ verified count, unlock@10, weekly challenge, milestones)
--   first repayment:     referrer +250
-- Every payout is recorded in referral_reward_events (idempotency boundary) and in
-- transactions with type 'affiliate_reward'. Milestones pay at 10 / 25 / 50 / 100.
--
-- Consolidates the 006-era withdrawal trigger (referral_withdrawal_reward_trigger)
-- into the lifecycle trigger, restores the unlock/other side-effects it used to carry,
-- stabilizes payout functions so a missing wallet can never break registration or
-- repayment/withdrawal flows, and back-fills legacy affiliate_rewards for account-context.
--
-- Fully idempotent: safe to run on a DB that already has 001-014 (either following
-- 006 or following the canonical lifecycle track), and on a fresh from-scratch DB.

-- ─────────────────────────────────────────────
-- 1. Legacy affiliate_rewards (account-context queries it)
-- ─────────────────────────────────────────────
create table if not exists public.affiliate_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_rewards_referrer_idx
  on public.affiliate_rewards(referrer_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2. Reward events (idempotency boundary) + signup_rewarded
-- ─────────────────────────────────────────────
create table if not exists public.referral_reward_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  source_user_id uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null check (reward_type in ('direct_signup', 'new_member_signup', 'first_withdrawal', 'first_repayment', 'indirect_signup')),
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (recipient_id, source_user_id, reward_type)
);
create index if not exists referral_reward_events_recipient_idx
  on public.referral_reward_events(recipient_id, created_at desc);

alter table public.referrals add column if not exists signup_rewarded boolean not null default false;

-- ─────────────────────────────────────────────
-- 3. Hardened credit function (never raises on a missing wallet)
-- ─────────────────────────────────────────────
create or replace function private.me2u_credit_referral_reward(p_recipient_id uuid, p_source_user_id uuid, p_reward_type text, p_amount numeric, p_description text, p_notification_title text, p_notification_message text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_event_id uuid;
begin
  insert into public.referral_reward_events (recipient_id, source_user_id, reward_type, amount)
  values (p_recipient_id, p_source_user_id, p_reward_type, p_amount)
  on conflict (recipient_id, source_user_id, reward_type) do nothing
  returning id into v_event_id;
  if v_event_id is null then
    return false;
  end if;
  update public.wallets set balance = balance + p_amount, updated_at = now() where user_id = p_recipient_id;
  if not found then
    -- a missing wallet must never break registration or withdrawal/repayment flows
    delete from public.referral_reward_events where id = v_event_id;
    insert into public.notifications (user_id, title, message, is_read, created_at)
    values (p_recipient_id, p_notification_title, p_notification_message || ' (reward pending: wallet not ready — contact support.)', false, now());
    return false;
  end if;
  insert into public.transactions (user_id, type, amount, description, created_at)
  values (p_recipient_id, 'affiliate_reward', p_amount, p_description, now());
  insert into public.notifications (user_id, title, message, is_read, created_at)
  values (p_recipient_id, p_notification_title, p_notification_message, false, now());
  return true;
end;
$$;

-- ─────────────────────────────────────────────
-- 4. Signup reward trigger (consolidated; drops 006-era duplicate)
-- ─────────────────────────────────────────────
drop trigger if exists referral_signup_bonus_trigger on public.referrals;
create or replace function private.me2u_handle_referral_signup_reward()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_upline_id uuid;
begin
  perform private.me2u_credit_referral_reward(NEW.referrer_id, NEW.referee_id, 'direct_signup', 1500, 'Referral reward — direct referral signed up', 'Referral signup reward earned!', 'You earned NGN 1,500 because your referral signed up.');
  perform private.me2u_credit_referral_reward(NEW.referee_id, NEW.referee_id, 'new_member_signup', 500, 'Referral welcome reward', 'Welcome reward added!', 'You earned NGN 500 for joining with a referral.');
  update public.referrals set signup_rewarded = true where id = NEW.id;
  select referrer_id into v_upline_id from public.referrals where referee_id = NEW.referrer_id order by created_at asc limit 1;
  if v_upline_id is not null then
    perform private.me2u_credit_referral_reward(v_upline_id, NEW.referee_id, 'indirect_signup', 500, 'Referral reward — referral brought in a new member', 'Network referral reward earned!', 'You earned NGN 500 because your referral referred a friend.');
  end if;
  return NEW;
end;
$$;
drop trigger if exists referral_signup_reward_trigger on public.referrals;
create trigger referral_signup_reward_trigger
  after insert on public.referrals
  for each row execute function private.me2u_handle_referral_signup_reward();

-- ─────────────────────────────────────────────
-- 5. Weekly challenge + milestone checkers (ported from 006; normalised tx type)
-- ─────────────────────────────────────────────
create or replace function private.me2u_check_weekly_challenge(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_weekly_count integer;
  v_challenge_reward numeric := 4500;
  v_existing_challenge uuid;
begin
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days';

  select count(*) into v_weekly_count
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = true
    and created_at >= v_week_start
    and created_at < v_week_end;

  select id into v_existing_challenge
  from public.referral_challenges
  where user_id = p_user_id
    and week_start = v_week_start
    and challenge_type = 'weekly_3_refs'
  limit 1;

  if v_existing_challenge is null and v_weekly_count >= 1 then
    insert into public.referral_challenges
      (user_id, challenge_type, target_count, current_count, reward_amount, week_start, week_end)
    values
      (p_user_id, 'weekly_3_refs', 3, v_weekly_count, v_challenge_reward, v_week_start, v_week_end);
  elsif v_existing_challenge is not null then
    update public.referral_challenges
    set current_count = v_weekly_count,
        completed = (v_weekly_count >= 3),
        completed_at = case when v_weekly_count >= 3 and not completed then now() else completed_at end
    where id = v_existing_challenge;
  end if;

  if v_weekly_count = 3 then
    update public.referral_challenges
    set reward_paid = true
    where id = v_existing_challenge
      and completed = true
      and reward_paid = false;

    if found then
      update public.wallets
      set balance = balance + v_challenge_reward
      where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'affiliate_reward', v_challenge_reward, 'Weekly challenge reward - 3 verified referrals this week');

      insert into public.notifications (user_id, title, message)
      values (
        p_user_id,
        'Weekly Challenge Complete!',
        'You referred 3 verified users this week and earned NGN 4,500 bonus!'
      );
    end if;
  end if;
end;
$$;

create or replace function private.me2u_check_milestones(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_verified_count integer;
  v_milestone_exists boolean;
  v_type text;
  v_count integer;
  v_reward numeric;
  v_desc text;
  v_title text;
  v_msg text;
begin
  select verified_referral_count into v_verified_count
  from public.profiles where id = p_user_id;
  if v_verified_count is null then return; end if;

  for v_type, v_count, v_reward, v_desc, v_title, v_msg in
    select * from (values
      ('10_refs', 10, 10000, 'Milestone reward - 10 verified referrals', 'Milestone Unlocked!', 'You reached 10 verified referrals! You earned NGN 10,000 bonus + badge!'),
      ('25_refs', 25, 25000, 'Milestone reward - 25 verified referrals', 'Legendary Achievement!', 'You reached 25 verified referrals! You earned NGN 25,000 bonus!'),
      ('50_refs', 50, 50000, 'Milestone reward - 50 verified referrals', 'Diamond Achievement!', 'You reached 50 verified referrals! You earned NGN 50,000 bonus!'),
      ('100_refs', 100, 100000, 'Milestone reward - 100 verified referrals', 'Legend Achievement!', 'You reached 100 verified referrals! You earned NGN 100,000 bonus!')
    ) as t(v_type, v_count, v_reward, v_desc, v_title, v_msg)
  loop
    if v_verified_count < v_count then continue; end if;
    select exists (
      select 1 from public.referral_milestones
      where user_id = p_user_id and milestone_type = v_type
    ) into v_milestone_exists;
    if not v_milestone_exists then
      insert into public.referral_milestones
        (user_id, milestone_type, referral_count, reward_amount, badge_awarded, reward_paid)
      values
        (p_user_id, v_type, v_count, v_reward, 'referral_master', true);

      update public.wallets set balance = balance + v_reward where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'affiliate_reward', v_reward, v_desc);

      perform private.me2u_award_badge(p_user_id, 'referral_master'::public.badge_type);

      insert into public.notifications (user_id, title, message)
      values (p_user_id, v_title, v_msg);
    end if;
  end loop;
end;
$$;

create or replace function private.me2u_trigger_milestone_check()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform private.me2u_check_milestones(new.id);
  return NEW;
end;
$$;

-- ─────────────────────────────────────────────
-- 6. Consolidated withdrawal reward trigger (drops 006 duplicate)
-- ─────────────────────────────────────────────
drop trigger if exists referral_withdrawal_reward_trigger on public.withdrawal_requests;
create or replace function private.me2u_handle_referral_withdrawal_reward()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_referrer_id uuid;
  v_rewarded boolean;
  v_verified_count integer;
begin
  if new.status = 'success' and old.status in ('pending', 'processing') then
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.user_id
      and first_withdrawal_rewarded = false
    order by created_at asc limit 1;

    if v_referrer_id is not null then
      v_rewarded := private.me2u_credit_referral_reward(v_referrer_id, new.user_id, 'first_withdrawal', 250, 'Referral reward — first withdrawal by referral', 'Referral withdrawal reward earned!', 'You earned NGN 250 because your referral completed their first withdrawal.');
      if v_rewarded then
        update public.referrals
        set first_withdrawal_rewarded = true
        where referee_id = new.user_id and referrer_id = v_referrer_id;

        update public.profiles
        set verified_referral_count = verified_referral_count + 1
        where id = v_referrer_id
        returning verified_referral_count into v_verified_count;

        if v_verified_count >= 10 then
          update public.profiles
          set account_unlocked = true
          where id = v_referrer_id and account_unlocked = false;

          if found then
            insert into public.notifications (user_id, title, message)
            values (
              v_referrer_id,
              'Account Unlocked!',
              'You reached 10 verified referrals! Your account is now unlocked and you can withdraw anytime.'
            );
          end if;
        end if;

        perform private.me2u_check_weekly_challenge(v_referrer_id);
        perform private.me2u_check_milestones(v_referrer_id);
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists referral_withdrawal_trigger on public.withdrawal_requests;
create trigger referral_withdrawal_trigger
  after update on public.withdrawal_requests
  for each row execute function private.me2u_handle_referral_withdrawal_reward();

-- ─────────────────────────────────────────────
-- 7. Repayment reward trigger (hardened credit fn)
-- ─────────────────────────────────────────────
drop trigger if exists referral_repayment_reward_trigger on public.loans;
create or replace function private.me2u_handle_referral_repayment_reward()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_referrer_id uuid;
begin
  if new.status = 'completed' and old.status = 'active' then
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.borrower_id
      and first_repayment_rewarded = false
    order by created_at asc limit 1;
    if v_referrer_id is not null and private.me2u_credit_referral_reward(v_referrer_id, new.borrower_id, 'first_repayment', 250, 'Referral reward — first loan repayment by referral', 'Referral repayment reward earned!', 'You earned NGN 250 because your referral completed their first loan repayment.') then
      update public.referrals
      set first_repayment_rewarded = true
      where referee_id = new.borrower_id and referrer_id = v_referrer_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists referral_repayment_trigger on public.loans;
create trigger referral_repayment_trigger
  after update on public.loans
  for each row execute function private.me2u_handle_referral_repayment_reward();

-- ─────────────────────────────────────────────
-- 8. Milestone trigger on profiles (006 side-effect; idempotent)
-- ─────────────────────────────────────────────
drop trigger if exists profile_milestone_check_trigger on public.profiles;
create trigger profile_milestone_check_trigger
  after update of verified_referral_count on public.profiles
  for each row execute function private.me2u_trigger_milestone_check();