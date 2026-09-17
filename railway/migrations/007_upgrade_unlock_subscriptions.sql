-- ============================================================
-- 15-Day Unlock + Subscriptions Foundation
-- Railway-adapted: No Supabase references. Uses app_user_id
-- pattern defined in 001. revenue_event_type uses ADD VALUE IF
-- NOT EXISTS (Postgres 9.6+).
-- ============================================================

-- ─── 1. Update profiles for 15-day unlock ───

alter table public.profiles
  add column if not exists unlock_eligible_at timestamptz,
  add column if not exists unlock_method text check (unlock_method in ('time_based', 'referrals', 'payment', 'subscription')),
  add column if not exists unlock_requested_at timestamptz;

update public.profiles
set unlock_eligible_at = created_at + interval '15 days'
where unlock_eligible_at is null;

create index if not exists idx_profiles_unlock_eligible
  on public.profiles(unlock_eligible_at)
  where account_unlocked = false;

comment on column public.profiles.unlock_eligible_at is 'Date when user becomes eligible for time-based unlock (15 days after registration + payment)';
comment on column public.profiles.unlock_method is 'How account was unlocked: time_based (15d+payment), referrals (10+), payment (immediate NGN 2k), subscription (Plus)';
comment on column public.profiles.unlock_requested_at is 'When user clicked unlock button (for conversion tracking)';

-- ─── 2. Subscription plans & entitlements ───

do $$ begin
  create type subscription_plan_type as enum (
    'free',
    'plus_monthly',
    'plus_annual',
    'lender_pro_monthly',
    'lender_pro_volume',
    'circles_pro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'expired'
  );
exception when duplicate_object then null; end $$;

create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  plan                    subscription_plan_type not null default 'free',
  status                  subscription_status not null default 'active',

  amount                  numeric(14,2) not null check (amount >= 0),
  billing_period          text check (billing_period in ('monthly', 'annual', 'volume_based')),

  started_at              timestamptz not null default now(),
  current_period_start    timestamptz not null default now(),
  current_period_end      timestamptz not null,
  canceled_at             timestamptz,
  trial_end               timestamptz,

  payment_method          text,
  paystack_subscription_code text unique,
  paystack_customer_code  text,
  last_payment_at         timestamptz,
  next_payment_due        timestamptz,

  metadata                jsonb default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint subscriptions_period_valid check (current_period_end > current_period_start)
);

create index if not exists idx_subscriptions_user_status    on subscriptions(user_id, status);
create index if not exists idx_subscriptions_next_payment   on subscriptions(next_payment_due)
  where status in ('active', 'past_due');
create index if not exists idx_subscriptions_paystack_code  on subscriptions(paystack_subscription_code)
  where paystack_subscription_code is not null;
create unique index if not exists subscriptions_one_active_per_user
  on subscriptions(user_id, plan)
  where status in ('active', 'trialing');

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function public.set_updated_at();

comment on table subscriptions is 'User subscription plans (Plus, Lender Pro, Circles Pro)';

-- ─── 3. Feature entitlements ───

create table if not exists feature_entitlements (
  id                                  uuid primary key default gen_random_uuid(),
  user_id                             uuid not null references public.profiles(id) on delete cascade,

  instant_withdrawals_enabled         boolean not null default false,
  instant_withdraw_quota              integer not null default 0,
  instant_withdraw_used               integer not null default 0,
  withdraw_fee_discount_percent       integer not null default 0 check (withdraw_fee_discount_percent between 0 and 100),

  max_platform_loan_multiplier        numeric(3,2) not null default 1.0 check (max_platform_loan_multiplier >= 1.0),
  extended_duration_days              integer not null default 0,
  priority_support                    boolean not null default false,

  boost_quota                         integer not null default 1,
  boost_used                          integer not null default 0,
  boost_discount_percent              integer not null default 0 check (boost_discount_percent between 0 and 100),
  featured_listing                    boolean not null default false,
  auto_match_enabled                  boolean not null default false,

  verified_lender_badge               boolean not null default false,
  portfolio_analytics                 boolean not null default false,
  auto_relend                         boolean not null default false,
  lender_insurance_enabled            boolean not null default false,
  lender_insurance_coverage_percent   integer not null default 0 check (lender_insurance_coverage_percent between 0 and 100),

  max_circles                         integer not null default 1,
  circle_admin_tools                  boolean not null default false,
  circle_analytics                    boolean not null default false,

  advanced_credit_report              boolean not null default false,
  downloadable_certificate            boolean not null default false,

  quota_reset_at                      timestamptz not null default (date_trunc('month', now()) + interval '1 month'),

  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now(),

  constraint feature_entitlements_one_per_user unique (user_id)
);

