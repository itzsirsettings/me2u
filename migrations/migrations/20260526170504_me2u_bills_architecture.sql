create extension if not exists pgcrypto;

do $$
begin
  alter type public.transaction_type add value if not exists 'bill_payment';
  alter type public.transaction_type add value if not exists 'bill_refund';
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.bill_record_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.bill_provider as enum ('vtpass', 'flutterwave');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.bill_transaction_status as enum (
    'initiated',
    'debited',
    'pending',
    'successful',
    'failed',
    'reversed',
    'refunded'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.wallet_ledger_transaction_type as enum ('credit', 'debit', 'refund', 'reversal');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.wallet_ledger_source as enum (
    'deposit',
    'loan',
    'bill_payment',
    'repayment',
    'admin_adjustment',
    'withdrawal',
    'referral'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.wallets
add column if not exists id uuid default gen_random_uuid();

update public.wallets
set id = gen_random_uuid()
where id is null;

alter table public.wallets
alter column id set not null;

create unique index if not exists wallets_id_key
on public.wallets (id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallets_id_unique'
      and conrelid = 'public.wallets'::regclass
  ) then
    alter table public.wallets
    add constraint wallets_id_unique unique using index wallets_id_key;
  end if;
end;
$$;

create table if not exists public.bill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.bill_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.bill_categories(id) on delete cascade,
  provider public.bill_provider not null default 'vtpass',
  service_id text not null,
  variation_code text,
  network text,
  name text not null,
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14, 2) not null default 0 check (selling_price >= 0),
  commission numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id),
  product_id uuid references public.bill_products(id),
  reference text not null unique,
  idempotency_key text,
  provider public.bill_provider not null default 'vtpass',
  provider_reference text,
  category text not null,
  service_id text not null,
  variation_code text,
  network text,
  customer_identifier text not null,
  amount numeric(14, 2) not null check (amount > 0),
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14, 2) not null check (selling_price > 0),
  profit numeric(14, 2) not null default 0,
  status public.bill_transaction_status not null default 'initiated',
  provider_response jsonb,
  failure_reason text,
  requery_count integer not null default 0 check (requery_count >= 0),
  next_requery_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bill_transactions_user_idempotency_key_idx
on public.bill_transactions (user_id, idempotency_key)
where idempotency_key is not null;

create index if not exists bill_transactions_user_created_idx
on public.bill_transactions (user_id, created_at desc);

create index if not exists bill_transactions_status_requery_idx
on public.bill_transactions (status, next_requery_at)
where status = 'pending';

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id),
  transaction_type public.wallet_ledger_transaction_type not null,
  source public.wallet_ledger_source not null,
  amount numeric(14, 2) not null check (amount > 0),
  balance_before numeric(14, 2) not null check (balance_before >= 0),
  balance_after numeric(14, 2) not null check (balance_after >= 0),
  reference text not null unique,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx
on public.wallet_ledger (user_id, created_at desc);

create table if not exists public.provider_logs (
  id uuid primary key default gen_random_uuid(),
  provider public.bill_provider not null,
  endpoint text not null,
  reference text,
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  created_at timestamptz not null default now()
);

create index if not exists provider_logs_reference_idx
on public.provider_logs (reference, created_at desc);

create table if not exists public.provider_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  reference text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.paystack_dedicated_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_code text,
  dedicated_account_id text,
  account_name text,
  account_number text,
  bank_name text,
  bank_slug text,
  assignment_payload jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (account_number)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists bill_categories_set_updated_at on public.bill_categories;
create trigger bill_categories_set_updated_at
before update on public.bill_categories
for each row execute function public.set_updated_at();

drop trigger if exists bill_products_set_updated_at on public.bill_products;
create trigger bill_products_set_updated_at
before update on public.bill_products
for each row execute function public.set_updated_at();

drop trigger if exists bill_transactions_set_updated_at on public.bill_transactions;
create trigger bill_transactions_set_updated_at
before update on public.bill_transactions
for each row execute function public.set_updated_at();

drop trigger if exists paystack_dedicated_accounts_set_updated_at on public.paystack_dedicated_accounts;
create trigger paystack_dedicated_accounts_set_updated_at
before update on public.paystack_dedicated_accounts
for each row execute function public.set_updated_at();

alter table public.bill_categories enable row level security;
alter table public.bill_products enable row level security;
alter table public.bill_transactions enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.provider_logs enable row level security;
alter table public.provider_webhooks enable row level security;
alter table public.paystack_dedicated_accounts enable row level security;
alter table public.admin_audit_logs enable row level security;

