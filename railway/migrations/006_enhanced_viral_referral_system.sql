-- ============================================================
-- Enhanced Viral Referral System
-- Railway-adapted: app_user_id() instead of auth.uid(), no
-- Supabase roles, no grant to service_role. Badge seed uses
-- correct column names matching 005 badges schema.
-- ============================================================

-- ─── 1. Account Unlock Tracking on Profiles ───

alter table public.profiles
  add column if not exists account_unlocked boolean not null default false,
  add column if not exists account_unlock_paid_at timestamptz,
  add column if not exists verified_referral_count integer not null default 0,
  add column if not exists weekly_referral_count integer not null default 0,
  add column if not exists last_referral_week timestamptz;

create index if not exists profiles_account_unlocked_idx on public.profiles(account_unlocked) where account_unlocked = false;
create index if not exists profiles_verified_referral_count_idx on public.profiles(verified_referral_count);

comment on column public.profiles.account_unlocked is 'User can withdraw if true (paid NGN 2000 OR has 10+ verified referrals)';
comment on column public.profiles.verified_referral_count is 'Count of referrals who completed first withdrawal (verified active users)';

-- ─── 2. Account Unlock Payments Table ───

create table if not exists public.account_unlock_payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  amount           numeric not null default 2000,
  payment_reference text not null unique,
  payment_provider text not null default 'paystack',
  status           text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  metadata         jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists account_unlock_payments_user_idx   on public.account_unlock_payments(user_id);
create index if not exists account_unlock_payments_ref_idx    on public.account_unlock_payments(payment_reference);
create index if not exists account_unlock_payments_status_idx on public.account_unlock_payments(status) where status = 'pending';

create trigger account_unlock_payments_set_updated_at
  before update on public.account_unlock_payments
  for each row execute function public.set_updated_at();

alter table public.account_unlock_payments enable row level security;

drop policy if exists "Users can view their own unlock payments" on public.account_unlock_payments;
create policy "Users can view their own unlock payments"
  on public.account_unlock_payments for select
  using (user_id = public.app_user_id());

drop policy if exists "Users can create unlock payment records" on public.account_unlock_payments;
create policy "Users can create unlock payment records"
  on public.account_unlock_payments for insert
  with check (user_id = public.app_user_id());

-- ─── 3. Referral Challenges (Weekly) ───

create table if not exists public.referral_challenges (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  challenge_type text not null check (challenge_type in ('weekly_3_refs', 'monthly_10_refs', 'custom')),
  target_count   integer not null,
  current_count  integer not null default 0,
  reward_amount  numeric not null,
  week_start     timestamptz not null,
  week_end       timestamptz not null,
  completed      boolean not null default false,
  completed_at   timestamptz,
  reward_paid    boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists referral_challenges_user_idx   on public.referral_challenges(user_id);
create index if not exists referral_challenges_week_idx   on public.referral_challenges(week_start, week_end);
create index if not exists referral_challenges_active_idx on public.referral_challenges(user_id, week_start) where completed = false;

alter table public.referral_challenges enable row level security;

drop policy if exists "Users can view their own challenges" on public.referral_challenges;
create policy "Users can view their own challenges"
  on public.referral_challenges for select
  using (user_id = public.app_user_id());

-- ─── 4. Referral Milestones Table ───

create table if not exists public.referral_milestones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  milestone_type text not null check (milestone_type in ('10_refs', '25_refs', '50_refs', '100_refs', 'custom')),
  referral_count integer not null,
  reward_amount  numeric not null,
  badge_awarded  text,
  achieved_at    timestamptz not null default now(),
  reward_paid    boolean not null default false
);

create unique index if not exists referral_milestones_user_type_idx
  on public.referral_milestones(user_id, milestone_type);

alter table public.referral_milestones enable row level security;

drop policy if exists "Users can view their own milestones" on public.referral_milestones;
create policy "Users can view their own milestones"
  on public.referral_milestones for select
  using (user_id = public.app_user_id());

-- ─── 5. Referral Leaderboard (Monthly) ───

create table if not exists public.referral_leaderboard (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  month_start              date not null,
  month_end                date not null,
  referral_count           integer not null default 0,
  verified_referral_count  integer not null default 0,
  rank                     integer,
  prize_amount             numeric,
  prize_paid               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists referral_leaderboard_user_month_idx
  on public.referral_leaderboard(user_id, month_start);
create index if not exists referral_leaderboard_month_rank_idx
  on public.referral_leaderboard(month_start, rank) where rank is not null;

create trigger referral_leaderboard_set_updated_at
  before update on public.referral_leaderboard
  for each row execute function public.set_updated_at();

alter table public.referral_leaderboard enable row level security;

drop policy if exists "Anyone can view leaderboard" on public.referral_leaderboard;
create policy "Anyone can view leaderboard"
  on public.referral_leaderboard for select using (true);

-- ─── 6. Share Templates Usage Tracking ───

create table if not exists public.share_template_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  template_type text not null check (template_type in ('whatsapp', 'sms', 'copy', 'native_share')),
  shared_at     timestamptz not null default now()
);

