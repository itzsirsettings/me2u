-- ═══════════════════════════════════════════════════════════════════════════════
-- GAMIFICATION & SOCIAL PROOF SYSTEM
-- Features: Badges, Achievements, Platform Stats, Success Stories, Circle Rewards
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. BADGES & ACHIEVEMENTS ───

create type public.badge_type as enum (
  'trust_builder',
  'early_adopter',
  'community_lender',
  'responsible_borrower',
  'circle_champion',
  'referral_master',
  'financial_literacy',
  'milestone_5k',
  'milestone_50k',
  'milestone_100k',
  'perfect_record',
  'speed_repayer',
  'super_saver'
);

create type public.achievement_category as enum (
  'trust',
  'lending',
  'borrowing',
  'circles',
  'referrals',
  'education',
  'milestones',
  'repayment'
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  badge_type public.badge_type not null unique,
  name text not null,
  description text not null,
  category public.achievement_category not null,
  icon text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  requirement jsonb not null default '{}'::jsonb,
  reward_amount numeric(14, 2) not null default 0 check (reward_amount >= 0),
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_type public.badge_type not null references public.badges(badge_type) on delete cascade,
  earned_at timestamptz not null default now(),
  notified boolean not null default false,
  unique (user_id, badge_type)
);

create index user_badges_user_earned_idx on public.user_badges(user_id, earned_at desc);
create index user_badges_badge_type_idx on public.user_badges(badge_type);

-- ─── 2. PLATFORM STATISTICS (For Social Proof) ───

create table public.platform_stats (
  stat_key text primary key,
  stat_value numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Initialize platform stats
insert into public.platform_stats (stat_key, stat_value) values
  ('total_borrowed', 0),
  ('total_repaid', 0),
  ('active_circles', 0),
  ('total_users', 0),
  ('successful_loans', 0),
  ('total_lent', 0),
  ('active_loans', 0),
  ('trust_score_avg', 85)
on conflict (stat_key) do nothing;

-- ─── 3. SUCCESS STORIES ───

create table public.success_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  story text not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (category in ('education', 'business', 'emergency', 'family', 'other')),
  is_featured boolean not null default false,
  is_public boolean not null default false,
  display_name text not null,
  created_at timestamptz not null default now(),
  featured_at timestamptz
);

create index success_stories_featured_idx on public.success_stories(is_featured, featured_at desc)
  where is_featured = true and is_public = true;
create index success_stories_public_idx on public.success_stories(is_public, created_at desc)
  where is_public = true;

-- ─── 4. CIRCLE PERFORMANCE & REWARDS ───

create table public.circle_performance (
  circle_id uuid primary key references public.circles(id) on delete cascade,
  total_loans_issued integer not null default 0,
  total_loans_repaid integer not null default 0,
  on_time_repayment_rate numeric(5, 2) not null default 100.00 check (on_time_repayment_rate between 0 and 100),
  total_volume numeric(14, 2) not null default 0 check (total_volume >= 0),
  member_count integer not null default 0,
  performance_score integer not null default 0 check (performance_score between 0 and 100),
  last_calculated timestamptz not null default now()
);

create table public.circle_rewards (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  reward_type text not null check (reward_type in ('perfect_month', 'milestone_volume', 'member_growth', 'perfect_quarter')),
  reward_per_member numeric(14, 2) not null check (reward_per_member > 0),
  total_amount numeric(14, 2) not null check (total_amount > 0),
  disbursed boolean not null default false,
  earned_at timestamptz not null default now(),
  disbursed_at timestamptz
);

create index circle_rewards_circle_disbursed_idx on public.circle_rewards(circle_id, disbursed, earned_at desc);

-- ─── 5. TRUST SCORE MILESTONES ───

create table public.trust_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_score integer not null check (milestone_score in (50, 60, 70, 80, 85, 90, 95, 100)),
  reached_at timestamptz not null default now(),
  celebrated boolean not null default false,
  unique (user_id, milestone_score)
);

