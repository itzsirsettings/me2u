-- Add an admin-reviewed withdrawal queue so wallet debits happen only after
-- operations approval.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'withdrawal_request_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.withdrawal_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end;
$$;

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  bank_name text,
  account_number text,
  status public.withdrawal_request_status not null default 'pending',
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint withdrawal_requests_processed_state check (
    (status = 'pending' and processed_at is null and processed_by is null)
    or
    (status <> 'pending' and processed_at is not null)
  )
);

drop trigger if exists withdrawal_requests_set_updated_at on public.withdrawal_requests;
create trigger withdrawal_requests_set_updated_at
before update on public.withdrawal_requests
for each row execute function public.set_updated_at();

alter table public.withdrawal_requests enable row level security;

grant select, insert, update on public.withdrawal_requests to authenticated;
grant all on public.withdrawal_requests to service_role;

drop policy if exists "Users can read own withdrawal requests" on public.withdrawal_requests;
create policy "Users can read own withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own pending withdrawal requests" on public.withdrawal_requests;
create policy "Users can create own pending withdrawal requests"
on public.withdrawal_requests
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and processed_by is null
  and processed_at is null
);

drop policy if exists "Admins can read all withdrawal requests" on public.withdrawal_requests;
create policy "Admins can read all withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

drop policy if exists "Admins can update withdrawal requests" on public.withdrawal_requests;
create policy "Admins can update withdrawal requests"
on public.withdrawal_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

create index if not exists withdrawal_requests_status_created_at_idx
on public.withdrawal_requests (status, created_at desc);

create index if not exists withdrawal_requests_user_id_created_at_idx
on public.withdrawal_requests (user_id, created_at desc);

create or replace function public.admin_approve_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_admin_id uuid := (select auth.uid());
  v_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can approve withdrawal requests.';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Withdrawal request is not pending.';
  end if;

  perform private.me2u_withdraw_wallet(v_request.user_id, v_request.amount);

  update public.withdrawal_requests
  set status = 'approved',
      processed_by = v_admin_id,
      processed_at = now(),
      admin_note = 'Approved by admin'
  where id = p_request_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Approved',
    'Your withdrawal request of NGN ' || v_request.amount || ' has been approved.'
  );
end;
$$;

create or replace function public.admin_reject_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_admin_id uuid := (select auth.uid());
  v_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  )
  into v_admin;

  if not v_admin then
    raise exception 'Only admins can reject withdrawal requests.';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Withdrawal request is not pending.';
  end if;

  update public.withdrawal_requests
  set status = 'rejected',
      processed_by = v_admin_id,
      processed_at = now(),
      admin_note = 'Rejected by admin'
  where id = p_request_id;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Rejected',
    'Your withdrawal request of NGN ' || v_request.amount || ' was rejected. Please review your bank details or contact support.'
  );
end;
$$;

revoke execute on function public.admin_approve_withdrawal_request(uuid) from public, anon;
revoke execute on function public.admin_reject_withdrawal_request(uuid) from public, anon;
grant execute on function public.admin_approve_withdrawal_request(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal_request(uuid) to authenticated;