grant select on public.bill_categories, public.bill_products to authenticated;
grant select on public.bill_transactions, public.wallet_ledger, public.paystack_dedicated_accounts to authenticated;
grant all on public.bill_categories, public.bill_products, public.bill_transactions, public.wallet_ledger, public.provider_logs, public.provider_webhooks, public.paystack_dedicated_accounts, public.admin_audit_logs to service_role;

drop policy if exists "Authenticated users can read active bill categories" on public.bill_categories;
create policy "Authenticated users can read active bill categories"
on public.bill_categories for select to authenticated
using (status = 'active');

drop policy if exists "Authenticated users can read active bill products" on public.bill_products;
create policy "Authenticated users can read active bill products"
on public.bill_products for select to authenticated
using (is_active = true);

drop policy if exists "Users can read own bill transactions" on public.bill_transactions;
create policy "Users can read own bill transactions"
on public.bill_transactions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own wallet ledger" on public.wallet_ledger;
create policy "Users can read own wallet ledger"
on public.wallet_ledger for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own dedicated account" on public.paystack_dedicated_accounts;
create policy "Users can read own dedicated account"
on public.paystack_dedicated_accounts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read provider logs" on public.provider_logs;
create policy "Admins can read provider logs"
on public.provider_logs for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read provider webhooks" on public.provider_webhooks;
create policy "Admins can read provider webhooks"
on public.provider_webhooks for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
on public.admin_audit_logs for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

insert into public.bill_categories (name, slug)
values
  ('Airtime', 'airtime'),
  ('Data', 'data'),
  ('Electricity', 'electricity'),
  ('Cable TV', 'cable')
on conflict (slug) do update
set name = excluded.name,
    status = bill_categories.status;

