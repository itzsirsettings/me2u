-- Licensed partner revenue model
begin;

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  amount numeric(14,2) not null default 0,
  user_id uuid,
  description text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists partner_offer_consent_at timestamptz,
  add column if not exists boosted_until timestamptz;

insert into public.revenue_events (type, amount, user_id, description)
values ('withdrawal_fee', 100, null, 'withdrawal fee'),
       ('marketplace_boost', 100, null, 'marketplace boost')
on conflict do nothing;

commit;
