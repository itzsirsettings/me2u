create extension if not exists pgcrypto;

create type public.transaction_type as enum (
  'deposit',
  'withdrawal',
  'loan_disbursed',
  'loan_repayment',
  'investment',
  'repayment_received'
);

create type public.marketplace_item_type as enum (
  'borrow_request',
  'lending_offer'
);

create type public.marketplace_status as enum (
  'active',
  'funded',
  'cancelled'
);

create type public.loan_status as enum (
  'active',
  'completed'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  nin_hash text not null unique,
  nin_last4 text not null,
  kyc_verified boolean not null default false,
  trust_score integer not null default 85 check (trust_score between 0 and 100),
  bank_name text,
  account_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  locked numeric(14, 2) not null default 0 check (locked >= 0),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  type public.marketplace_item_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  rate numeric(6, 2) not null check (rate > 0),
  days integer not null check (days > 0),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  trust_score integer not null default 85 check (trust_score between 0 and 100),
  status public.marketplace_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  rate numeric(6, 2) not null check (rate > 0),
  days integer not null check (days > 0),
  status public.loan_status not null default 'active',
  start_date timestamptz not null default now(),
  due_date timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.loans enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.wallets to authenticated;
grant select, insert on public.transactions to authenticated;
grant select, insert, update on public.marketplace_items to authenticated;
grant select, insert, update on public.loans to authenticated;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read own wallet"
on public.wallets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update own wallet"
on public.wallets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read own transactions"
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own transactions"
on public.transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can read active marketplace"
on public.marketplace_items
for select
to authenticated
using (status = 'active' or author_id = (select auth.uid()));

create policy "Users can create own marketplace listings"
on public.marketplace_items
for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Users can fund active marketplace listings"
on public.marketplace_items
for update
to authenticated
using (status = 'active')
with check (status in ('funded', 'cancelled'));

create policy "Users can read own loans"
on public.loans
for select
to authenticated
using (
  (select auth.uid()) = borrower_id
  or (select auth.uid()) = lender_id
);

create policy "Users can create loans they participate in"
on public.loans
for insert
to authenticated
with check (
  (select auth.uid()) = borrower_id
  or (select auth.uid()) = lender_id
);

create policy "Borrowers can mark own loan complete"
on public.loans
for update
to authenticated
using ((select auth.uid()) = borrower_id)
with check ((select auth.uid()) = borrower_id);

create index profiles_nin_hash_idx on public.profiles(nin_hash);
create index transactions_user_id_created_at_idx on public.transactions(user_id, created_at desc);
create index marketplace_items_status_created_at_idx on public.marketplace_items(status, created_at desc);
create index loans_borrower_id_idx on public.loans(borrower_id);
create index loans_lender_id_idx on public.loans(lender_id);