create index trust_milestones_user_idx on public.trust_milestones(user_id, milestone_score desc);

-- ─── 6. FRIEND DISCOVERY & NETWORK EFFECTS ───

create table public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_hash text not null,
  contact_name text,
  matched_user_id uuid references public.profiles(id) on delete set null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, phone_hash)
);

create index user_contacts_user_idx on public.user_contacts(user_id);
create index user_contacts_phone_hash_idx on public.user_contacts(phone_hash)
  where matched_user_id is null;
create index user_contacts_matched_idx on public.user_contacts(matched_user_id)
  where matched_user_id is not null;

-- ─── 7. FINANCIAL EDUCATION CONTENT ───

create table public.education_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  category text not null check (category in ('borrowing', 'saving', 'trust_score', 'security', 'circles', 'general')),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes integer not null default 5 check (estimated_minutes > 0),
  order_index integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index education_content_category_order_idx on public.education_content(category, order_index);
create index education_content_featured_idx on public.education_content(is_featured)
  where is_featured = true;

-- ─── 8. RLS POLICIES ───

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.platform_stats enable row level security;
alter table public.success_stories enable row level security;
alter table public.circle_performance enable row level security;
alter table public.circle_rewards enable row level security;
alter table public.trust_milestones enable row level security;
alter table public.user_contacts enable row level security;
alter table public.education_content enable row level security;

-- Badges (public read, system write)
drop policy if exists "Anyone can read badges" on public.badges;
create policy "Anyone can read badges"
  on public.badges for select
  to anon, authenticated
  using (true);

-- User badges (own badges readable)
drop policy if exists "Users can read own badges" on public.user_badges;
create policy "Users can read own badges"
  on public.user_badges for select
  to authenticated
  using (user_id = auth.uid());

-- Platform stats (public read)
drop policy if exists "Anyone can read platform stats" on public.platform_stats;
create policy "Anyone can read platform stats"
  on public.platform_stats for select
  to anon, authenticated
  using (true);

-- Success stories (public read for public stories)
drop policy if exists "Anyone can read public success stories" on public.success_stories;
create policy "Anyone can read public success stories"
  on public.success_stories for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Users can create own success stories" on public.success_stories;
create policy "Users can create own success stories"
  on public.success_stories for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own success stories" on public.success_stories;
create policy "Users can update own success stories"
  on public.success_stories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Circle performance (readable by all authenticated)
drop policy if exists "Authenticated users can read circle performance" on public.circle_performance;
create policy "Authenticated users can read circle performance"
  on public.circle_performance for select
  to authenticated
  using (true);

-- Circle rewards (readable by circle members)
drop policy if exists "Circle members can read rewards" on public.circle_rewards;
create policy "Circle members can read rewards"
  on public.circle_rewards for select
  to authenticated
  using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_rewards.circle_id
        and cm.user_id = auth.uid()
    )
  );

-- Trust milestones (own milestones only)
drop policy if exists "Users can read own trust milestones" on public.trust_milestones;
create policy "Users can read own trust milestones"
  on public.trust_milestones for select
  to authenticated
  using (user_id = auth.uid());

-- User contacts (own contacts only)
drop policy if exists "Users can manage own contacts" on public.user_contacts;
create policy "Users can manage own contacts"
  on public.user_contacts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Education content (public read)
drop policy if exists "Anyone can read education content" on public.education_content;
create policy "Anyone can read education content"
  on public.education_content for select
  to anon, authenticated
  using (true);

-- ─── 9. GRANTS ───

grant select on public.badges to anon, authenticated;
grant select on public.user_badges to authenticated;
grant select on public.platform_stats to anon, authenticated;
grant select, insert, update on public.success_stories to authenticated;
grant select on public.circle_performance to authenticated;
grant select on public.circle_rewards to authenticated;
grant select on public.trust_milestones to authenticated;
grant select, insert, update, delete on public.user_contacts to authenticated;
grant select on public.education_content to authenticated;