create index if not exists share_template_usage_user_idx on public.share_template_usage(user_id);
create index if not exists share_template_usage_type_idx on public.share_template_usage(template_type);

alter table public.share_template_usage enable row level security;

drop policy if exists "Users can create their own share tracking" on public.share_template_usage;
create policy "Users can create their own share tracking"
  on public.share_template_usage for insert
  with check (user_id = public.app_user_id());

-- ─── 7. Updated Referral Reward Triggers ───

create or replace function private.me2u_give_signup_bonus_to_referee()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_signup_bonus numeric := 1500;
begin
  update public.wallets
  set balance = balance + v_signup_bonus
  where user_id = new.referee_id;

  insert into public.transactions (user_id, type, amount, description)
  values (new.referee_id, 'deposit', v_signup_bonus, 'Welcome bonus - signed up with referral code');

  insert into public.notifications (user_id, title, message)
  values (
    new.referee_id,
    'Welcome Bonus!',
    'You received NGN 1,500 welcome bonus for joining Me2U with a referral code. Start borrowing today!'
  );

  insert into public.notifications (user_id, title, message)
  values (
    new.referrer_id,
    'New Referral Signed Up!',
    'Someone just joined using your referral code. Help them succeed to earn your rewards!'
  );

  return new;
end;
$$;

drop trigger if exists referral_signup_bonus_trigger on public.referrals;
create trigger referral_signup_bonus_trigger
  after insert on public.referrals
  for each row execute function private.me2u_give_signup_bonus_to_referee();

create or replace function private.me2u_handle_referral_withdrawal_reward()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_referrer_id uuid;
  v_reward numeric := 250;
  v_updated integer;
  v_new_verified_count integer;
begin
  if new.status = 'success' and old.status in ('pending', 'processing') then
    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.user_id
      and first_withdrawal_rewarded = false
    limit 1;

    if v_referrer_id is not null then
      update public.wallets
      set balance = balance + v_reward
      where user_id = v_referrer_id;

      get diagnostics v_updated = row_count;
      if v_updated = 1 then
        update public.referrals
        set first_withdrawal_rewarded = true
        where referee_id = new.user_id and referrer_id = v_referrer_id;

        update public.profiles
        set verified_referral_count = verified_referral_count + 1
        where id = v_referrer_id
        returning verified_referral_count into v_new_verified_count;

        if v_new_verified_count >= 10 then
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

        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward - first withdrawal by referee');

        insert into public.notifications (user_id, title, message)
        values (
          v_referrer_id,
          'Referral Reward Earned!',
          format('You earned NGN 250 wallet credit! %s/%s verified referrals for account unlock.',
            v_new_verified_count, 10)
        );

        perform private.me2u_check_weekly_challenge(v_referrer_id);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists referral_withdrawal_reward_trigger on public.withdrawal_requests;
create trigger referral_withdrawal_reward_trigger
  after update on public.withdrawal_requests
  for each row execute function private.me2u_handle_referral_withdrawal_reward();

-- ─── 8. Weekly Challenge Checker ───

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
      values (p_user_id, 'deposit', v_challenge_reward, 'Weekly challenge reward - 3 verified referrals this week');

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

-- ─── 9. Milestone Checker (10 refs = NGN 10K, 25 refs = NGN 25K) ───

create or replace function private.me2u_check_milestones(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_verified_count integer;
  v_milestone_exists boolean;
begin
  select verified_referral_count into v_verified_count
  from public.profiles where id = p_user_id;

  if v_verified_count >= 10 then
    select exists (
      select 1 from public.referral_milestones
      where user_id = p_user_id and milestone_type = '10_refs'
    ) into v_milestone_exists;

    if not v_milestone_exists then
      insert into public.referral_milestones
        (user_id, milestone_type, referral_count, reward_amount, badge_awarded)
      values
        (p_user_id, '10_refs', 10, 10000, 'referral_master');

      update public.wallets set balance = balance + 10000 where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'deposit', 10000, 'Milestone reward - 10 verified referrals');

      perform private.me2u_award_badge(p_user_id, 'referral_master'::public.badge_type);

      insert into public.notifications (user_id, title, message)
      values (
        p_user_id,
        'Milestone Unlocked!',
        'You reached 10 verified referrals! You earned NGN 10,000 bonus + badge!'
      );
    end if;
  end if;

  if v_verified_count >= 25 then
    select exists (
      select 1 from public.referral_milestones
      where user_id = p_user_id and milestone_type = '25_refs'
    ) into v_milestone_exists;

    if not v_milestone_exists then
      insert into public.referral_milestones
        (user_id, milestone_type, referral_count, reward_amount, badge_awarded)
      values
        (p_user_id, '25_refs', 25, 25000, 'referral_master');

      update public.wallets set balance = balance + 25000 where user_id = p_user_id;

      insert into public.transactions (user_id, type, amount, description)
      values (p_user_id, 'deposit', 25000, 'Milestone reward - 25 verified referrals');

      insert into public.notifications (user_id, title, message)
      values (
        p_user_id,
        'Legendary Achievement!',
        'You reached 25 verified referrals! You earned NGN 25,000 bonus!'
      );
    end if;
  end if;