create index if not exists idx_feature_entitlements_user         on feature_entitlements(user_id);
create index if not exists idx_feature_entitlements_quota_reset  on feature_entitlements(quota_reset_at);

create trigger feature_entitlements_set_updated_at
  before update on feature_entitlements
  for each row execute function public.set_updated_at();

comment on table feature_entitlements is 'Per-user feature flags and quotas based on subscription tier';

-- ─── 4. Expand revenue_events ───

do $$ begin
  alter type revenue_event_type add value if not exists 'subscription_recurring';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'instant_payout_fee';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'credit_report_sale';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'circle_subscription';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'lender_insurance_fee';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'featured_listing';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'unlock_payment';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type revenue_event_type add value if not exists 'bills_convenience_fee';
exception when duplicate_object then null; end $$;

alter table revenue_events
  add column if not exists subscription_id uuid references subscriptions(id) on delete set null,
  add column if not exists plan_type subscription_plan_type;

create index if not exists idx_revenue_events_subscription on revenue_events(subscription_id)
  where subscription_id is not null;
create index if not exists idx_revenue_events_plan_type    on revenue_events(plan_type)
  where plan_type is not null;

-- ─── 5. User metrics tracking ───

create table if not exists user_metrics (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,

  loans_taken              integer not null default 0,
  loans_given              integer not null default 0,
  total_borrowed           numeric(14,2) not null default 0,
  total_lent               numeric(14,2) not null default 0,
  on_time_repayments       integer not null default 0,
  late_repayments          integer not null default 0,

  lifetime_fees_paid       numeric(14,2) not null default 0,
  lifetime_referral_earned numeric(14,2) not null default 0,
  subscription_months      integer not null default 0,

  bills_purchased          integer not null default 0,
  bills_value              numeric(14,2) not null default 0,
  withdrawals_count        integer not null default 0,
  marketplace_posts        integer not null default 0,
  boost_purchases          integer not null default 0,

  first_loan_at            timestamptz,
  last_active_at           timestamptz,
  ltv_calculated_at        timestamptz,
  lifetime_value           numeric(14,2) not null default 0,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint user_metrics_one_per_user unique (user_id)
);

create index if not exists idx_user_metrics_user        on user_metrics(user_id);
create index if not exists idx_user_metrics_ltv         on user_metrics(lifetime_value desc);
create index if not exists idx_user_metrics_last_active on user_metrics(last_active_at desc);

create trigger user_metrics_set_updated_at
  before update on user_metrics
  for each row execute function public.set_updated_at();

comment on table user_metrics is 'Aggregated user behavior and revenue metrics for LTV/CAC analysis';

-- ─── 6. Unlock eligibility functions ───

create or replace function public.is_eligible_for_time_based_unlock(p_user_id uuid)
returns boolean language plpgsql stable as $$
declare
  v_profile record;
  v_payment_made boolean;
begin
  select created_at, registration_deposit_paid, account_unlocked, unlock_eligible_at
  into v_profile from public.profiles where id = p_user_id;

  if v_profile.account_unlocked then return true; end if;

  select exists (
    select 1 from public.account_unlock_payments
    where user_id = p_user_id and status = 'success' and amount >= 2000
    limit 1
  ) into v_payment_made;

  return (
    v_profile.registration_deposit_paid and
    v_payment_made and
    v_profile.unlock_eligible_at <= now()
  );
end;
$$;

comment on function public.is_eligible_for_time_based_unlock is 'Check if user can unlock via 15-day + NGN 2,000 payment method';

create or replace function public.is_eligible_for_referral_unlock(p_user_id uuid)
returns boolean language plpgsql stable as $$
declare
  v_count integer;
begin
  select coalesce(verified_referral_count, 0) into v_count
  from public.profiles where id = p_user_id;
  return v_count >= 10;
