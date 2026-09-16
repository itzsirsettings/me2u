create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  locked boolean not null default true,
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_deals (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,
  category text not null,
  title text not null,
  description text not null,
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  country_code text not null default 'NG',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_deal_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.merchant_deals(id) on delete cascade,
  status text not null default 'claimed' check (status in ('claimed', 'redeemed', 'expired')),
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

create table if not exists public.learning_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'wallet_frozen',
      'wallet_unfrozen',
      'fraud_reported',
      'recovery_requested',
      'trusted_device_reviewed',
      'session_reviewed',
      'mfa_started'
    )
  ),
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_security_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wallet_frozen boolean not null default false,
  trusted_device_label text,
  updated_at timestamptz not null default now()
);

create table if not exists public.support_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  beneficiary_name text not null check (char_length(trim(beneficiary_name)) between 2 and 120),
  relationship text not null default 'Family',
  purpose text not null default 'Family support',
  support_mode text not null default 'non_repayment' check (support_mode in ('repayment', 'non_repayment')),
  verified boolean not null default false,
  last_support_amount numeric(14, 2) not null default 0 check (last_support_amount >= 0),
  spending_proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savings_goals_user_status_idx on public.savings_goals (user_id, status, created_at desc);
create index if not exists merchant_deals_active_country_idx on public.merchant_deals (active, country_code, category);
create index if not exists merchant_deal_claims_user_idx on public.merchant_deal_claims (user_id, created_at desc);
create index if not exists learning_progress_user_idx on public.learning_progress (user_id, completed_at desc);
create index if not exists security_events_user_created_idx on public.security_events (user_id, created_at desc);
create index if not exists support_beneficiaries_sponsor_idx on public.support_beneficiaries (sponsor_id, created_at desc);

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

drop trigger if exists user_security_settings_set_updated_at on public.user_security_settings;
create trigger user_security_settings_set_updated_at
before update on public.user_security_settings
for each row execute function public.set_updated_at();

drop trigger if exists support_beneficiaries_set_updated_at on public.support_beneficiaries;
create trigger support_beneficiaries_set_updated_at
before update on public.support_beneficiaries
for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;
alter table public.merchant_deals enable row level security;
alter table public.merchant_deal_claims enable row level security;
alter table public.learning_progress enable row level security;
alter table public.security_events enable row level security;
alter table public.user_security_settings enable row level security;
alter table public.support_beneficiaries enable row level security;

grant select, insert, update, delete on public.savings_goals to authenticated;
grant select on public.merchant_deals to anon, authenticated;
grant select, insert, update on public.merchant_deal_claims to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;
grant select, insert on public.security_events to authenticated;
grant select, insert, update on public.user_security_settings to authenticated;
grant select, insert, update, delete on public.support_beneficiaries to authenticated;

drop policy if exists "Users can manage their savings goals" on public.savings_goals;
create policy "Users can manage their savings goals"
on public.savings_goals for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Anyone can read active merchant deals" on public.merchant_deals;
create policy "Anyone can read active merchant deals"
on public.merchant_deals for select to anon, authenticated
using (active = true);

drop policy if exists "Users can manage their deal claims" on public.merchant_deal_claims;
create policy "Users can manage their deal claims"
on public.merchant_deal_claims for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their learning progress" on public.learning_progress;
create policy "Users can manage their learning progress"
on public.learning_progress for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read and create their security events" on public.security_events;
create policy "Users can read and create their security events"
on public.security_events for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their security settings" on public.user_security_settings;
create policy "Users can manage their security settings"
on public.user_security_settings for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage support beneficiaries" on public.support_beneficiaries;
create policy "Users can manage support beneficiaries"
on public.support_beneficiaries for all to authenticated
using (sponsor_id = auth.uid())
with check (sponsor_id = auth.uid());

insert into public.merchant_deals (merchant_name, category, title, description, discount_percent, country_code)
values
  ('Campus Food Partner', 'Food', '5% off verified meal orders', 'Claim this deal and show it to a verified food vendor before wallet payment.', 5, 'NG'),
  ('CarePlus Pharmacy', 'Health', 'Medicine support discount', 'Use Me2U wallet records when buying from participating pharmacy partners.', 4, 'NG'),
  ('SkillBridge Training', 'Education', 'Training enrollment deal', 'Claim before paying for approved short courses or skill programs.', 7, 'NG'),
  ('PrintHub Business', 'Business', 'Print and design savings', 'Small businesses can claim this before print or document services.', 5, 'NG'),
  ('PhoneMart Verified', 'Devices', 'Phone accessory discount', 'Claim for verified phone accessories from participating merchants.', 3, 'NG')