insert into public.bill_products (category_id, provider, service_id, variation_code, network, name, selling_price, is_active, metadata)
select c.id, 'vtpass', seed.service_id, seed.variation_code, seed.network, seed.name, seed.selling_price, seed.is_active, seed.metadata
from public.bill_categories c
join (
  values
    ('airtime', 'mtn', null, 'MTN', 'MTN Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('airtime', 'airtel', null, 'Airtel', 'Airtel Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('airtime', 'glo', null, 'Glo', 'Glo Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('airtime', 'etisalat', null, '9mobile', '9mobile Airtime', 0::numeric, true, '{"amount_type":"open"}'::jsonb),
    ('data', 'mtn-data', 'mtn-10mb-100', 'MTN', 'MTN Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
    ('data', 'airtel-data', 'airtel-default', 'Airtel', 'Airtel Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
    ('data', 'glo-data', 'glo-default', 'Glo', 'Glo Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb),
    ('data', 'etisalat-data', 'etisalat-default', '9mobile', '9mobile Data Plan', 100::numeric, true, '{"sync_required":true}'::jsonb)
) as seed(slug, service_id, variation_code, network, name, selling_price, is_active, metadata)
on c.slug = seed.slug
where not exists (
  select 1
  from public.bill_products p
  where p.category_id = c.id
    and p.provider = 'vtpass'
    and p.service_id = seed.service_id
    and coalesce(p.variation_code, '') = coalesce(seed.variation_code, '')
);

create or replace function private.me2u_create_bill_debit(
  p_user_id uuid,
  p_product_id uuid,
  p_reference text,
  p_idempotency_key text,
  p_amount numeric,
  p_customer_identifier text
)
returns public.bill_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product record;
  v_wallet record;
  v_existing public.bill_transactions%rowtype;
  v_amount numeric(14, 2);
  v_balance_before numeric(14, 2);
  v_balance_after numeric(14, 2);
  v_transaction public.bill_transactions%rowtype;
begin
  if p_idempotency_key is not null then
    select *
    into v_existing
    from public.bill_transactions
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if v_existing.id is not null then
      return v_existing;
    end if;
  end if;

  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  if nullif(trim(coalesce(p_reference, '')), '') is null then
    raise exception 'Transaction reference is required.';
  end if;

  if nullif(trim(coalesce(p_customer_identifier, '')), '') is null then
    raise exception 'Customer identifier is required.';
  end if;

  select
    p.*,
    c.slug as category_slug
  into v_product
  from public.bill_products p
  join public.bill_categories c on c.id = p.category_id
  where p.id = p_product_id
    and p.is_active = true
    and c.status = 'active';

  if v_product.id is null then
    raise exception 'Bill product is unavailable.';
  end if;

  if v_product.selling_price > 0 and v_amount <> v_product.selling_price then
    raise exception 'Amount does not match selected product price.';
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  if (v_wallet.balance - v_wallet.locked) < v_amount then
    raise exception 'Insufficient available wallet balance.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_amount;

  update public.wallets
  set balance = v_balance_after
  where user_id = p_user_id;

  insert into public.bill_transactions (
    user_id,
    wallet_id,
    product_id,
    reference,
    idempotency_key,
    provider,
    category,
    service_id,
    variation_code,
    network,
    customer_identifier,
    amount,
    cost_price,
    selling_price,
    profit,
    status,
    next_requery_at
  )
  values (
    p_user_id,
    v_wallet.id,
    v_product.id,
    trim(p_reference),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    v_product.provider,
    v_product.category_slug,
    v_product.service_id,
    v_product.variation_code,
    v_product.network,
    left(trim(p_customer_identifier), 120),
    v_amount,
    coalesce(v_product.cost_price, 0),
    v_amount,
    greatest(0, v_amount - coalesce(nullif(v_product.cost_price, 0), v_amount)),
    'debited',
    now() + interval '5 minutes'
  )
  returning * into v_transaction;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description,
    metadata
  )
  values (
    p_user_id,
    v_wallet.id,
    'debit',
    'bill_payment',
    v_amount,
    v_balance_before,
    v_balance_after,
    trim(p_reference) || ':debit',
    'Bill payment debit for ' || v_product.name,
    jsonb_build_object('bill_reference', trim(p_reference), 'product_id', v_product.id)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'bill_payment', v_amount, 'Bill payment: ' || v_product.name);

  return v_transaction;
end;
$$;

create or replace function public.me2u_create_bill_debit(
  p_user_id uuid,
  p_product_id uuid,
  p_reference text,
  p_idempotency_key text,
  p_amount numeric,
  p_customer_identifier text
)
returns public.bill_transactions
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_create_bill_debit(
    p_user_id,
    p_product_id,
    p_reference,
    p_idempotency_key,
    p_amount,
    p_customer_identifier
  );
$$;

create or replace function private.me2u_refund_bill_transaction(
  p_reference text,
  p_reason text default null
)
returns public.bill_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bill public.bill_transactions%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(14, 2);
  v_balance_after numeric(14, 2);
begin
  select *
  into v_bill
  from public.bill_transactions
  where reference = trim(p_reference)
  for update;

  if v_bill.id is null then
    raise exception 'Bill transaction not found.';
  end if;

  if v_bill.status = 'refunded' then
    return v_bill;
  end if;

  if exists (
    select 1
    from public.wallet_ledger
    where reference = v_bill.reference || ':refund'
  ) then
    update public.bill_transactions
    set status = 'refunded',
        refunded_at = coalesce(refunded_at, now()),
        failure_reason = coalesce(p_reason, failure_reason)
    where id = v_bill.id
    returning * into v_bill;

    return v_bill;
  end if;

  select *
  into v_wallet
  from public.wallets
  where id = v_bill.wallet_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_bill.selling_price;

  update public.wallets
  set balance = v_balance_after
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description,
    metadata
  )
  values (
    v_bill.user_id,
    v_bill.wallet_id,
    'refund',
    'bill_payment',
    v_bill.selling_price,
    v_balance_before,
    v_balance_after,
    v_bill.reference || ':refund',
    'Automatic refund for failed bill payment',
    jsonb_build_object('bill_reference', v_bill.reference, 'reason', p_reason)
  );

  insert into public.transactions (user_id, type, amount, description)
  values (v_bill.user_id, 'bill_refund', v_bill.selling_price, 'Refund for bill payment ' || v_bill.reference);

  insert into public.notifications (user_id, title, message)
  values (
    v_bill.user_id,
    'Bill Payment Refunded',
    'Your failed bill payment of NGN ' || v_bill.selling_price || ' has been refunded to your wallet.'
  );

  update public.bill_transactions
  set status = 'refunded',
      refunded_at = now(),
      failure_reason = coalesce(p_reason, failure_reason)
  where id = v_bill.id
  returning * into v_bill;

  perform private.me2u_refresh_trust_score(v_bill.user_id);

  return v_bill;
end;
$$;

create or replace function public.me2u_refund_bill_transaction(
  p_reference text,
  p_reason text default null
)
returns public.bill_transactions
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_refund_bill_transaction(p_reference, p_reason);
$$;

create or replace function private.me2u_credit_wallet_funding(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Paystack dedicated account funding'
)
returns public.wallet_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.wallet_ledger%rowtype;
  v_wallet public.wallets%rowtype;
  v_amount numeric(14, 2);
  v_ledger public.wallet_ledger%rowtype;
begin
  v_amount := round(coalesce(p_amount, 0), 2);

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select *
  into v_existing
  from public.wallet_ledger
  where reference = trim(p_reference);

  if v_existing.id is not null then
    return v_existing;
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    source,
    amount,
    balance_before,
    balance_after,
    reference,
    description
  )
  values (
    p_user_id,
    v_wallet.id,
    'credit',
    'deposit',
    v_amount,
    v_wallet.balance,
    v_wallet.balance + v_amount,
    trim(p_reference),
    left(coalesce(p_description, 'Wallet funding'), 180)
  )
  returning * into v_ledger;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'deposit', v_amount, left(coalesce(p_description, 'Wallet funding'), 180));

  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    'Wallet Funded',
    'NGN ' || v_amount || ' has been added to your Me2U wallet.'
  );

  perform private.me2u_refresh_trust_score(p_user_id);

  return v_ledger;
