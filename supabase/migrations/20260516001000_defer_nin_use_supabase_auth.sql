alter table public.profiles
alter column nin_hash drop not null,
alter column nin_last4 drop not null;

create or replace function private.lendpeer_create_marketplace_item(
  p_user_id uuid,
  p_type public.marketplace_item_type,
  p_amount numeric,
  p_rate numeric,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author_name text;
  v_trust_score integer;
begin
  if p_amount is null or p_amount < 1000 then
    raise exception 'Amount must be at least 1000.';
  end if;

  if p_rate is null or p_rate <= 0 or p_rate > 50 then
    raise exception 'Interest rate must be between 1 and 50 percent.';
  end if;

  if p_days is null or p_days < 7 or p_days > 365 then
    raise exception 'Duration must be between 7 and 365 days.';
  end if;

  select first_name, trust_score
  into v_author_name, v_trust_score
  from public.profiles
  where id = p_user_id;

  if v_author_name is null then
    raise exception 'Profile not found.';
  end if;

  insert into public.marketplace_items (
    type,
    amount,
    rate,
    days,
    author_id,
    author_name,
    trust_score,
    status
  )
  values (
    p_type,
    round(p_amount, 2),
    round(p_rate, 2),
    p_days,
    p_user_id,
    v_author_name,
    v_trust_score,
    'active'
  );
end;
$$;
