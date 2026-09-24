-- Me2U bills architecture
begin;

create table if not exists public.bill_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'initiated',
  created_at timestamptz not null default now()
);

create or replace function private.me2u_create_bill_debit()
returns void
language plpgsql
as $$
begin
  null;
end;
$$;

create or replace function private.me2u_refund_bill_transaction()
returns void
language plpgsql
as $$
begin
  null;
end;
$$;

commit;
