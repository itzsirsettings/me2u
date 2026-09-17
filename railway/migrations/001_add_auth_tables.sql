-- ============================================================
-- Railway PostgreSQL Auth Setup (001)
-- Replaces Supabase-specific auth with native PostgreSQL tables.
-- Helper functions defined here so all subsequent migrations can use them.
-- ============================================================

-- ─── 0. Extensions ───
create extension if not exists pgcrypto;

-- ─── 1. RLS & admin helper functions (defined early, idempotent) ───

create or replace function public.app_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

create or replace function public.is_admin()
returns boolean language plpgsql stable as $$
begin
  return exists (
    select 1 from public.profiles
    where id = public.app_user_id() and role = 'admin'
  );
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── 2. auth_users table (replaces supabase.auth.users) ───

create table if not exists public.auth_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  password_hash   text not null,
  first_name      text not null,
  last_name       text not null,
  phone           text,
  email_verified  boolean not null default false,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz,
  updated_at      timestamptz not null default now()
);

create index if not exists auth_users_email_idx        on public.auth_users(email);
create index if not exists auth_users_created_at_idx   on public.auth_users(created_at desc);

create trigger auth_users_set_updated_at
  before update on public.auth_users
  for each row execute function public.set_updated_at();

-- ─── 3. RLS on auth_users (uses app_user_id(), no Supabase roles) ───

alter table public.auth_users enable row level security;

drop policy if exists "Users can read own auth data" on public.auth_users;
create policy "Users can read own auth data"
  on public.auth_users for select
  using (id = public.app_user_id());

-- ─── 4. Retarget FKs: profiles.id → auth_users.id ───

-- Note: on a fresh DB profiles does not exist yet; 002 creates it
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    alter table public.profiles
      drop constraint if exists profiles_id_fkey;
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references public.auth_users(id) on delete cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'wallets') then
    alter table public.wallets
      drop constraint if exists wallets_user_id_fkey;
    alter table public.wallets
      add constraint wallets_user_id_fkey
      foreign key (user_id) references public.auth_users(id) on delete cascade;
  end if;
end $$;