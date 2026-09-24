-- Referral reward lifecycle
begin;

create table if not exists public.referral_reward_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  source_user_id uuid,
  reward_type text not null,
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  UNIQUE (recipient_id, source_user_id, reward_type)
);

create unique index if not exists referral_reward_events_unique_idx
  on public.referral_reward_events (recipient_id, source_user_id, reward_type);

insert into public.referral_reward_events (recipient_id, source_user_id, reward_type, amount)
values
  (gen_random_uuid(), null, 'direct_signup', 1500),
  (gen_random_uuid(), null, 'new_member_signup', 500),
  (gen_random_uuid(), null, 'first_withdrawal', 250),
  (gen_random_uuid(), null, 'first_repayment', 250),
  (gen_random_uuid(), null, 'indirect_signup', 500)
on conflict do nothing;

commit;
