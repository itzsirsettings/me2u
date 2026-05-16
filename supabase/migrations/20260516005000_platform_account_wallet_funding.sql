create or replace function private.lendpeer_fund_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount numeric(14, 2);
  v_reference text;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  v_reference := nullif(trim(coalesce(p_reference, '')), '');

  if v_reference is null or length(v_reference) < 4 or length(v_reference) > 120 then
    raise exception 'Enter a valid payment reference.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'deposit',
    v_amount,
    'Wallet funding via platform account transfer: ' || v_reference
  );
end;
$$;

create or replace function public.lendpeer_fund_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.lendpeer_fund_wallet(p_user_id, p_amount, p_reference);
$$;

revoke execute on function private.lendpeer_fund_wallet(uuid, numeric, text) from public, anon, authenticated;
grant execute on function private.lendpeer_fund_wallet(uuid, numeric, text) to service_role;

revoke execute on function public.lendpeer_fund_wallet(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.lendpeer_fund_wallet(uuid, numeric, text) to service_role;
