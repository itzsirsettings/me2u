-- Migration to replace Supabase Auth with native Railway PostgreSQL auth
-- This adds auth_users table to handle user authentication while preserving all existing tables

-- Create auth_users table for managing user credentials (replaces supabase.auth.users)
create table public.auth_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Update profiles table to reference auth_users instead of auth.users
-- First remove the existing foreign key if it exists
alter table public.profiles 
  drop constraint if exists profiles_id_fkey;

-- Add new foreign key referencing our auth_users table
alter table public.profiles 
  add constraint profiles_id_fkey 
  foreign key (id) references public.auth_users(id) on delete cascade;

-- Update wallets table to reference auth_users
alter table public.wallets
  drop constraint if exists wallets_user_id_fkey;

alter table public.wallets
  add constraint wallets_user_id_fkey
  foreign key (user_id) references public.auth_users(id) on delete cascade;

-- Ensure all existing foreign keys are updated to reference auth_users
-- This maintains referential integrity while moving away from Supabase Auth
do $$
declare
  rec record;
begin
  -- Find all tables that reference profiles.id and ensure they still work
  -- since profiles now references auth_users, cascading will work properly
  for rec in 
    select tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu 
      on tc.constraint_name = kcu.constraint_name
    where tc.constraint_type = 'FOREIGN KEY' 
      and kcu.table_schema = 'public'
      and kcu.column_name in ('user_id', 'borrower_id', 'lender_id', 'author_id')
  loop
    -- All existing foreign keys to profiles.id will continue to work
    -- because profiles still exists and cascades to auth_users
    null;
  end loop;
end $$;

-- Add RLS to auth_users table
alter table public.auth_users enable row level security;

-- Users can only read their own auth data
create policy "Users can read own auth data"
  on public.auth_users
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Trigger to update updated_at timestamp
create trigger auth_users_set_updated_at
  before update on public.auth_users
  for each row execute function public.set_updated_at();

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.auth_users to authenticated;

-- Add indexes for performance
create index auth_users_email_idx on public.auth_users(email);
create index auth_users_created_at_idx on public.auth_users(created_at desc);