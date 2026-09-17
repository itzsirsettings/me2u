-- ============================================================
-- Me2U Complete Railway PostgreSQL Schema
-- Migration 002: Full application schema without any Supabase constructs.
--
-- Prerequisites: 001_add_auth_tables.sql must have run first.
-- That migration creates public.auth_users and re-targets the
-- profiles FK away from auth.users.
--
-- Key differences from Supabase migrations:
--  - No auth.uid() — RLS uses app_user_id() session variable
--  - No auth.users FK — profiles references public.auth_users
--  - No Supabase roles (anon, authenticated, service_role)
--  - No storage.* tables — R2 handles file storage
--  - No supabase_realtime publications / replica identity
--  - Business-logic stored procedures removed (moved to TypeScript)
--  - Structural helpers (set_updated_at, trust score triggers) kept
-- ============================================================

-- ─────────────────────────────────────────────
-- 0. Extensions & helper functions
-- ─────────────────────────────────────────────

create extension if not exists pgcrypto;

-- RLS helper: reads the session variable set by withUserTransaction()
create or replace function public.app_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

-- Admin check helper
create or replace function public.is_admin()
returns boolean language plpgsql stable as $$
begin
  return exists (
    select 1 from public.profiles
    where id = public.app_user_id() and role = 'admin'
  );
end;
$$;

-- Timestamp trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────

do $$ begin
  create type public.transaction_type as enum (
    'deposit', 'withdrawal', 'loan_disbursed', 'loan_repayment',
    'investment', 'repayment_received', 'affiliate_reward',
    'bill_payment', 'bill_refund',
    'deposit_locked', 'deposit_unlocked', 'deposit_forfeited', 'deposit_recovery'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.marketplace_item_type as enum ('borrow_request', 'lending_offer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.marketplace_status as enum ('active', 'funded', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.loan_status as enum ('active', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_proof_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_proof_type as enum ('wallet_funding', 'registration_deposit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.withdrawal_request_status as enum (
    'pending', 'approved', 'rejected', 'processing', 'success', 'failed', 'reversed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.revenue_event_type as enum (
    'withdrawal_fee', 'marketplace_boost', 'partner_treasury_share', 'partner_referral'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.loan_funding_source as enum (
    'me2u_balance_sheet', 'peer_lender', 'partner_bank'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bill_record_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bill_provider as enum ('vtpass', 'flutterwave', 'wema');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bill_transaction_status as enum (
    'initiated', 'debited', 'pending', 'successful', 'failed', 'reversed', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_ledger_transaction_type as enum ('credit', 'debit', 'refund', 'reversal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_ledger_source as enum (
    'deposit', 'loan', 'bill_payment', 'repayment', 'admin_adjustment',
    'withdrawal', 'referral', 'bank_transfer', 'transfer'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────
-- 2. Core tables
-- ─────────────────────────────────────────────

-- profiles — FK references auth_users (created in 001)
create table if not exists public.profiles (
  id                              uuid primary key references public.auth_users(id) on delete cascade,
  first_name                      text not null,
  last_name                       text not null,
  email                           text not null,
  phone                           text,
  nin_hash                        text unique,
  nin_last4                       text,
  kyc_verified                    boolean not null default false,
  trust_score                     integer not null default 50 check (trust_score between 0 and 100),
  bank_name                       text,
  account_number                  text,
  username                        text,
  referral_code                   text,
  registration_payment_reference  text,
  registration_deposit_paid       boolean not null default false,
  registration_deposit_amount     numeric(14,2) not null default 0 check (registration_deposit_amount >= 0),
  registration_deposit_confirmed_at timestamptz,
  referred_by                     uuid references public.profiles(id) on delete set null,
  affiliate_earnings              numeric(14,2) not null default 0 check (affiliate_earnings >= 0),
  passport_photo_url              text,
  role                            text not null default 'user',
  transaction_pin                 text,
  group_lending_enabled           boolean not null default false,
  welcome_bonus_unlocked_at       timestamptz,
  partner_offer_consent_at        timestamptz,
  partner_offer_consent_version   text,
  country_code                    text not null default 'NG',
  preferred_currency              text not null default 'NGN',
  preferred_language              text not null default 'en',
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint profiles_role_check check (role in ('user', 'admin')),
  constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9]{3,30}$'),
  constraint profiles_country_code_supported check (country_code in ('NG','GH','KE','ZA','GB','US','CA','AE')),
  constraint profiles_preferred_currency_supported check (preferred_currency in ('NGN','GHS','KES','ZAR','GBP','USD','CAD','AED')),
  constraint profiles_preferred_language_supported check (preferred_language in ('en','fr','sw','ar','pt'))
);

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username)) where username is not null;
create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by) where referred_by is not null;
create index if not exists profiles_country_code_idx
  on public.profiles (country_code);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- wallets
create table if not exists public.wallets (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  id         uuid not null default gen_random_uuid() unique,
  balance    numeric(14,2) not null default 0 check (balance >= 0),
  locked     numeric(14,2) not null default 0 check (locked >= 0),
  updated_at timestamptz not null default now()
);

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- transactions
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        public.transaction_type not null,
  amount      numeric(14,2) not null check (amount > 0),
  description text not null,
  created_at  timestamptz not null default now()
);

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc);

