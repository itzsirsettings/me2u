-- Paystack Integration for Automated Withdrawals
-- Extends the existing withdrawal_requests table with Paystack transfer details.

-- ─── 1. Add Paystack columns to withdrawal_requests ───

alter table public.withdrawal_requests
  add column if not exists fee numeric(14,2) not null default 0,
  add column if not exists net_amount numeric(14,2) not null default 0,
  add column if not exists bank_code text,
  add column if not exists account_name text,
  add column if not exists paystack_recipient_code text,
  add column if not exists paystack_transfer_code text,
  add column if not exists paystack_reference text;

-- Add fee_amount column if it doesn't exist (from previous migrations)
alter table public.withdrawal_requests
  add column if not exists fee_amount numeric(14,2) not null default 0;

-- Update the status enum to include processing, success, failed, reversed
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'processing'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'processing';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'success'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'success';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'failed'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'failed';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reversed'
      and enumtypid = 'public.withdrawal_request_status'::regtype
  ) then
    alter type public.withdrawal_request_status add value 'reversed';
  end if;
end;
$$;

-- ─── 2. Helper RPC for refunds (failed/reversed transfers) ───

create or replace function private.me2u_increment_balance(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_updated integer;
begin
  update public.wallets
  set balance = balance + round(p_amount, 2)
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet not found for refund.';
  end if;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'deposit', round(p_amount, 2), 'Withdrawal refund — transfer failed or reversed');
end;
$$;

create or replace function public.me2u_increment_balance(p_user_id uuid, p_amount numeric)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_increment_balance(p_user_id, p_amount);
$$;

revoke execute on function public.me2u_increment_balance(uuid, numeric) from public, anon;
grant execute on function public.me2u_increment_balance(uuid, numeric) to service_role;

-- ─── 3. Function to process Paystack withdrawal (called from Edge Function) ───

create or replace function private.me2u_initiate_paystack_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_fee numeric,
  p_net_amount numeric,
  p_bank_code text,
  p_account_number text,
  p_account_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet_balance numeric(14, 2);
  v_updated integer;
  v_request_id uuid;
  v_total_debit numeric(14, 2);
begin
  -- Check available balance (balance - locked)
  select balance into v_wallet_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  v_total_debit := round(p_amount + p_fee, 2);

  if v_wallet_balance < v_total_debit then
    raise exception 'Insufficient available balance. Required: ₦%, Available: ₦%',
      v_total_debit, v_wallet_balance;
  end if;

  -- Deduct from wallet immediately (optimistic)
  update public.wallets
  set balance = balance - v_total_debit
  where user_id = p_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Wallet update failed.';
  end if;

  -- Record transaction
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'withdrawal', v_total_debit, 'Withdrawal to ' || p_account_name || ' (Paystack)');

  -- Create withdrawal request
  insert into public.withdrawal_requests (
    user_id,
    amount,
    fee,
    fee_amount,
    net_amount,
    bank_code,
    account_number,
    account_name,
    status
  )
  values (
    p_user_id,
    p_amount,
    p_fee,
    p_fee,
    p_net_amount,
    p_bank_code,
    p_account_number,
    p_account_name,
    'processing'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- ─── 4. Function to confirm successful transfer (called from webhook) ───

create or replace function private.me2u_confirm_withdrawal_success(
  p_request_id uuid,
  p_transfer_code text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.withdrawal_requests
  set status = 'success',
      paystack_transfer_code = p_transfer_code,
      paystack_reference = p_reference,
      processed_at = now()
  where id = p_request_id
    and status = 'processing';

  if not found then
    raise exception 'Withdrawal request not found or not in processing state.';
  end if;
end;
$$;

-- ─── 5. Function to handle failed/reversed transfer (called from webhook) ───

create or replace function private.me2u_handle_withdrawal_failure(
  p_request_id uuid,
  p_transfer_code text,
  p_reason text default 'Transfer failed'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
begin
  select * into v_request
  from public.withdrawal_requests
  where id = p_request_id
    and paystack_transfer_code = p_transfer_code
  for update;

  if not found then
    raise exception 'Withdrawal request not found for transfer code: %', p_transfer_code;
  end if;

  -- Refund wallet
  perform private.me2u_increment_balance(v_request.user_id, v_request.amount + v_request.fee);

  -- Update status
  update public.withdrawal_requests
  set status = 'failed',
      admin_note = p_reason,
      processed_at = now()
  where id = p_request_id;

  -- Notify user
  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Withdrawal Failed',
    'Your withdrawal of NGN ' || v_request.net_amount || ' failed. Funds have been refunded to your wallet. Reason: ' || p_reason
  );
end;
$$;

-- ─── 6. Public wrapper functions for Edge Functions ───

create or replace function public.me2u_initiate_paystack_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_fee numeric,
  p_net_amount numeric,
  p_bank_code text,
  p_account_number text,
  p_account_name text
)
returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_initiate_paystack_withdrawal(
    p_user_id, p_amount, p_fee, p_net_amount, p_bank_code, p_account_number, p_account_name
  );
$$;

create or replace function public.me2u_confirm_withdrawal_success(
  p_request_id uuid,
  p_transfer_code text,
  p_reference text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_confirm_withdrawal_success(p_request_id, p_transfer_code, p_reference);
$$;

create or replace function public.me2u_handle_withdrawal_failure(
  p_request_id uuid,
  p_transfer_code text,
  p_reason text default 'Transfer failed'
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.me2u_handle_withdrawal_failure(p_request_id, p_transfer_code, p_reason);
$$;

-- ─── 7. Permissions ───

revoke execute on function public.me2u_initiate_paystack_withdrawal(uuid, numeric, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.me2u_initiate_paystack_withdrawal(uuid, numeric, numeric, numeric, text, text, text) to service_role;

revoke execute on function public.me2u_confirm_withdrawal_success(uuid, text, text) from public, anon, authenticated;
grant execute on function public.me2u_confirm_withdrawal_success(uuid, text, text) to service_role;

revoke execute on function public.me2u_handle_withdrawal_failure(uuid, text, text) from public, anon, authenticated;
grant execute on function public.me2u_handle_withdrawal_failure(uuid, text, text) to service_role;

revoke execute on function public.me2u_increment_balance(uuid, numeric) from public, anon, authenticated;
grant execute on function public.me2u_increment_balance(uuid, numeric) to service_role;
