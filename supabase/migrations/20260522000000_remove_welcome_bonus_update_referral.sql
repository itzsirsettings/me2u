-- Remove 2,000 Naira Welcome Bonus and Update Referral Logic
-- 1. Remove welcome bonus entirely.
-- 2. Referral bonus (N500) only after referral completes KYC AND first loan repayment.

-- ─── 1. Update Referrals Table ───
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS rewarded BOOLEAN NOT NULL DEFAULT false;

UPDATE public.referrals
SET rewarded = true
WHERE first_withdrawal_rewarded = true AND first_repayment_rewarded = true;

-- ─── 2. Remove Welcome Bonus Logic ───
DROP FUNCTION IF EXISTS public.me2u_unlock_welcome_bonus(uuid);
DROP FUNCTION IF EXISTS private.me2u_unlock_welcome_bonus(uuid);

CREATE OR REPLACE FUNCTION public.admin_approve_payment_proof(p_proof_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_proof public.payment_proofs%rowtype;
  v_profile public.profiles%rowtype;
  v_admin boolean;
  v_updated integer;
BEGIN
  SELECT exists (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  INTO v_admin;

  IF NOT v_admin THEN RAISE EXCEPTION 'Only admins can approve payments.'; END IF;

  SELECT * INTO v_proof FROM public.payment_proofs WHERE id = p_proof_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment proof not found.'; END IF;
  IF v_proof.status <> 'pending' THEN RAISE EXCEPTION 'Payment proof is not pending.'; END IF;

  IF v_proof.type = 'wallet_funding' THEN
    UPDATE public.wallets SET balance = balance + v_proof.amount WHERE user_id = v_proof.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  ELSIF v_proof.type = 'registration_deposit' THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_proof.user_id FOR UPDATE;
    IF v_profile.registration_deposit_paid THEN RAISE EXCEPTION 'Registration deposit has already been confirmed.'; END IF;

    UPDATE public.profiles
    SET registration_deposit_paid = true,
        registration_deposit_amount = v_proof.amount,
        registration_payment_reference = v_proof.reference,
        registration_deposit_confirmed_at = now()
    WHERE id = v_proof.user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported payment proof type.';
  END IF;

  UPDATE public.payment_proofs SET status = 'approved' WHERE id = p_proof_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_proof.user_id,
    CASE WHEN v_proof.type = 'registration_deposit' THEN 'Registration Deposit Approved' ELSE 'Payment Approved' END,
    CASE WHEN v_proof.type = 'registration_deposit'
      THEN 'Your registration deposit has been approved. You can now request your first loan after completing KYC.'
      ELSE 'Your payment proof of NGN ' || v_proof.amount || ' has been approved.'
    END
  );
END;
$$;

-- ─── 3. Update Referral Reward Logic ───
DROP TRIGGER IF EXISTS referral_withdrawal_trigger ON public.withdrawal_requests;
DROP FUNCTION IF EXISTS private.me2u_handle_referral_withdrawal_reward();

CREATE OR REPLACE FUNCTION private.me2u_handle_referral_repayment_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referrer_id uuid;
  v_reward numeric := 500;
  v_referee_kyc_verified boolean;
  v_updated integer;
BEGIN
  -- Only fires when a loan transitions to completed
  IF new.status = 'completed' AND old.status = 'active' THEN
    -- Check if the borrower (referee) is KYC verified
    SELECT kyc_verified INTO v_referee_kyc_verified FROM public.profiles WHERE id = new.borrower_id;
    IF NOT v_referee_kyc_verified THEN RETURN new; END IF;

    -- Find the referral where referee is this borrower and reward not yet given
    SELECT referrer_id INTO v_referrer_id FROM public.referrals
    WHERE referee_id = new.borrower_id AND rewarded = false LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      -- Credit referrer wallet
      UPDATE public.wallets SET balance = balance + v_reward WHERE user_id = v_referrer_id;
      GET DIAGNOSTICS v_updated = row_count;
      IF v_updated = 1 THEN
        -- Mark rewarded and keep compatibility
        UPDATE public.referrals SET rewarded = true, first_repayment_rewarded = true, first_withdrawal_rewarded = true
        WHERE referee_id = new.borrower_id AND referrer_id = v_referrer_id;

        -- Log transaction
        INSERT INTO public.transactions (user_id, type, amount, description)
        VALUES (v_referrer_id, 'deposit', v_reward, 'Referral reward — referee completed first loan and KYC');

        -- Notify referrer
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (v_referrer_id, 'Referral Reward Earned!', 'You earned ₦500 wallet credit because your referral completed their first loan repayment and KYC.');
      END IF;
    END IF;
  END IF;
  RETURN new;
END;
$$;

-- ─── 4. Update Stats Functions ───
CREATE OR REPLACE FUNCTION public.me2u_get_referral_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_referrals integer;
  v_pending_rewards integer;
  v_earned_rewards integer;
  v_total_earned numeric;
BEGIN
  SELECT count(*) INTO v_total_referrals FROM public.referrals WHERE referrer_id = p_user_id;
  SELECT count(*) INTO v_pending_rewards FROM public.referrals WHERE referrer_id = p_user_id AND rewarded = false;
  SELECT count(*) INTO v_earned_rewards FROM public.referrals WHERE referrer_id = p_user_id AND rewarded = true;
  v_total_earned := (v_earned_rewards * 500);

  RETURN json_build_object(
    'total_referrals', v_total_referrals,
    'pending_rewards', v_pending_rewards,
    'earned_rewards', v_earned_rewards,
    'total_earned', v_total_earned
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.me2u_get_referral_details(p_user_id uuid)
RETURNS table(referee_id uuid, referee_name text, referee_email text, referee_trust_score integer, referee_kyc_verified boolean, signed_up_at timestamptz, rewarded boolean, pending_rewards text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT r.referee_id, p.first_name || ' ' || p.last_name, p.email, p.trust_score, p.kyc_verified, r.created_at, r.rewarded,
    CASE WHEN NOT r.rewarded THEN '₦500 pending (KYC + first loan)' ELSE '₦500 earned' END
  FROM public.referrals r
  JOIN public.profiles p ON p.id = r.referee_id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$;