-- marketplace_items
create table if not exists public.marketplace_items (
  id               uuid primary key default gen_random_uuid(),
  type             public.marketplace_item_type not null,
  amount           numeric(14,2) not null check (amount > 0),
  rate             numeric(6,2) not null check (rate >= 0),
  days             integer not null check (days between 1 and 14),
  author_id        uuid not null references public.profiles(id) on delete cascade,
  author_name      text not null,
  trust_score      integer not null default 50 check (trust_score between 0 and 100),
  status           public.marketplace_status not null default 'active',
  boosted_at       timestamptz,
  boosted_until    timestamptz,
  boost_fee_amount numeric(14,2) not null default 0 check (boost_fee_amount >= 0),
  created_at       timestamptz not null default now()
);

create index if not exists marketplace_items_status_created_idx
  on public.marketplace_items (status, created_at desc);
create index if not exists marketplace_items_boosted_until_idx
  on public.marketplace_items (boosted_until desc) where boosted_until is not null;

-- loans
create table if not exists public.loans (
  id               uuid primary key default gen_random_uuid(),
  borrower_id      uuid not null references public.profiles(id) on delete cascade,
  lender_id        uuid references public.profiles(id) on delete cascade,
  amount           numeric(14,2) not null check (amount > 0),
  rate             numeric(6,2) not null check (rate >= 0),
  days             integer not null check (days between 1 and 60),
  security_deposit numeric(14,2) not null default 0,
  funding_source   public.loan_funding_source not null default 'peer_lender',
  status           public.loan_status not null default 'active',
  start_date       timestamptz not null default now(),
  due_date         timestamptz not null,
  created_at       timestamptz not null default now()
);

create index if not exists loans_borrower_status_idx
  on public.loans (borrower_id, status, created_at desc);
create index if not exists loans_lender_status_idx
  on public.loans (lender_id, status, created_at desc) where lender_id is not null;
create index if not exists loans_platform_borrower_status_idx
  on public.loans (borrower_id, status, created_at desc) where lender_id is null;

-- trust_tiers
create table if not exists public.trust_tiers (
  id               uuid primary key default gen_random_uuid(),
  label            text not null unique,
  min_score        integer not null check (min_score >= 0),
  max_score        integer not null check (max_score <= 100),
  deposit_rate     numeric(4,2) not null check (deposit_rate between 0 and 1),
  max_duration_days integer not null check (max_duration_days > 0),
  sort_order       integer not null unique,
  created_at       timestamptz not null default now(),
  constraint valid_tier_range check (min_score < max_score)
);

insert into public.trust_tiers (label, min_score, max_score, deposit_rate, max_duration_days, sort_order)
values
  ('Standard', 0,  50, 0.50, 14, 1),
  ('Building', 51, 65, 0.40, 14, 2),
  ('Trusted',  66, 80, 0.25, 14, 3),
  ('Gold',     81, 95, 0.10, 30, 4),
  ('Premium',  96, 100, 0.00, 60, 5)
on conflict (label) do nothing;

-- payment_proofs
create table if not exists public.payment_proofs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  amount            numeric(14,2) not null check (amount > 0),
  reference         text not null,
  type              public.payment_proof_type not null,
  receipt_image_url text not null,
  status            public.payment_proof_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger payment_proofs_set_updated_at
  before update on public.payment_proofs
  for each row execute function public.set_updated_at();
