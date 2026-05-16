create or replace function private.lendpeer_withdraw_wallet(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal_amount numeric;
  v_updated integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_withdrawal_amount := round(p_amount, 2);

  update public.wallets
  set balance = balance - v_withdrawal_amount
  where user_id = p_user_id
    and balance >= v_withdrawal_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_withdrawal_amount,
    'Withdrawal to Bank Account'
  );
end;
$$;