-- ─── 10. SEED BADGES ───

insert into public.badges (badge_type, name, description, category, icon, rarity, requirement, reward_amount) values
  ('trust_builder', 'Trust Builder', 'Reached 90+ trust score', 'trust', '🏆', 'epic', '{"min_trust_score": 90}', 500),
  ('early_adopter', 'Early Adopter', 'Joined within first 1000 users', 'milestones', '🌟', 'legendary', '{"max_user_number": 1000}', 1000),
  ('community_lender', 'Community Lender', 'Lent to 5+ different people', 'lending', '🤝', 'rare', '{"unique_loans_lent": 5}', 300),
  ('responsible_borrower', 'Responsible Borrower', 'Repaid 5 loans on time', 'borrowing', '✅', 'rare', '{"on_time_repayments": 5}', 300),
  ('circle_champion', 'Circle Champion', 'Created a circle with 10+ members', 'circles', '👥', 'epic', '{"circle_members": 10}', 500),
  ('referral_master', 'Referral Master', 'Referred 10+ verified users', 'referrals', '📣', 'epic', '{"verified_referrals": 10}', 500),
  ('financial_literacy', 'Financial Literacy', 'Completed all education modules', 'education', '📚', 'rare', '{"completed_modules": "all"}', 200),
  ('milestone_5k', '5K Club', 'Total borrowed/lent: ₦5,000+', 'milestones', '💰', 'common', '{"total_volume": 5000}', 100),
  ('milestone_50k', '50K Club', 'Total borrowed/lent: ₦50,000+', 'milestones', '💎', 'rare', '{"total_volume": 50000}', 500),
  ('milestone_100k', '100K Club', 'Total borrowed/lent: ₦100,000+', 'milestones', '👑', 'legendary', '{"total_volume": 100000}', 2000),
  ('perfect_record', 'Perfect Record', '100% on-time repayment history', 'repayment', '⭐', 'legendary', '{"perfect_repayment": true}', 1000),
  ('speed_repayer', 'Speed Repayer', 'Repaid a loan within 24 hours', 'repayment', '⚡', 'rare', '{"repaid_within_hours": 24}', 250),
  ('super_saver', 'Super Saver', 'Saved ₦50,000+ in savings goals', 'milestones', '🎯', 'epic', '{"total_savings": 50000}', 500)
on conflict (badge_type) do nothing;

-- ─── 11. SEED EDUCATION CONTENT ───

