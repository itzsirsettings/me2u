-- Referral lifecycle. Event rows are the idempotency boundary for every payout.
CREATE TABLE IF NOT EXISTS public.referral_reward_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('direct_signup', 'new_member_signup', 'first_withdrawal', 'first_repayment', 'indirect_signup')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, source_user_id, reward_type)
);
CREATE INDEX IF NOT EXISTS referral_reward_events_recipient_idx ON public.referral_reward_events(recipient_id, created_at DESC);
ALTER TABLE public.referral_reward_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.referral_reward_events FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.referral_reward_events FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON public.referral_reward_events TO service_role;
  END IF;
END;
$$;

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS signup_rewarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION private.me2u_credit_referral_reward(p_recipient_id uuid, p_source_user_id uuid, p_reward_type text, p_amount numeric, p_description text, p_notification_title text, p_notification_message text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_event_id uuid;
BEGIN
  INSERT INTO public.referral_reward_events (recipient_id, source_user_id, reward_type, amount)
  VALUES (p_recipient_id, p_source_user_id, p_reward_type, p_amount)
  ON CONFLICT (recipient_id, source_user_id, reward_type) DO NOTHING RETURNING id INTO v_event_id;
  IF v_event_id IS NULL THEN RETURN false; END IF;
  UPDATE public.wallets SET balance = balance + p_amount, updated_at = now() WHERE user_id = p_recipient_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found for referral reward recipient.'; END IF;
  INSERT INTO public.transactions (user_id, type, amount, description, created_at) VALUES (p_recipient_id, 'affiliate_reward', p_amount, p_description, now());
  INSERT INTO public.notifications (user_id, title, message, is_read, created_at) VALUES (p_recipient_id, p_notification_title, p_notification_message, false, now());
  RETURN true;
END;
$$;

DROP TRIGGER IF EXISTS referral_signup_bonus_trigger ON public.referrals;
CREATE OR REPLACE FUNCTION private.me2u_handle_referral_signup_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_upline_id uuid;
BEGIN
  PERFORM private.me2u_credit_referral_reward(NEW.referrer_id, NEW.referee_id, 'direct_signup', 1500, 'Referral reward — direct referral signed up', 'Referral signup reward earned!', 'You earned NGN 1,500 because your referral signed up.');
  PERFORM private.me2u_credit_referral_reward(NEW.referee_id, NEW.referee_id, 'new_member_signup', 500, 'Referral welcome reward', 'Welcome reward added!', 'You earned NGN 500 for joining with a referral.');
  UPDATE public.referrals SET signup_rewarded = true WHERE id = NEW.id;
  SELECT referrer_id INTO v_upline_id FROM public.referrals WHERE referee_id = NEW.referrer_id ORDER BY created_at ASC LIMIT 1;
  IF v_upline_id IS NOT NULL THEN
    PERFORM private.me2u_credit_referral_reward(v_upline_id, NEW.referee_id, 'indirect_signup', 500, 'Referral reward — referral brought in a new member', 'Network referral reward earned!', 'You earned NGN 500 because your referral referred a friend.');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER referral_signup_reward_trigger AFTER INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION private.me2u_handle_referral_signup_reward();

DROP TRIGGER IF EXISTS referral_withdrawal_trigger ON public.withdrawal_requests;
CREATE OR REPLACE FUNCTION private.me2u_handle_referral_withdrawal_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_referrer_id uuid; v_rewarded boolean;
BEGIN
  IF NEW.status = 'success' AND OLD.status IN ('pending', 'processing') THEN
    SELECT referrer_id INTO v_referrer_id FROM public.referrals WHERE referee_id = NEW.user_id AND first_withdrawal_rewarded = false ORDER BY created_at ASC LIMIT 1;
    IF v_referrer_id IS NOT NULL THEN
      v_rewarded := private.me2u_credit_referral_reward(v_referrer_id, NEW.user_id, 'first_withdrawal', 250, 'Referral reward — first withdrawal by referral', 'Referral withdrawal reward earned!', 'You earned NGN 250 because your referral completed their first withdrawal.');
      IF v_rewarded THEN
        UPDATE public.referrals SET first_withdrawal_rewarded = true WHERE referee_id = NEW.user_id AND referrer_id = v_referrer_id;
        UPDATE public.profiles SET verified_referral_count = verified_referral_count + 1 WHERE id = v_referrer_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER referral_withdrawal_trigger AFTER UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION private.me2u_handle_referral_withdrawal_reward();

DROP TRIGGER IF EXISTS referral_repayment_trigger ON public.loans;
CREATE OR REPLACE FUNCTION private.me2u_handle_referral_repayment_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_referrer_id uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    SELECT referrer_id INTO v_referrer_id FROM public.referrals WHERE referee_id = NEW.borrower_id AND first_repayment_rewarded = false ORDER BY created_at ASC LIMIT 1;
    IF v_referrer_id IS NOT NULL AND private.me2u_credit_referral_reward(v_referrer_id, NEW.borrower_id, 'first_repayment', 250, 'Referral reward — first loan repayment by referral', 'Referral repayment reward earned!', 'You earned NGN 250 because your referral completed their first loan repayment.') THEN
      UPDATE public.referrals SET first_repayment_rewarded = true WHERE referee_id = NEW.borrower_id AND referrer_id = v_referrer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER referral_repayment_trigger AFTER UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION private.me2u_handle_referral_repayment_reward();

REVOKE ALL ON FUNCTION private.me2u_credit_referral_reward(uuid, uuid, text, numeric, text, text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION private.me2u_credit_referral_reward(uuid, uuid, text, numeric, text, text, text) TO service_role;
  END IF;
END;
$$;