on conflict do nothing;

comment on column public.profiles.transaction_pin is
'Stores a server-generated PIN verifier only. Legacy 4-digit values are cleared by the 20260520111355 migration.';

update public.profiles
set transaction_pin = null
where transaction_pin ~ '^[0-9]{4}$';

create or replace function private.me2u_refresh_trust_score(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile record;
  v_completed_loans integer;
  v_active_loans integer;
  v_wallet_activity integer;
  v_referrals integer;
  v_age_days integer;
  v_verified_contacts integer;
  v_score integer;
begin
  select p.*
  into v_profile
  from public.profiles p
  where p.id = p_user_id;

  if v_profile is null then
    return 0;
  end if;

  select count(*)::integer
  into v_completed_loans
  from public.loans l
  where (l.borrower_id = p_user_id or l.lender_id = p_user_id)
    and l.status = 'completed';

  select count(*)::integer
  into v_active_loans
  from public.loans l
  where (l.borrower_id = p_user_id or l.lender_id = p_user_id)
    and l.status = 'active';

  select count(*)::integer
  into v_wallet_activity
  from public.transactions t
  where t.user_id = p_user_id;

  select count(*)::integer
  into v_referrals
  from public.affiliate_rewards a
  where a.referrer_id = p_user_id;

  v_age_days := greatest(0, floor(extract(epoch from (now() - v_profile.created_at)) / 86400)::integer);
  v_verified_contacts :=
    (case when coalesce(v_profile.email, '') <> '' then 1 else 0 end) +
    (case when coalesce(v_profile.phone, '') <> '' then 1 else 0 end) +
    (case when coalesce(v_profile.kyc_verified, false) then 1 else 0 end);

  v_score :=
    case when coalesce(v_profile.kyc_verified, false) then 18 when coalesce(v_profile.registration_deposit_paid, false) then 8 else 0 end +
    case when v_completed_loans > 0 then 18 when v_active_loans > 0 then 9 else 0 end +
    case when v_wallet_activity >= 5 then 12 when v_wallet_activity > 0 then 7 else 0 end +
    case when v_referrals >= 5 then 10 when v_referrals > 0 then 7 else 0 end +
    case when v_completed_loans >= 3 then 12 when v_completed_loans > 0 then 8 when v_active_loans > 0 then 4 else 0 end +
    10 +
    case when v_age_days >= 90 then 8 when v_age_days >= 30 then 5 when v_age_days > 0 then 2 else 0 end +
    case when v_verified_contacts >= 3 then 7 when v_verified_contacts >= 2 then 5 when v_verified_contacts > 0 then 2 else 0 end +
    case when v_completed_loans > 0 then 5 else 0 end;

  v_score := least(100, greatest(0, v_score));

  update public.profiles
  set trust_score = v_score
  where id = p_user_id;

  return v_score;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.user_id);
  return new;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_loan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.borrower_id);
  if new.lender_id is not null then
    perform private.me2u_refresh_trust_score(new.lender_id);
  end if;
  return new;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_affiliate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.me2u_refresh_trust_score(new.referrer_id);
  return new;
end;
$$;

drop trigger if exists transactions_refresh_trust_score on public.transactions;
create trigger transactions_refresh_trust_score
after insert on public.transactions
for each row execute function private.me2u_refresh_trust_score_from_transaction();

drop trigger if exists loans_refresh_trust_score on public.loans;
create trigger loans_refresh_trust_score
after insert or update of status on public.loans
for each row execute function private.me2u_refresh_trust_score_from_loan();

drop trigger if exists affiliate_rewards_refresh_trust_score on public.affiliate_rewards;
create trigger affiliate_rewards_refresh_trust_score
after insert on public.affiliate_rewards
for each row execute function private.me2u_refresh_trust_score_from_affiliate();

do $$
declare
  v_profile_id uuid;
begin
  for v_profile_id in select id from public.profiles loop
    perform private.me2u_refresh_trust_score(v_profile_id);
  end loop;
end;
$$;

do $$
begin
  alter table public.circles replica identity full;
  alter table public.circle_members replica identity full;
  alter table public.savings_goals replica identity full;
  alter table public.learning_progress replica identity full;
  alter table public.merchant_deal_claims replica identity full;
  alter table public.security_events replica identity full;
  alter table public.user_security_settings replica identity full;
  alter table public.support_beneficiaries replica identity full;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.circles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.circle_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