end;
$$;

create or replace function private.me2u_trigger_milestone_check()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform private.me2u_check_milestones(new.id);
  return new;
end;
$$;

drop trigger if exists profile_milestone_check_trigger on public.profiles;
create trigger profile_milestone_check_trigger
  after update of verified_referral_count on public.profiles
  for each row execute function private.me2u_trigger_milestone_check();

-- ─── 10. Monthly Leaderboard Builder (cron-callable) ───

create or replace function private.me2u_build_monthly_leaderboard()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_month_start date;
  v_month_end date;
  v_rank integer;
  v_prize_structure numeric[] := ARRAY[50000, 30000, 20000, 15000, 10000, 5000, 5000, 5000, 5000, 5000];
begin
  v_month_start := date_trunc('month', now() - interval '1 month')::date;
  v_month_end := date_trunc('month', now())::date;

  insert into public.referral_leaderboard
    (user_id, month_start, month_end, referral_count, verified_referral_count, rank, prize_amount)
  select
    r.referrer_id,
    v_month_start,
    v_month_end,
    count(*) as referral_count,
    count(*) filter (where r.first_withdrawal_rewarded = true) as verified_referral_count,
    row_number() over (order by count(*) filter (where r.first_withdrawal_rewarded = true) desc) as rank,
    case
      when row_number() over (order by count(*) filter (where r.first_withdrawal_rewarded = true) desc) <= 10
      then v_prize_structure[row_number() over (order by count(*) filter (where r.first_withdrawal_rewarded = true) desc)]
      else null
    end as prize_amount
  from public.referrals r
  where r.created_at >= v_month_start and r.created_at < v_month_end
  group by r.referrer_id
  having count(*) filter (where r.first_withdrawal_rewarded = true) > 0
  on conflict (user_id, month_start) do update set
    referral_count = excluded.referral_count,
    verified_referral_count = excluded.verified_referral_count,
    rank = excluded.rank,
    prize_amount = excluded.prize_amount,
    updated_at = now();

  update public.referral_leaderboard rl
  set prize_paid = true
  where rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = false
    and rl.prize_amount > 0;

  update public.wallets w
  set balance = w.balance + rl.prize_amount
  from public.referral_leaderboard rl
  where w.user_id = rl.user_id
    and rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = true
    and not exists (
      select 1 from public.transactions t
      where t.user_id = rl.user_id
        and t.description like 'Monthly leaderboard prize - Rank ' || rl.rank::text || '%'
        and t.created_at >= v_month_start
    );

  insert into public.transactions (user_id, type, amount, description)
  select
    rl.user_id,
    'deposit',
    rl.prize_amount,
    format('Monthly leaderboard prize - Rank %s', rl.rank)
  from public.referral_leaderboard rl
  where rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = true
    and not exists (
      select 1 from public.transactions t
      where t.user_id = rl.user_id
        and t.description like 'Monthly leaderboard prize - Rank ' || rl.rank::text || '%'
        and t.created_at >= v_month_start
    );

  insert into public.notifications (user_id, title, message)
  select
    rl.user_id,
    format('Leaderboard Winner! Rank #%s', rl.rank),
    format('You ranked #%s in last month''s referral leaderboard and won NGN %s!',
      rl.rank, rl.prize_amount::text)
  from public.referral_leaderboard rl
  where rl.month_start = v_month_start
    and rl.rank <= 10
    and rl.prize_paid = true
    and not exists (
      select 1 from public.notifications n
      where n.user_id = rl.user_id
        and n.title like 'Leaderboard Winner! Rank #' || rl.rank::text
        and n.created_at >= v_month_start
    );
end;
$$;

-- ─── 11. Helper Functions ───

create or replace function public.me2u_can_user_withdraw(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_account_unlocked boolean;
  v_verified_count integer;
begin
  select account_unlocked, verified_referral_count
  into v_account_unlocked, v_verified_count
  from public.profiles where id = p_user_id;

  return v_account_unlocked or v_verified_count >= 10;
end;
$$;

create or replace function public.me2u_get_current_week_challenge(p_user_id uuid)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_challenge record;
begin
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days';

  select * into v_challenge
  from public.referral_challenges
  where user_id = p_user_id
    and week_start = v_week_start
    and challenge_type = 'weekly_3_refs'
  limit 1;

  if v_challenge is null then
    return json_build_object(
      'active', false,
      'target', 3,
      'current', 0,
      'reward', 4500,
      'week_end', v_week_end
    );
  else
    return json_build_object(
      'active', true,
      'target', v_challenge.target_count,
      'current', v_challenge.current_count,
      'reward', v_challenge.reward_amount,
      'completed', v_challenge.completed,
      'week_end', v_week_end
    );
  end if;
end;
$$;

comment on table public.referrals is 'Enhanced referral tracking with signup bonuses, challenges, and milestones';