insert into public.education_content (slug, title, summary, content, category, difficulty, estimated_minutes, order_index, is_featured) values
  ('understanding-trust-scores', 'Understanding Trust Scores', 'Learn how your trust score is calculated and how to improve it', 
   E'# Understanding Trust Scores\n\nYour trust score determines your borrowing limits, loan duration, and security deposit requirements. Here''s how it works:\n\n## What Affects Your Trust Score\n\n1. **KYC Verification** (+18 points)\n2. **Completed Loans** (+18 points for first, +12 for 3+)\n3. **Wallet Activity** (+12 points for 5+ transactions)\n4. **Referrals** (+10 points for 5+ verified referrals)\n5. **Account Age** (+8 points for 90+ days)\n6. **Verified Contacts** (+7 points for email, phone, KYC)\n\n## How to Improve Your Score\n\n- Complete your KYC verification\n- Repay loans on time\n- Maintain regular wallet activity\n- Refer friends who use the platform\n- Build a long-term relationship with Me2U\n\nYour trust score updates automatically after each action!',
   'trust_score', 'beginner', 5, 1, true),
  
  ('borrowing-responsibly', 'Borrowing Responsibly', 'Best practices for taking and repaying loans',
   E'# Borrowing Responsibly\n\n## Before You Borrow\n\n1. **Assess Your Need**: Only borrow what you actually need\n2. **Plan Repayment**: Ensure you can repay before the due date\n3. **Check Your Trust Score**: Higher scores unlock better terms\n4. **Understand the Terms**: 0% interest, but on-time repayment matters\n\n## Repayment Tips\n\n- Set reminders before your due date\n- Repay early if possible to boost your trust score\n- Maintain wallet balance for smooth repayment\n- Communicate with lenders if issues arise\n\n## Benefits of Good Repayment\n\n- Higher trust score\n- Access to larger loans\n- Longer loan durations\n- Lower security deposits\n- Community reputation',
   'borrowing', 'beginner', 7, 2, true),
  
  ('building-wealth-circles', 'Building Wealth with Circles', 'Maximize the power of group lending',
   E'# Building Wealth with Circles\n\nCircles are modern cooperatives that pool resources for mutual benefit.\n\n## Creating a Strong Circle\n\n1. **Invite Trusted Members**: Quality over quantity\n2. **Set Clear Rules**: Agree on contribution amounts and terms\n3. **Regular Activity**: Consistent contributions build momentum\n4. **Celebrate Milestones**: Recognize achievements together\n\n## Circle Benefits\n\n- Access to larger pool of funds\n- Lower personal risk\n- Community support\n- Group rewards for perfect repayment\n- Shared financial goals\n\n## Circle Rewards\n\n- **Perfect Month**: ₦100 per member for 100% on-time repayments\n- **Volume Milestones**: Bonuses at ₦100K, ₦500K, ₦1M\n- **Member Growth**: ₦50 per member at 10, 25, 50 members\n\nBuild your financial future together!',
   'circles', 'intermediate', 8, 3, true),
  
  ('maximizing-referrals', 'Maximizing Referral Rewards', 'Earn wallet credit by growing the community',
   E'# Maximizing Referral Rewards\n\n## How Referrals Work\n\nYou earn ₦250 for each milestone your referee reaches:\n\n1. **First Withdrawal**: ₦250 when they make their first successful withdrawal\n2. **First Repayment**: ₦250 when they complete their first loan repayment\n\n**Total: ₦500 per active referral**\n\n## Best Referral Practices\n\n1. **Target Active Users**: Refer people who need financial services\n2. **Explain the Benefits**: Help them understand 0% interest loans\n3. **Support Their Journey**: Guide them through KYC and first loan\n4. **Leverage Networks**: Family, friends, colleagues, communities\n\n## Referral Milestones\n\n- 5 referrals: ₦2,500 potential\n- 10 referrals: ₦5,000 + Referral Master badge\n- 25 referrals: ₦12,500 potential\n- 50+ referrals: Elite referrer status\n\n## Tips for Success\n\n- Share your referral code on social media\n- Tell your success story\n- Join community groups\n- Host financial literacy sessions\n\nGrow Me2U, grow your wallet!',
   'referrals', 'intermediate', 6, 4, false),
  
  ('security-best-practices', 'Security Best Practices', 'Protect your account and funds',
   E'# Security Best Practices\n\n## Account Security\n\n1. **Strong Password**: Mix letters, numbers, symbols\n2. **Transaction PIN**: Never share with anyone\n3. **Trusted Device**: Monitor login sessions\n4. **Regular Reviews**: Check transactions weekly\n\n## Red Flags to Watch\n\n- Unsolicited withdrawal requests\n- Requests to share your PIN\n- Suspicious transaction notifications\n- Unusual login locations\n\n## What Me2U Will Never Do\n\n- Ask for your password via email/SMS\n- Request your transaction PIN\n- Pressure you to make urgent transfers\n- Contact you from unofficial numbers\n\n## If Something Looks Wrong\n\n1. Freeze your wallet immediately\n2. Contact support through official channels\n3. Review recent transactions\n4. Change your password\n5. Reset your transaction PIN\n\nYour security is our priority!',
   'security', 'beginner', 5, 5, false)
on conflict (slug) do nothing;

-- ─── 12. FUNCTIONS ───

