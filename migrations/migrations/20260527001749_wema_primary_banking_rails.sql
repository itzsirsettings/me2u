do $$
begin
  alter type public.bill_provider add value if not exists 'wema';
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter type public.wallet_ledger_source add value if not exists 'bank_transfer';
  alter type public.wallet_ledger_source add value if not exists 'transfer';
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.virtual_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'wema',
  provider_reference text,
  account_name text,
  account_number text,
  bank_name text,
  bank_code text,
  currency text not null default 'NGN',
  status text not null default 'pending',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, user_id),
  unique (provider, account_number)
);

create table if not exists public.wallet_inflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid references public.wallets(id),
  virtual_account_id uuid references public.virtual_accounts(id),
  provider text not null default 'wema',
  provider_reference text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending',
  sender_name text,
  sender_account_number text,
  narration text,
  credited_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid references public.wallets(id),
  provider text not null default 'wema',
  reference text not null unique,
  provider_reference text,
  amount numeric(14, 2) not null check (amount > 0),
  bank_code text not null,
  account_number text not null,
  account_name text,
  narration text,
  status text not null default 'initiated',
  failure_reason text,
  provider_response jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists virtual_accounts_set_updated_at on public.virtual_accounts;
create trigger virtual_accounts_set_updated_at
before update on public.virtual_accounts
for each row execute function public.set_updated_at();

drop trigger if exists wallet_inflows_set_updated_at on public.wallet_inflows;
create trigger wallet_inflows_set_updated_at
before update on public.wallet_inflows
for each row execute function public.set_updated_at();

drop trigger if exists bank_transfers_set_updated_at on public.bank_transfers;
create trigger bank_transfers_set_updated_at
before update on public.bank_transfers
for each row execute function public.set_updated_at();

alter table public.virtual_accounts enable row level security;
alter table public.wallet_inflows enable row level security;
alter table public.bank_transfers enable row level security;

grant select on public.virtual_accounts, public.wallet_inflows, public.bank_transfers to authenticated;
grant all on public.virtual_accounts, public.wallet_inflows, public.bank_transfers to service_role;

drop policy if exists "Users can read own virtual accounts" on public.virtual_accounts;
create policy "Users can read own virtual accounts"
on public.virtual_accounts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own wallet inflows" on public.wallet_inflows;
create policy "Users can read own wallet inflows"
on public.wallet_inflows for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own bank transfers" on public.bank_transfers;
create policy "Users can read own bank transfers"
on public.bank_transfers for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all virtual accounts" on public.virtual_accounts;
create policy "Admins can read all virtual accounts"
on public.virtual_accounts for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read all wallet inflows" on public.wallet_inflows;
create policy "Admins can read all wallet inflows"
on public.wallet_inflows for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can read all bank transfers" on public.bank_transfers;
create policy "Admins can read all bank transfers"
on public.bank_transfers for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create or replace function private.me2u_credit_wallet_inflow(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Wema virtual account funding',
  p_metadata jsonb default '{}'::jsonb
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

  if nullif(trim(coalesce(p_reference, '')), '') is null then
    raise exception 'Wallet inflow reference is required.';
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
    description,
    metadata
  )
  values (
    p_user_id,
    v_wallet.id,
    'credit',
    'bank_transfer',
    v_amount,
    v_wallet.balance,
    v_wallet.balance + v_amount,
    trim(p_reference),
    left(coalesce(p_description, 'Virtual account funding'), 180),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_ledger;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'deposit', v_amount, left(coalesce(p_description, 'Virtual account funding'), 180));

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

create or replace function public.me2u_credit_wallet_inflow(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Wema virtual account funding',
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_ledger
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_credit_wallet_inflow(p_user_id, p_amount, p_reference, p_description, p_metadata);
$$;

revoke execute on function private.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function private.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) to service_role;

revoke execute on function public.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.me2u_credit_wallet_inflow(uuid, numeric, text, text, jsonb) to service_role;
