-- Migration: Add notifications for loan acceptance and repayment

create or replace function private.lendpeer_accept_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.marketplace_items%rowtype;
  v_amount numeric;
  v_borrower_id uuid;
  v_lender_id uuid;
  v_updated integer;
begin
  select *
  into v_item
  from public.marketplace_items
  where id = p_item_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Marketplace listing is no longer available.';
  end if;

  if v_item.author_id = p_user_id then
    raise exception 'You cannot accept your own listing.';
  end if;

  v_amount := round(v_item.amount, 2);

  if v_item.type = 'borrow_request' then
    v_borrower_id := v_item.author_id;
    v_lender_id := p_user_id;
  else
    v_borrower_id := p_user_id;
    v_lender_id := v_item.author_id;
  end if;

  update public.wallets
  set balance = balance - v_amount,
      locked = locked + v_amount
  where user_id = v_lender_id
    and balance >= v_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Lender has insufficient available balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where user_id = v_borrower_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Borrower wallet not found.';
  end if;

  update public.marketplace_items
  set status = 'funded'
  where id = v_item.id;

  insert into public.loans (
    amount,
    rate,
    days,
    borrower_id,
    lender_id,
    status,
    due_date
  )
  values (
    v_amount,
    v_item.rate,
    v_item.days,
    v_borrower_id,
    v_lender_id,
    'active',
    now() + make_interval(days => v_item.days)
  );

  insert into public.transactions (user_id, type, amount, description)
  values
    (v_lender_id, 'investment', v_amount, 'Funded peer loan'),
    (v_borrower_id, 'loan_disbursed', v_amount, 'Loan disbursed to wallet');

  -- Add notifications for loan acceptance
  insert into public.notifications (user_id, title, message)
  values
    (v_borrower_id, 'Loan Funded', 'Your peer loan request of NGN ' || v_amount || ' has been funded. The amount has been credited to your wallet.'),
    (v_lender_id, 'Investment Active', 'You have successfully funded a peer loan of NGN ' || v_amount || '. The funds are now locked in your wallet.');
end;
$$;


create or replace function private.lendpeer_repay_loan(
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

  update public.wallets
  set balance = balance - v_repayment_amount
  where user_id = p_user_id
    and balance >= v_repayment_amount;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Insufficient balance to repay this loan.';
  end if;

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
  end if;

  update public.loans
  set status = 'completed'
  where id = v_loan.id;

  insert into public.transactions (user_id, type, amount, description)
  values (
    p_user_id,
    'loan_repayment',
    v_repayment_amount,
    case
      when v_loan.lender_id is null then 'Platform loan repayment'
      else 'Loan Repayment (Principal + Interest)'
    end
  );

  -- Add notification for borrower
  insert into public.notifications (user_id, title, message)
  values (p_user_id, 'Loan Repaid', 'You have successfully repaid your loan of NGN ' || v_loan.amount || '.');

  if v_loan.lender_id is not null then
    insert into public.transactions (user_id, type, amount, description)
    values (
      v_loan.lender_id,
      'repayment_received',
      v_repayment_amount,
      'Loan repayment received'
    );
    
    -- Add notification for lender
    insert into public.notifications (user_id, title, message)
    values (v_loan.lender_id, 'Repayment Received', 'Your peer loan investment of NGN ' || v_loan.amount || ' has been repaid with interest. NGN ' || v_repayment_amount || ' has been credited to your wallet.');
  end if;
end;
$$;