-- Update platform stats (called by triggers)
create or replace function private.me2u_update_platform_stats()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_borrowed numeric;
  v_total_repaid numeric;
  v_successful_loans integer;
  v_active_loans integer;
  v_total_lent numeric;
  v_active_circles integer;
  v_total_users integer;
  v_avg_trust numeric;
begin
  -- Total borrowed (all disbursed loans)
  select coalesce(sum(amount), 0) into v_total_borrowed
  from public.loans;
  
  -- Total repaid (completed loans)
  select coalesce(sum(amount), 0) into v_total_repaid
  from public.loans where status = 'completed';
  
  -- Successful loans count
  select count(*) into v_successful_loans
  from public.loans where status = 'completed';
  
  -- Active loans count
  select count(*) into v_active_loans
  from public.loans where status = 'active';
  
  -- Total lent (same as borrowed)
  v_total_lent := v_total_borrowed;
  
  -- Active circles
  select count(*) into v_active_circles
  from public.circles;
  
  -- Total users
  select count(*) into v_total_users
  from public.profiles;
  
  -- Average trust score
  select coalesce(avg(trust_score), 85) into v_avg_trust
  from public.profiles where kyc_verified = true;
  
  -- Update stats
  update public.platform_stats set stat_value = v_total_borrowed, updated_at = now() where stat_key = 'total_borrowed';
  update public.platform_stats set stat_value = v_total_repaid, updated_at = now() where stat_key = 'total_repaid';
  update public.platform_stats set stat_value = v_successful_loans, updated_at = now() where stat_key = 'successful_loans';
  update public.platform_stats set stat_value = v_active_loans, updated_at = now() where stat_key = 'active_loans';
  update public.platform_stats set stat_value = v_total_lent, updated_at = now() where stat_key = 'total_lent';
  update public.platform_stats set stat_value = v_active_circles, updated_at = now() where stat_key = 'active_circles';
  update public.platform_stats set stat_value = v_total_users, updated_at = now() where stat_key = 'total_users';
  update public.platform_stats set stat_value = round(v_avg_trust, 0), updated_at = now() where stat_key = 'trust_score_avg';
end;
$$;

-- Award badge to user
create or replace function private.me2u_award_badge(
  p_user_id uuid,
  p_badge_type public.badge_type
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_badge_id uuid;
  v_reward numeric;
  v_name text;
  v_already_has boolean;
begin
  -- Check if user already has this badge
  select exists(
    select 1 from public.user_badges
    where user_id = p_user_id and badge_type = p_badge_type
  ) into v_already_has;
  
  if v_already_has then
    return false;
  end if;
  
  -- Get badge details
  select reward_amount, name into v_reward, v_name
  from public.badges
  where badge_type = p_badge_type;
  
  if not found then
    return false;
  end if;
  
  -- Award badge
  insert into public.user_badges (user_id, badge_type)
  values (p_user_id, p_badge_type)
  on conflict (user_id, badge_type) do nothing;
  
  -- Award wallet credit if any
  if v_reward > 0 then
    update public.wallets
    set balance = balance + v_reward
    where user_id = p_user_id;
    
    insert into public.transactions (user_id, type, amount, description)
    values (p_user_id, 'deposit', v_reward, 'Badge reward: ' || v_name);
  end if;
  
  -- Notify user
  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    '🎉 Badge Unlocked!',
    'You earned the "' || v_name || '" badge' || 
    case when v_reward > 0 then ' and ₦' || v_reward || ' wallet credit!' else '!' end
  );
  
  return true;
end;
$$;

-- Check and award badges for a user
create or replace function private.me2u_check_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile record;
  v_loans_completed integer;
  v_loans_lent integer;
  v_total_volume numeric;
  v_total_savings numeric;
  v_verified_referrals integer;
  v_circle_members integer;
  v_education_completed integer;
  v_on_time_repayments integer;
  v_total_repayments integer;
  v_has_speed_repayment boolean;