end;
$$;

comment on function public.is_eligible_for_referral_unlock is 'Check if user has 10+ verified referrals for free unlock';

create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean language plpgsql stable as $$
begin
  return exists (
    select 1 from subscriptions
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and plan in ('plus_monthly', 'plus_annual', 'lender_pro_monthly', 'lender_pro_volume')
      and current_period_end > now()
  );
end;
$$;

comment on function public.has_active_subscription is 'Check if user has active Plus or Lender Pro subscription (auto-unlocks)';

-- ─── 7. Initialize entitlements & metrics for existing users ───

insert into feature_entitlements (user_id)
select id from public.profiles
where not exists (
  select 1 from feature_entitlements where user_id = public.profiles.id
);

insert into user_metrics (user_id, last_active_at)
select id, updated_at from public.profiles
where not exists (
  select 1 from user_metrics where user_id = public.profiles.id
);

-- ─── 8. Enhance account_unlock_payments tracking ───

alter table account_unlock_payments
  add column if not exists unlock_type text check (unlock_type in ('immediate', 'time_based')) default 'time_based',
  add column if not exists eligible_at timestamptz,
  add column if not exists days_since_registration integer;

comment on column account_unlock_payments.unlock_type is 'immediate = pay NGN 2k now to unlock instantly, time_based = pay NGN 2k + wait 15 days';
comment on column account_unlock_payments.eligible_at is 'When user will be eligible for unlock (15 days after this payment)';

-- ─── 9. Analytics views ───

create or replace view user_unlock_status as
select
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at as registered_at,
  p.unlock_eligible_at,
  p.account_unlocked,
  p.account_unlock_paid_at,
  p.unlock_method,
  p.unlock_requested_at,
  p.verified_referral_count,

  public.is_eligible_for_time_based_unlock(p.id) as time_unlock_eligible,
  public.is_eligible_for_referral_unlock(p.id)  as referral_unlock_eligible,
  public.has_active_subscription(p.id)          as has_subscription,

  aup.amount as unlock_payment_amount,
  aup.status as payment_status,
  aup.unlock_type,
  aup.eligible_at as payment_eligible_at,
  aup.created_at as payment_made_at,

  s.plan as subscription_plan,
  s.status as subscription_status,

  case
    when p.account_unlocked                                              then 'unlocked'
    when public.has_active_subscription(p.id)                           then 'eligible_via_subscription'
    when public.is_eligible_for_referral_unlock(p.id)                   then 'eligible_via_referrals'
    when public.is_eligible_for_time_based_unlock(p.id)                 then 'eligible_via_time'
    when p.unlock_eligible_at > now()                                   then 'waiting_15_days'
    else 'locked'
  end as unlock_status

from public.profiles p
left join public.account_unlock_payments aup
  on aup.user_id = p.id
  and aup.status = 'success'
  and aup.created_at = (
    select max(created_at) from public.account_unlock_payments
    where user_id = p.id and status = 'success'
  )
left join public.subscriptions s
  on s.user_id = p.id
  and s.status in ('active', 'trialing')
  and s.current_period_end > now();

comment on view user_unlock_status is 'Comprehensive user unlock eligibility status for admin dashboard';

create or replace view subscription_revenue_summary as
select
  date_trunc('day', s.started_at) as signup_date,
  s.plan,
  s.status,
  count(*) as subscriptions_count,
  sum(s.amount) as total_revenue,
  avg(s.amount) as avg_revenue,
  count(distinct s.user_id) as unique_users
from public.subscriptions s
where s.started_at >= now() - interval '90 days'
group by date_trunc('day', s.started_at), s.plan, s.status
order by signup_date desc, plan;

comment on view subscription_revenue_summary is 'Daily subscription revenue by plan for analytics dashboard';

-- ─── 10. Seed: Free plan for all existing users ───

insert into subscriptions (
  user_id, plan, status, amount, billing_period,
  current_period_start, current_period_end
)
select
  id,
  'free'::subscription_plan_type,
  'active'::subscription_status,
  0,
  'monthly',
  now(),
  now() + interval '100 years'
from public.profiles
where not exists (
  select 1 from public.subscriptions where user_id = public.profiles.id
)
on conflict do nothing;
