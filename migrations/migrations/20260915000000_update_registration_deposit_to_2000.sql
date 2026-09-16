-- Update registration deposit validation messages to NGN 2,000
-- Updates validation messages in core functions and preserves existing logic.

DO $$
BEGIN
  -- 1. Update platform loan request function message
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'me2u_request_platform_loan') THEN
    EXECUTE $e$
      CREATE OR REPLACE FUNCTION private.me2u_request_platform_loan(p_user_id uuid, p_amount numeric)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
      declare
        v_profile public.profiles%rowtype;
        v_registration_deposit_paid boolean;
        v_prior_platform_loans integer;
        v_retained_deposit numeric;
        v_shortfall numeric;
        v_amount numeric := round(p_amount, 2);
        v_updated integer;
      begin
        if v_amount is null or v_amount < 5000 then
          raise exception 'Loans start from NGN 5,000.';
        end if;
        select id, registration_deposit_paid into v_profile.id, v_registration_deposit_paid
        from public.profiles where id = p_user_id;
        if not found then raise exception 'Profile not found.'; end if;
        if not v_registration_deposit_paid then
          raise exception 'Confirm your NGN 2,000 registration deposit before requesting a loan.';
        end if;
        select count(*) into v_prior_platform_loans
        from public.loans where borrower_id = p_user_id and lender_id is null and status = 'active' and amount >= 5000;
        if v_prior_platform_loans > 0 then
          raise exception 'You already have an active platform loan. Repay it first.';
        end if;
        v_retained_deposit := round(v_amount * 0.5, 2);
        if v_retained_deposit > 0 then
          select coalesce(sum(round(amount * 0.5, 2)), 0) into v_shortfall
          from public.loans where borrower_id = p_user_id and lender_id is null and status = 'active' and amount >= 5000;
          if v_amount * 0.5 > v_retained_deposit + coalesce((select balance from public.wallets where user_id = p_user_id), 0) then
            raise exception 'Fund NGN % first. The 50%% deposit of NGN % remains in your wallet.', v_shortfall, v_retained_deposit;
          end if;
        end if;
        update public.wallets set balance = balance + v_amount where user_id = p_user_id;
        get diagnostics v_updated = row_count;
        if v_updated <> 1 then raise exception 'Wallet not found.'; end if;
        insert into public.loans (amount, rate, days, borrower_id, lender_id, status, due_date)
        values (v_amount, 0, 30, p_user_id, null, 'active', now() + make_interval(days => 30));
        insert into public.transactions (user_id, type, amount, description)
        values (p_user_id, 'loan_disbursed', v_amount, case when v_prior_platform_loans = 0 then 'First platform loan disbursed' else 'Platform loan disbursed with 50% retained wallet condition' end);
      end;
      $$;
    $e$;
  END IF;

  -- 2. Update withdraw function message
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'me2u_withdraw_wallet') THEN
    EXECUTE $e$
      CREATE OR REPLACE FUNCTION private.me2u_withdraw_wallet(p_user_id uuid, p_amount numeric)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
      declare
        v_withdrawal_amount numeric;
        v_registration_deposit_paid boolean;
        v_platform_retained_deposit numeric;
        v_updated integer;
      begin
        if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero.'; end if;
        select registration_deposit_paid into v_registration_deposit_paid from public.profiles where id = p_user_id;
        if not found then raise exception 'Profile not found.'; end if;
        if not v_registration_deposit_paid then
          raise exception 'Confirm your NGN 2,000 registration deposit before withdrawal.';
        end if;
        v_withdrawal_amount := round(p_amount, 2);
        select coalesce(sum(round(amount * 0.5, 2)), 0) into v_platform_retained_deposit
        from public.loans where borrower_id = p_user_id and lender_id is null and status = 'active' and amount >= 5000;
        update public.wallets set balance = balance - v_withdrawal_amount
        where user_id = p_user_id and balance >= (v_withdrawal_amount + v_platform_retained_deposit);
        get diagnostics v_updated = row_count;
        if v_updated <> 1 then raise exception 'Insufficient available balance. The active platform loan deposit must remain in your wallet.'; end if;
        insert into public.transactions (user_id, type, amount, description)
        values (p_user_id, 'withdrawal', v_withdrawal_amount, 'Withdrawal to Bank Account');
      end;
      $$;
    $e$;
  END IF;

  -- 3. Update registration deposit confirmation wrapper
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'me2u_confirm_registration_deposit' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $e$
      CREATE OR REPLACE FUNCTION public.me2u_confirm_registration_deposit(p_user_id uuid, p_reference text)
      RETURNS void LANGUAGE sql SECURITY invoker SET search_path = public, private, pg_temp AS $$
        select private.me2u_confirm_registration_deposit(p_user_id, p_reference);
      $$;
    $e$;
    EXECUTE $e$ revoke execute on function public.me2u_confirm_registration_deposit(uuid, text) from public, anon, authenticated; $e$;
    EXECUTE $e$ grant execute on function public.me2u_confirm_registration_deposit(uuid, text) to service_role; $e$;
  END IF;
END $$;