begin
  -- Get profile
  select * into v_profile
  from public.profiles where id = p_user_id;
  
  if not found then
    return;
  end if;
  
  -- Gather stats
  select count(*) into v_loans_completed
  from public.loans where borrower_id = p_user_id and status = 'completed';
  
  select count(distinct borrower_id) into v_loans_lent
  from public.loans where lender_id = p_user_id and status = 'completed';
  
  select coalesce(sum(amount), 0) into v_total_volume
  from public.loans where borrower_id = p_user_id or lender_id = p_user_id;
  
  select coalesce(sum(current_amount), 0) into v_total_savings
  from public.savings_goals where user_id = p_user_id;
  
  select count(*) into v_verified_referrals
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id and p.kyc_verified = true;
  
  select max(member_count) into v_circle_members
  from public.circles c
  join public.circle_performance cp on cp.circle_id = c.id
  where c.creator_id = p_user_id;
  
  select count(distinct lesson_key) into v_education_completed
  from public.learning_progress where user_id = p_user_id;
  
  -- Check for speed repayment (loan completed within 24h of start)
  select exists(
    select 1 from public.loans
    where borrower_id = p_user_id
      and status = 'completed'
      and created_at >= (select max(created_at) from public.loans where borrower_id = p_user_id and status = 'completed')
      and extract(epoch from (
        (select max(updated_at) from public.transactions
         where user_id = p_user_id and type = 'loan_repayment'
         and description like '%' || id::text || '%')
        - start_date
      )) <= 86400
  ) into v_has_speed_repayment;
  
  -- Award badges based on criteria
  if v_profile.trust_score >= 90 then
    perform private.me2u_award_badge(p_user_id, 'trust_builder');
  end if;
  
  if v_loans_lent >= 5 then
    perform private.me2u_award_badge(p_user_id, 'community_lender');
  end if;
  
  if v_loans_completed >= 5 then
    perform private.me2u_award_badge(p_user_id, 'responsible_borrower');
  end if;
  
  if v_circle_members >= 10 then
    perform private.me2u_award_badge(p_user_id, 'circle_champion');
  end if;
  
  if v_verified_referrals >= 10 then
    perform private.me2u_award_badge(p_user_id, 'referral_master');
  end if;
  
  if v_total_volume >= 100000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_100k');
  elsif v_total_volume >= 50000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_50k');
  elsif v_total_volume >= 5000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_5k');
  end if;
  
  if v_total_savings >= 50000 then
    perform private.me2u_award_badge(p_user_id, 'super_saver');
  end if;
  
  if v_has_speed_repayment then
    perform private.me2u_award_badge(p_user_id, 'speed_repayer');
  end if;
  
  -- Check perfect record
  select count(*) into v_total_repayments
  from public.loans where borrower_id = p_user_id and status = 'completed';
  
  if v_total_repayments >= 5 then
    select count(*) into v_on_time_repayments
    from public.loans 
    where borrower_id = p_user_id 
      and status = 'completed'
      and updated_at <= due_date;
    
    if v_on_time_repayments = v_total_repayments then
      perform private.me2u_award_badge(p_user_id, 'perfect_record');
    end if;
  end if;
end;
$$;

