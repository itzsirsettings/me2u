-- Fix: Repayment and default processing bugs for platform loans
-- BUG 1: me2u_repay_loan fails for platform loans (lender_id is NULL)
--   because it tries to unlock a non-existent lender's locked balance.
-- BUG 2: me2u_process_loan_defaults tries to transfer deposit to NULL lender.
--
-- FIX: Skip lender balance operations when lender_id is NULL (platform loans).
-- Platform loans are balance-sheet loans: money is created on disbursement
-- and removed from circulation on repayment. No lender wallet is involved.

-- ─── 1. Fixed: me2u_repay_loan ───

create or replace function private.me2u_repay_loan(
  p_user_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan public.loans%rowtype;
  v_repayment_amount numeric;
  v_updated integer;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and borrower_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'This loan cannot be repaid from this account.';
  end if;

  v_repayment_amount := round(v_loan.amount + ((v_loan.amount * v_loan.rate) / 100), 2);

  -- Debit borrower's balance for repayment
  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

  -- For PEER loans: unlock lender's locked principal and credit repayment to lender
  if v_loan.lender_id is not null then
    update public.wallets
    set locked = locked - v_loan.amount,
        balance = balance + v_repayment_amount
    where user_id = v_loan.lender_id
      and locked >= v_loan.amount;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Lender locked balance is inconsistent.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (v_loan.lender_id, 'repayment_received', v_repayment_amount, 'Loan repayment received');
  end if;
  -- For PLATFORM loans (lender_id is NULL):
  -- Repayment amount is removed from circulation (no lender to credit).
  -- The principal was created on disbursement, so it disappears on repayment.

  -- Unlock borrower's security deposit back to usable balance
  if v_loan.security_deposit > 0 then
    update public.wallets
    set locked = locked - v_loan.security_deposit,
        balance = balance + v_loan.security_deposit
    where user_id = p_user_id
      and locked >= v_loan.security_deposit;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Borrower locked balance is inconsistent for deposit unlock.';
    end if;

    insert into public.transactions (user_id, type, amount, description)
    values (p_user_id, 'deposit_unlocked', v_loan.security_deposit, 'Security deposit unlocked after repayment');
  end if;

  -- Mark loan as completed
  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  -- Record borrower repayment transaction
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'loan_repayment', v_repayment_amount, 'Loan Repayment (Principal + Interest)');
end;
$$;

-- ─── 2. Fixed: me2u_process_loan_defaults ───

create or replace function private.me2u_process_loan_defaults()
returns table(loan_id uuid, borrower_id uuid, lender_id uuid, deposit_transferred numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loan record;
  v_updated integer;
begin
  for v_loan in
    select l.*
    from public.loans l
    where l.status = 'active'
      and l.due_date < now() - interval '7 days'
      and l.security_deposit > 0
  loop
    -- Remove security deposit from borrower's locked balance
    update public.wallets
    set locked = locked - v_loan.security_deposit
    where user_id = v_loan.borrower_id
      and locked >= v_loan.security_deposit;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      -- Borrower's locked balance inconsistent, skip this loan
      continue;
    end if;

    -- For PEER loans: transfer forfeited deposit to lender balance
    if v_loan.lender_id is not null then
      update public.wallets
      set balance = balance + v_loan.security_deposit
      where user_id = v_loan.lender_id;

      if not found then
        -- Lender wallet doesn't exist, create it
        insert into public.wallets (user_id, balance, locked)
        values (v_loan.lender_id, v_loan.security_deposit, 0);
      end if;

      insert into public.transactions (user_id, type, amount, description)
      values (v_loan.lender_id, 'deposit_recovery', v_loan.security_deposit, 'Security deposit recovered from defaulted loan');
    end if;
    -- For PLATFORM loans: deposit is forfeited (no lender to receive it).
    -- Simply removed from borrower's locked balance.

    -- Record borrower forfeiture
    insert into public.transactions (user_id, type, amount, description)
    values (v_loan.borrower_id, 'deposit_forfeited', v_loan.security_deposit, 'Security deposit forfeited — loan defaulted');

    -- Mark loan as completed (defaulted)
    update public.loans
    set status = 'completed'
    where id = v_loan.id;

    loan_id := v_loan.id;
    borrower_id := v_loan.borrower_id;
    lender_id := v_loan.lender_id;
    deposit_transferred := v_loan.security_deposit;
    return next;
  end loop;
end;
$$;
