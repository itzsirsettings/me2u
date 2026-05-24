create or replace function private.me2u_pay_bill(
  p_user_id uuid,
  p_amount numeric,
  p_service_label text,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount numeric;
  v_label text;
  v_detail text;
  v_updated integer;
begin
  v_amount := round(coalesce(p_amount, 0), 2);
  v_label := nullif(left(trim(coalesce(p_service_label, 'Bill Payment')), 80), '');
  v_detail := nullif(left(trim(coalesce(p_detail, '')), 160), '');

  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  if v_label is null then
    v_label := 'Bill Payment';
  end if;

  update public.wallets
  set balance = balance - v_amount
  where user_id = p_user_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient wallet balance.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'withdrawal',
    v_amount,
    'Paid ' || v_label || coalesce(' (' || v_detail || ')', '')
  );
end;
$$;

create or replace function public.me2u_pay_bill(
  p_user_id uuid,
  p_amount numeric,
  p_service_label text,
  p_detail text default null
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_pay_bill(p_user_id, p_amount, p_service_label, p_detail);
$$;

revoke execute on function private.me2u_pay_bill(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function private.me2u_pay_bill(uuid, numeric, text, text) to service_role;

revoke execute on function public.me2u_pay_bill(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.me2u_pay_bill(uuid, numeric, text, text) to service_role;

revoke insert, update on public.referrals from authenticated;
revoke execute on function public.me2u_record_referral(uuid, uuid) from public, anon, authenticated;
grant execute on function public.me2u_record_referral(uuid, uuid) to service_role;

create or replace function public.me2u_get_referral_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_referrals integer;
  v_pending_withdrawal integer;
  v_pending_repayment integer;
  v_earned_withdrawal integer;
  v_earned_repayment integer;
  v_total_earned numeric;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'You can only read your own referral stats.';
  end if;

  select count(*) into v_total_referrals
  from public.referrals
  where referrer_id = p_user_id;

  select count(*) into v_pending_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = false;

  select count(*) into v_pending_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = false;

  select count(*) into v_earned_withdrawal
  from public.referrals
  where referrer_id = p_user_id
    and first_withdrawal_rewarded = true;

  select count(*) into v_earned_repayment
  from public.referrals
  where referrer_id = p_user_id
    and first_repayment_rewarded = true;

  v_total_earned := (v_earned_withdrawal * 250) + (v_earned_repayment * 250);

  return json_build_object(
    'total_referrals', v_total_referrals,
    'pending_withdrawal', v_pending_withdrawal,
    'pending_repayment', v_pending_repayment,
    'earned_withdrawal', v_earned_withdrawal,
    'earned_repayment', v_earned_repayment,
    'total_earned', v_total_earned
  );
end;
$$;

create or replace function public.me2u_get_referral_details(p_user_id uuid)
returns table(
  referee_id uuid,
  referee_name text,
  referee_email text,
  referee_trust_score integer,
  referee_kyc_verified boolean,
  signed_up_at timestamptz,
  first_withdrawal_rewarded boolean,
  first_repayment_rewarded boolean,
  pending_rewards text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'You can only read your own referral details.';
  end if;

  return query
  select
    r.referee_id,
    p.first_name || ' ' || p.last_name as referee_name,
    p.email as referee_email,
    p.trust_score as referee_trust_score,
    p.kyc_verified as referee_kyc_verified,
    r.created_at as signed_up_at,
    r.first_withdrawal_rewarded,
    r.first_repayment_rewarded,
    case
      when not r.first_withdrawal_rewarded and not r.first_repayment_rewarded then 'NGN 500 pending (2 steps)'
      when not r.first_withdrawal_rewarded and r.first_repayment_rewarded then 'NGN 250 pending (withdrawal)'
      when r.first_withdrawal_rewarded and not r.first_repayment_rewarded then 'NGN 250 pending (repayment)'
      else 'NGN 500 earned'
    end as pending_rewards
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id
  order by r.created_at desc;
end;
$$;

revoke execute on function public.me2u_get_referral_stats(uuid) from public, anon;
revoke execute on function public.me2u_get_referral_details(uuid) from public, anon;
grant execute on function public.me2u_get_referral_stats(uuid) to authenticated, service_role;
grant execute on function public.me2u_get_referral_details(uuid) to authenticated, service_role;