-- Record trust milestone
create or replace function private.me2u_record_trust_milestone(
  p_user_id uuid,
  p_new_score integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_milestone integer;
  v_milestones integer[] := array[50, 60, 70, 80, 85, 90, 95, 100];
begin
  foreach v_milestone in array v_milestones loop
    if p_new_score >= v_milestone then
      insert into public.trust_milestones (user_id, milestone_score)
      values (p_user_id, v_milestone)
      on conflict (user_id, milestone_score) do nothing;
      
      -- Notify on major milestones
      if v_milestone in (70, 80, 90, 100) and not exists(
        select 1 from public.trust_milestones
        where user_id = p_user_id and milestone_score = v_milestone and celebrated = true
      ) then
        insert into public.notifications (user_id, title, message)
        values (
          p_user_id,
          '🎊 Trust Score Milestone!',
          'Congratulations! You reached a trust score of ' || v_milestone || '!'
        );
        
        update public.trust_milestones
        set celebrated = true
        where user_id = p_user_id and milestone_score = v_milestone;
      end if;
    end if;
  end loop;
end;
$$;

-- Trigger to update platform stats after loan changes
create or replace function private.me2u_trigger_platform_stats()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.me2u_update_platform_stats();
  return new;
end;
$$;

drop trigger if exists loans_update_platform_stats on public.loans;
create trigger loans_update_platform_stats
  after insert or update or delete on public.loans
  for each statement
  execute function private.me2u_trigger_platform_stats();

drop trigger if exists circles_update_platform_stats on public.circles;
create trigger circles_update_platform_stats
  after insert or delete on public.circles
  for each statement
  execute function private.me2u_trigger_platform_stats();

drop trigger if exists profiles_update_platform_stats on public.profiles;
create trigger profiles_update_platform_stats
  after insert on public.profiles
  for each statement
  execute function private.me2u_trigger_platform_stats();

-- Trigger to check badges after relevant actions
create or replace function private.me2u_trigger_badge_check()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'loans' then
    perform private.me2u_check_user_badges(new.borrower_id);
    if new.lender_id is not null then
      perform private.me2u_check_user_badges(new.lender_id);
    end if;
  elsif tg_table_name = 'profiles' then
    if new.trust_score <> coalesce(old.trust_score, 85) then
      perform private.me2u_record_trust_milestone(new.id, new.trust_score);
      perform private.me2u_check_user_badges(new.id);
    end if;
  elsif tg_table_name = 'referrals' then
    perform private.me2u_check_user_badges(new.referrer_id);
  elsif tg_table_name = 'savings_goals' then
    perform private.me2u_check_user_badges(new.user_id);
  end if;
  
  return new;
end;
$$;

drop trigger if exists loans_check_badges on public.loans;
create trigger loans_check_badges
  after insert or update on public.loans
  for each row
  execute function private.me2u_trigger_badge_check();

drop trigger if exists profiles_check_badges on public.profiles;
create trigger profiles_check_badges
  after update of trust_score on public.profiles
  for each row
  execute function private.me2u_trigger_badge_check();

drop trigger if exists referrals_check_badges on public.referrals;
create trigger referrals_check_badges
  after insert on public.referrals
  for each row
  execute function private.me2u_trigger_badge_check();

drop trigger if exists savings_goals_check_badges on public.savings_goals;
create trigger savings_goals_check_badges
  after insert or update of current_amount on public.savings_goals
  for each row
  execute function private.me2u_trigger_badge_check();

-- Initialize platform stats
select private.me2u_update_platform_stats();

-- ─── 13. REPLICA IDENTITY FOR REALTIME ───

do $$
begin
  alter table public.badges replica identity full;
  alter table public.user_badges replica identity full;
  alter table public.platform_stats replica identity full;
  alter table public.success_stories replica identity full;
  alter table public.circle_performance replica identity full;
  alter table public.circle_rewards replica identity full;
  alter table public.trust_milestones replica identity full;
  alter table public.user_contacts replica identity full;
  alter table public.education_content replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.user_badges;
  alter publication supabase_realtime add table public.platform_stats;
  alter publication supabase_realtime add table public.trust_milestones;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on table public.badges is 'Defines available badges users can earn';
comment on table public.user_badges is 'Tracks badges earned by each user';
comment on table public.platform_stats is 'Real-time platform statistics for social proof';
comment on table public.success_stories is 'User success stories for testimonials';
comment on table public.circle_performance is 'Performance metrics for lending circles';
comment on table public.circle_rewards is 'Rewards earned by circles for achievements';
comment on table public.trust_milestones is 'Trust score milestones reached by users';
comment on table public.user_contacts is 'Hashed phone contacts for friend discovery';
comment on table public.education_content is 'Financial education articles and guides';