create index if not exists payment_proofs_user_status_idx
  on public.payment_proofs (user_id, status, created_at desc);

-- notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- withdrawal_requests
create table if not exists public.withdrawal_requests (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  amount                  numeric(14,2) not null check (amount > 0),
  fee_amount              numeric(14,2) not null default 100.00 check (fee_amount >= 0),
  fee                     numeric(14,2) not null default 0,
  net_amount              numeric(14,2) not null default 0,
  bank_name               text,
  bank_code               text,
  account_number          text,
  account_name            text,
  status                  public.withdrawal_request_status not null default 'pending',
  processed_by            uuid references public.profiles(id) on delete set null,
  processed_at            timestamptz,
  admin_note              text,
  paystack_recipient_code text,
  paystack_transfer_code  text,
  paystack_reference      text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger withdrawal_requests_set_updated_at
  before update on public.withdrawal_requests
  for each row execute function public.set_updated_at();
create index if not exists withdrawal_requests_status_created_at_idx
  on public.withdrawal_requests (status, created_at desc);
create index if not exists withdrawal_requests_user_id_created_at_idx
  on public.withdrawal_requests (user_id, created_at desc);

-- affiliate_rewards
create table if not exists public.affiliate_rewards (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  amount           numeric(14,2) not null check (amount > 0),
  created_at       timestamptz not null default now(),
  unique (referred_user_id)
);

-- referrals
create table if not exists public.referrals (
  id                       uuid primary key default gen_random_uuid(),
  referrer_id              uuid not null references public.profiles(id) on delete cascade,
  referee_id               uuid not null references public.profiles(id) on delete cascade,
  first_withdrawal_rewarded boolean not null default false,
  first_repayment_rewarded  boolean not null default false,
  rewarded                  boolean not null default false,
  created_at               timestamptz not null default now(),
  constraint unique_referral_pair unique (referrer_id, referee_id),
  constraint no_self_referral check (referrer_id <> referee_id)
);

create index if not exists referrals_referee_idx  on public.referrals (referee_id);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

-- revenue_events
create table if not exists public.revenue_events (
  id          uuid primary key default gen_random_uuid(),
  type        public.revenue_event_type not null,
  amount      numeric(14,2) not null check (amount > 0),
  user_id     uuid references public.profiles(id) on delete set null,
  source_id   uuid,
  description text not null,
  created_at  timestamptz not null default now()
);

create index if not exists revenue_events_type_created_at_idx
  on public.revenue_events (type, created_at desc);
create index if not exists revenue_events_user_id_created_at_idx
  on public.revenue_events (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- 3. User-growth feature tables
-- ─────────────────────────────────────────────

create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null check (char_length(trim(name)) between 2 and 80),
  target_amount  numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  locked         boolean not null default true,
  status         text not null default 'active' check (status in ('active','completed','withdrawn')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();
create index if not exists savings_goals_user_status_idx
  on public.savings_goals (user_id, status, created_at desc);

create table if not exists public.merchant_deals (
  id               uuid primary key default gen_random_uuid(),
  merchant_name    text not null,
  category         text not null,
  title            text not null,
  description      text not null,
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  country_code     text not null default 'NG',
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists merchant_deals_active_country_idx
  on public.merchant_deals (active, country_code, category);

create table if not exists public.merchant_deal_claims (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  deal_id    uuid not null references public.merchant_deals(id) on delete cascade,
  status     text not null default 'claimed' check (status in ('claimed','redeemed','expired')),
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

create index if not exists merchant_deal_claims_user_idx
  on public.merchant_deal_claims (user_id, created_at desc);

create table if not exists public.learning_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_key   text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);

create index if not exists learning_progress_user_idx
  on public.learning_progress (user_id, completed_at desc);

create table if not exists public.security_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in (
    'wallet_frozen','wallet_unfrozen','fraud_reported','recovery_requested',
    'trusted_device_reviewed','session_reviewed','mfa_started'
  )),
  detail     text,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists security_events_user_created_idx
  on public.security_events (user_id, created_at desc);

create table if not exists public.user_security_settings (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  wallet_frozen        boolean not null default false,
  trusted_device_label text,
  updated_at           timestamptz not null default now()
);

create trigger user_security_settings_set_updated_at
  before update on public.user_security_settings
  for each row execute function public.set_updated_at();

create table if not exists public.support_beneficiaries (
  id                  uuid primary key default gen_random_uuid(),
  sponsor_id          uuid not null references public.profiles(id) on delete cascade,
  beneficiary_name    text not null check (char_length(trim(beneficiary_name)) between 2 and 120),
  relationship        text not null default 'Family',
  purpose             text not null default 'Family support',
  support_mode        text not null default 'non_repayment' check (support_mode in ('repayment','non_repayment')),
  verified            boolean not null default false,
  last_support_amount numeric(14,2) not null default 0 check (last_support_amount >= 0),
  spending_proof_url  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger support_beneficiaries_set_updated_at
  before update on public.support_beneficiaries
  for each row execute function public.set_updated_at();
create index if not exists support_beneficiaries_sponsor_idx
  on public.support_beneficiaries (sponsor_id, created_at desc);

create table if not exists public.circles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  creator_id   uuid references public.profiles(id) on delete cascade,
  pool_balance numeric(14,2) not null default 0 check (pool_balance >= 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid references public.circles(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

-- ─────────────────────────────────────────────
-- 4. Bills architecture tables
-- ─────────────────────────────────────────────

create table if not exists public.bill_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  status     public.bill_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bill_categories_set_updated_at
  before update on public.bill_categories
  for each row execute function public.set_updated_at();

create table if not exists public.bill_products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.bill_categories(id) on delete cascade,
  provider      public.bill_provider not null default 'vtpass',
  service_id    text not null,
  variation_code text,
  network       text,
  name          text not null,
  cost_price    numeric(14,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  commission    numeric(14,2) not null default 0,
  is_active     boolean not null default true,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger bill_products_set_updated_at
  before update on public.bill_products
  for each row execute function public.set_updated_at();

create table if not exists public.bill_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  wallet_id           uuid not null references public.wallets(id),
  product_id          uuid references public.bill_products(id),
  reference           text not null unique,
  idempotency_key     text,
  provider            public.bill_provider not null default 'vtpass',
  provider_reference  text,
  category            text not null,
  service_id          text not null,
  variation_code      text,
  network             text,
  customer_identifier text not null,
  amount              numeric(14,2) not null check (amount > 0),
  cost_price          numeric(14,2) not null default 0 check (cost_price >= 0),
  selling_price       numeric(14,2) not null check (selling_price > 0),
  profit              numeric(14,2) not null default 0,
  status              public.bill_transaction_status not null default 'initiated',
  provider_response   jsonb,
  failure_reason      text,
  requery_count       integer not null default 0 check (requery_count >= 0),
  next_requery_at     timestamptz,
  completed_at        timestamptz,
  refunded_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger bill_transactions_set_updated_at
  before update on public.bill_transactions
  for each row execute function public.set_updated_at();

create unique index if not exists bill_transactions_user_idempotency_key_idx
  on public.bill_transactions (user_id, idempotency_key) where idempotency_key is not null;
create index if not exists bill_transactions_user_created_idx
  on public.bill_transactions (user_id, created_at desc);
create index if not exists bill_transactions_status_requery_idx
  on public.bill_transactions (status, next_requery_at) where status = 'pending';

create table if not exists public.wallet_ledger (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  wallet_id        uuid not null references public.wallets(id),
  transaction_type public.wallet_ledger_transaction_type not null,
  source           public.wallet_ledger_source not null,
  amount           numeric(14,2) not null check (amount > 0),
  balance_before   numeric(14,2) not null check (balance_before >= 0),
  balance_after    numeric(14,2) not null check (balance_after >= 0),
  reference        text not null unique,
  description      text not null,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc);

create table if not exists public.provider_logs (
  id               uuid primary key default gen_random_uuid(),
  provider         public.bill_provider not null,
  endpoint         text not null,
  reference        text,
  request_payload  jsonb,
  response_payload jsonb,
  status_code      integer,
  created_at       timestamptz not null default now()
);

create index if not exists provider_logs_reference_idx
  on public.provider_logs (reference, created_at desc);

create table if not exists public.provider_webhooks (
  id         uuid primary key default gen_random_uuid(),
  provider   text not null,
  event_type text,
  reference  text,
  payload    jsonb not null default '{}',
  processed  boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.paystack_dedicated_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  customer_code       text,
  dedicated_account_id text,
  account_name        text,
  account_number      text,
  bank_name           text,
  bank_slug           text,
  assignment_payload  jsonb,
  status              text not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id),
  unique (account_number)
);

create trigger paystack_dedicated_accounts_set_updated_at
  before update on public.paystack_dedicated_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.admin_audit_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 5. Banking rails tables
-- ─────────────────────────────────────────────

create table if not exists public.virtual_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  provider          text not null default 'wema',
  provider_reference text,
  account_name      text,
  account_number    text,
  bank_name         text,
  bank_code         text,
  currency          text not null default 'NGN',
  status            text not null default 'pending',
  request_payload   jsonb not null default '{}',
  response_payload  jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (provider, user_id),
  unique (provider, account_number)
);

create trigger virtual_accounts_set_updated_at
  before update on public.virtual_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.wallet_inflows (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  wallet_id             uuid references public.wallets(id),
  virtual_account_id    uuid references public.virtual_accounts(id),
  provider              text not null default 'wema',
  provider_reference    text not null,
  amount                numeric(14,2) not null check (amount > 0),
  currency              text not null default 'NGN',
  status                text not null default 'pending',
  sender_name           text,
  sender_account_number text,
  narration             text,
  credited_at           timestamptz,
  raw_payload           jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (provider, provider_reference)
);

create trigger wallet_inflows_set_updated_at
  before update on public.wallet_inflows
  for each row execute function public.set_updated_at();

create table if not exists public.bank_transfers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  wallet_id         uuid references public.wallets(id),
  provider          text not null default 'wema',
  reference         text not null unique,
  provider_reference text,
  amount            numeric(14,2) not null check (amount > 0),
  bank_code         text not null,
  account_number    text not null,
  account_name      text,
  narration         text,
  status            text not null default 'initiated',
  failure_reason    text,
  provider_response jsonb,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger bank_transfers_set_updated_at
  before update on public.bank_transfers
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 6. RLS policies (app_user_id() replaces auth.uid())
-- ─────────────────────────────────────────────

alter table public.profiles               enable row level security;
alter table public.wallets                enable row level security;
alter table public.transactions           enable row level security;
alter table public.marketplace_items      enable row level security;
alter table public.loans                  enable row level security;
alter table public.affiliate_rewards      enable row level security;
alter table public.referrals              enable row level security;
alter table public.payment_proofs         enable row level security;
alter table public.notifications          enable row level security;
alter table public.withdrawal_requests    enable row level security;
alter table public.revenue_events         enable row level security;
alter table public.savings_goals          enable row level security;
alter table public.merchant_deals         enable row level security;
alter table public.merchant_deal_claims   enable row level security;
alter table public.learning_progress      enable row level security;
alter table public.security_events        enable row level security;
alter table public.user_security_settings enable row level security;
alter table public.support_beneficiaries  enable row level security;
alter table public.circles                enable row level security;
alter table public.circle_members         enable row level security;
alter table public.trust_tiers            enable row level security;
alter table public.bill_categories        enable row level security;
alter table public.bill_products          enable row level security;
alter table public.bill_transactions      enable row level security;
alter table public.wallet_ledger          enable row level security;
alter table public.provider_logs          enable row level security;
alter table public.provider_webhooks      enable row level security;
alter table public.paystack_dedicated_accounts enable row level security;
alter table public.admin_audit_logs       enable row level security;
alter table public.virtual_accounts       enable row level security;
alter table public.wallet_inflows         enable row level security;
alter table public.bank_transfers         enable row level security;

-- profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (id = public.app_user_id());

create policy "Users can read peer profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.loans l
      where l.status = 'active' and l.lender_id is not null
        and ((l.borrower_id = public.app_user_id() and l.lender_id = profiles.id)
          or (l.lender_id   = public.app_user_id() and l.borrower_id = profiles.id))
    )
  );

-- wallets
create policy "Users can read own wallet"
  on public.wallets for select using (user_id = public.app_user_id());

-- transactions
create policy "Users can read own transactions"
  on public.transactions for select using (user_id = public.app_user_id());

-- marketplace_items
create policy "Anyone can read active marketplace items"
  on public.marketplace_items for select using (status = 'active');

-- loans
create policy "Users can read own loans"
  on public.loans for select
  using (borrower_id = public.app_user_id() or lender_id = public.app_user_id());

-- affiliate_rewards
create policy "Users can read own affiliate rewards"
  on public.affiliate_rewards for select
  using (referrer_id = public.app_user_id() or referred_user_id = public.app_user_id());

-- referrals
create policy "Users can read their own referrals"
  on public.referrals for select
  using (referrer_id = public.app_user_id() or referee_id = public.app_user_id());

-- payment_proofs
create policy "Users can read own payment proofs"
  on public.payment_proofs for select using (user_id = public.app_user_id());

create policy "Admins can read all payment proofs"
  on public.payment_proofs for select using (public.is_admin());

-- notifications
create policy "Users can read own notifications"
  on public.notifications for select using (user_id = public.app_user_id());

-- withdrawal_requests
create policy "Users can read own withdrawal requests"
  on public.withdrawal_requests for select using (user_id = public.app_user_id());

create policy "Admins can read all withdrawal requests"
  on public.withdrawal_requests for select using (public.is_admin());

-- revenue_events
create policy "Admins can read revenue events"
  on public.revenue_events for select using (public.is_admin());

-- savings_goals
create policy "Users can manage their savings goals"
  on public.savings_goals for all
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- merchant_deals
create policy "Anyone can read active merchant deals"
  on public.merchant_deals for select using (active = true);

-- merchant_deal_claims
create policy "Users can manage their deal claims"
  on public.merchant_deal_claims for all
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- learning_progress
create policy "Users can manage their learning progress"
  on public.learning_progress for all
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- security_events
create policy "Users can read and create their security events"
  on public.security_events for all
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- user_security_settings
create policy "Users can manage their security settings"
  on public.user_security_settings for all
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- support_beneficiaries
create policy "Users can manage support beneficiaries"
  on public.support_beneficiaries for all
  using (sponsor_id = public.app_user_id())
  with check (sponsor_id = public.app_user_id());

-- circles
create policy "Authenticated users can read all circles"
  on public.circles for select using (public.app_user_id() is not null);

create policy "Users can create circles"
  on public.circles for insert with check (creator_id = public.app_user_id());

create policy "Creator can update or delete circle"
  on public.circles for all using (creator_id = public.app_user_id());

create policy "Authenticated users can read circle members"
  on public.circle_members for select using (public.app_user_id() is not null);

create policy "Circle members can manage members"
  on public.circle_members for all using (public.app_user_id() is not null);

-- trust_tiers (public read)
create policy "Anyone can read trust tiers"
  on public.trust_tiers for select using (true);

-- bills
create policy "Authenticated users can read active bill categories"
  on public.bill_categories for select using (status = 'active');

create policy "Authenticated users can read active bill products"
  on public.bill_products for select using (is_active = true);

create policy "Users can read own bill transactions"
  on public.bill_transactions for select using (user_id = public.app_user_id());

create policy "Users can read own wallet ledger"
  on public.wallet_ledger for select using (user_id = public.app_user_id());

create policy "Admins can read provider logs"
  on public.provider_logs for select using (public.is_admin());

create policy "Admins can read provider webhooks"
  on public.provider_webhooks for select using (public.is_admin());

create policy "Users can read own dedicated account"
  on public.paystack_dedicated_accounts for select using (user_id = public.app_user_id());

create policy "Admins can read audit logs"
  on public.admin_audit_logs for select using (public.is_admin());

create policy "Users can read own virtual accounts"
  on public.virtual_accounts for select using (user_id = public.app_user_id());

create policy "Admins can read all virtual accounts"
  on public.virtual_accounts for select using (public.is_admin());

create policy "Users can read own wallet inflows"
  on public.wallet_inflows for select using (user_id = public.app_user_id());

create policy "Admins can read all wallet inflows"
  on public.wallet_inflows for select using (public.is_admin());

create policy "Users can read own bank transfers"
  on public.bank_transfers for select using (user_id = public.app_user_id());

create policy "Admins can read all bank transfers"
  on public.bank_transfers for select using (public.is_admin());

-- ─────────────────────────────────────────────
-- 7. Trust score functions (structural, kept in DB)
-- ─────────────────────────────────────────────

create schema if not exists private;

create or replace function private.me2u_refresh_trust_score(p_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_profile                 record;
  v_completed_loans         integer;
  v_active_loans            integer;
  v_wallet_activity         integer;
  v_referrals               integer;
  v_age_days                integer;
  v_verified_contacts       integer;
  v_successful_bills_30d    integer;
  v_bill_total_30d          integer;
  v_bill_failed_30d         integer;
  v_bill_activity_points    integer;
  v_bill_consistency_points integer;
  v_bill_failure_penalty    integer;
  v_score                   integer;
begin
  select p.* into v_profile from public.profiles p where p.id = p_user_id;
  if v_profile is null then return 0; end if;

  select count(*)::integer into v_completed_loans from public.loans l
    where (l.borrower_id = p_user_id or l.lender_id = p_user_id) and l.status = 'completed';
  select count(*)::integer into v_active_loans from public.loans l
    where (l.borrower_id = p_user_id or l.lender_id = p_user_id) and l.status = 'active';
  select count(*)::integer into v_wallet_activity from public.transactions t where t.user_id = p_user_id;
  select count(*)::integer into v_referrals from public.affiliate_rewards a where a.referrer_id = p_user_id;
  select count(*)::integer into v_successful_bills_30d from public.bill_transactions b
    where b.user_id = p_user_id and b.status = 'successful' and b.created_at >= now() - interval '30 days';
  select count(*)::integer into v_bill_total_30d from public.bill_transactions b
    where b.user_id = p_user_id and b.created_at >= now() - interval '30 days';
  select count(*)::integer into v_bill_failed_30d from public.bill_transactions b
    where b.user_id = p_user_id and b.status in ('failed','reversed','refunded')
      and b.created_at >= now() - interval '30 days';

  v_bill_activity_points    := case when v_successful_bills_30d >= 5 then 8 when v_successful_bills_30d >= 3 then 5 when v_successful_bills_30d > 0 then 2 else 0 end;
  v_bill_consistency_points := case when v_successful_bills_30d >= 1 and v_wallet_activity >= 5 then 2 else 0 end;
  v_bill_failure_penalty    := case when v_bill_total_30d >= 5 and (v_bill_failed_30d::numeric / v_bill_total_30d) > 0.20 then 3 else 0 end;

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
    case when v_completed_loans > 0 then 5 else 0 end +
    v_bill_activity_points + v_bill_consistency_points - v_bill_failure_penalty;

  v_score := least(100, greatest(0, v_score));
  update public.profiles set trust_score = v_score where id = p_user_id;
  return v_score;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.me2u_refresh_trust_score(new.user_id); return new; end; $$;

create or replace function private.me2u_refresh_trust_score_from_loan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.me2u_refresh_trust_score(new.borrower_id);
  if new.lender_id is not null then perform private.me2u_refresh_trust_score(new.lender_id); end if;
  return new;
end; $$;

create or replace function private.me2u_refresh_trust_score_from_affiliate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.me2u_refresh_trust_score(new.referrer_id); return new; end; $$;

create or replace function private.me2u_refresh_trust_score_from_bill()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.me2u_refresh_trust_score(new.user_id); return new; end; $$;

drop trigger if exists transactions_refresh_trust_score       on public.transactions;
drop trigger if exists loans_refresh_trust_score              on public.loans;
drop trigger if exists affiliate_rewards_refresh_trust_score  on public.affiliate_rewards;
drop trigger if exists bill_transactions_refresh_trust_score  on public.bill_transactions;

create trigger transactions_refresh_trust_score
  after insert on public.transactions
  for each row execute function private.me2u_refresh_trust_score_from_transaction();

create trigger loans_refresh_trust_score
  after insert or update of status on public.loans
  for each row execute function private.me2u_refresh_trust_score_from_loan();

create trigger affiliate_rewards_refresh_trust_score
  after insert on public.affiliate_rewards
  for each row execute function private.me2u_refresh_trust_score_from_affiliate();

create trigger bill_transactions_refresh_trust_score
  after insert or update of status on public.bill_transactions
  for each row execute function private.me2u_refresh_trust_score_from_bill();

-- ─────────────────────────────────────────────
-- 8. Referral reward trigger (kept in DB)
-- ─────────────────────────────────────────────

create or replace function private.me2u_handle_referral_repayment_reward()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_referrer_id          uuid;
  v_reward               numeric := 500;
  v_referee_kyc_verified boolean;
  v_updated              integer;
begin
  if new.status = 'completed' and old.status = 'active' then
    select kyc_verified into v_referee_kyc_verified from public.profiles where id = new.borrower_id;
    if not coalesce(v_referee_kyc_verified, false) then return new; end if;

    select referrer_id into v_referrer_id
    from public.referrals
    where referee_id = new.borrower_id and rewarded = false
    limit 1;

    if v_referrer_id is not null then
      update public.wallets set balance = balance + v_reward where user_id = v_referrer_id;
      get diagnostics v_updated = row_count;
      if v_updated = 1 then
        update public.referrals
        set rewarded = true, first_repayment_rewarded = true, first_withdrawal_rewarded = true
        where referee_id = new.borrower_id and referrer_id = v_referrer_id;

        insert into public.transactions (user_id, type, amount, description)
        values (v_referrer_id, 'deposit', v_reward, 'Referral reward — referee completed first loan and KYC');

        insert into public.notifications (user_id, title, message)
        values (v_referrer_id, 'Referral Reward Earned!',
          'You earned NGN 500 wallet credit because your referral completed their first loan repayment and KYC.');
      end if;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists referral_repayment_trigger on public.loans;
create trigger referral_repayment_trigger
  after update on public.loans
  for each row execute function private.me2u_handle_referral_repayment_reward();

-- ─────────────────────────────────────────────
-- 9. Seed data
-- ─────────────────────────────────────────────

insert into public.merchant_deals (merchant_name, category, title, description, discount_percent, country_code)
values
  ('Campus Food Partner', 'Food',      '5% off verified meal orders',    'Claim this deal and show it to a verified food vendor before wallet payment.',    5, 'NG'),
  ('CarePlus Pharmacy',  'Health',     'Medicine support discount',       'Use Me2U wallet records when buying from participating pharmacy partners.',        4, 'NG'),
  ('SkillBridge Training','Education', 'Training enrollment deal',        'Claim before paying for approved short courses or skill programs.',               7, 'NG'),
  ('PrintHub Business',  'Business',   'Print and design savings',        'Small businesses can claim this before print or document services.',              5, 'NG'),
  ('PhoneMart Verified', 'Devices',    'Phone accessory discount',        'Claim for verified phone accessories from participating merchants.',              3, 'NG')
on conflict do nothing;

insert into public.bill_categories (name, slug) values
  ('Airtime',   'airtime'),
  ('Data',      'data'),
  ('Electricity','electricity'),
  ('Cable TV',  'cable')
on conflict (slug) do update set name = excluded.name;

insert into public.bill_products (category_id, provider, service_id, variation_code, network, name, selling_price, is_active, metadata)
select c.id, 'vtpass', seed.service_id, seed.variation_code, seed.network, seed.name, seed.selling_price, seed.is_active, seed.metadata
from public.bill_categories c
join (values
  ('airtime', 'mtn',          null,              'MTN',    'MTN Airtime',      0::numeric, true, '{"amount_type":"open"}'::jsonb),
  ('airtime', 'airtel',       null,              'Airtel', 'Airtel Airtime',   0::numeric, true, '{"amount_type":"open"}'::jsonb),
  ('airtime', 'glo',          null,              'Glo',    'Glo Airtime',      0::numeric, true, '{"amount_type":"open"}'::jsonb),
  ('airtime', 'etisalat',     null,              '9mobile','9mobile Airtime',  0::numeric, true, '{"amount_type":"open"}'::jsonb),
  ('data',    'mtn-data',     'mtn-10mb-100',    'MTN',    'MTN Data Plan',    100::numeric, true, '{"sync_required":true}'::jsonb),
  ('data',    'airtel-data',  'airtel-default',  'Airtel', 'Airtel Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
  ('data',    'glo-data',     'glo-default',     'Glo',    'Glo Data Plan',    100::numeric, true, '{"sync_required":true}'::jsonb),
  ('data',    'etisalat-data','etisalat-default','9mobile','9mobile Data Plan',100::numeric, true, '{"sync_required":true}'::jsonb)
) as seed(slug, service_id, variation_code, network, name, selling_price, is_active, metadata)
on c.slug = seed.slug
where not exists (
  select 1 from public.bill_products p
  where p.category_id = c.id and p.provider = 'vtpass'
    and p.service_id = seed.service_id
    and coalesce(p.variation_code,'') = coalesce(seed.variation_code,'')
);