end;
$$;

create or replace function public.me2u_credit_wallet_funding(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Paystack dedicated account funding'
)
returns public.wallet_ledger
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_credit_wallet_funding(p_user_id, p_amount, p_reference, p_description);
$$;

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
  v_successful_bills_30d integer;
  v_bill_total_30d integer;
  v_bill_failed_30d integer;
  v_bill_activity_points integer;
  v_bill_consistency_points integer;
  v_bill_failure_penalty integer;
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

  select count(*)::integer
  into v_successful_bills_30d
  from public.bill_transactions b
  where b.user_id = p_user_id
    and b.status = 'successful'
    and b.created_at >= now() - interval '30 days';

  select count(*)::integer
  into v_bill_total_30d
  from public.bill_transactions b
  where b.user_id = p_user_id
    and b.created_at >= now() - interval '30 days';

  select count(*)::integer
  into v_bill_failed_30d
  from public.bill_transactions b
  where b.user_id = p_user_id
    and b.status in ('failed', 'reversed', 'refunded')
    and b.created_at >= now() - interval '30 days';

  v_bill_activity_points :=
    case
      when v_successful_bills_30d >= 5 then 8
      when v_successful_bills_30d >= 3 then 5
      when v_successful_bills_30d > 0 then 2
      else 0
    end;

  v_bill_consistency_points := case when v_successful_bills_30d >= 1 and v_wallet_activity >= 5 then 2 else 0 end;
  v_bill_failure_penalty := case when v_bill_total_30d >= 5 and (v_bill_failed_30d::numeric / v_bill_total_30d) > 0.20 then 3 else 0 end;

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
    v_bill_activity_points +
    v_bill_consistency_points -
    v_bill_failure_penalty;

  v_score := least(100, greatest(0, v_score));

  update public.profiles
  set trust_score = v_score
  where id = p_user_id;

  return v_score;
end;
$$;

create or replace function private.me2u_refresh_trust_score_from_bill()
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

drop trigger if exists bill_transactions_refresh_trust_score on public.bill_transactions;
create trigger bill_transactions_refresh_trust_score
after insert or update of status on public.bill_transactions
for each row execute function private.me2u_refresh_trust_score_from_bill();

revoke execute on function private.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function private.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) to service_role;

revoke execute on function public.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.me2u_create_bill_debit(uuid, uuid, text, text, numeric, text) to service_role;

revoke execute on function private.me2u_refund_bill_transaction(text, text) from public, anon, authenticated;
grant execute on function private.me2u_refund_bill_transaction(text, text) to service_role;

revoke execute on function public.me2u_refund_bill_transaction(text, text) from public, anon, authenticated;
grant execute on function public.me2u_refund_bill_transaction(text, text) to service_role;

revoke execute on function private.me2u_credit_wallet_funding(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function private.me2u_credit_wallet_funding(uuid, numeric, text, text) to service_role;

revoke execute on function public.me2u_credit_wallet_funding(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.me2u_credit_wallet_funding(uuid, numeric, text, text) to service_role;
