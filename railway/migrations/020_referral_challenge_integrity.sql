-- Referral challenge integrity and payout correction.
-- Fails before creating the unique index if legacy duplicate challenge rows exist;
-- those rows require an explicit data reconciliation on staging/production.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.referral_challenges
    GROUP BY user_id, challenge_type, week_start
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate referral challenge rows exist; reconcile them before migration 020.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS referral_challenges_identity_idx
  ON public.referral_challenges(user_id, challenge_type, week_start);

CREATE OR REPLACE FUNCTION private.me2u_check_weekly_challenge(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_weekly_count integer;
  v_challenge_reward numeric := 4500;
  v_challenge_id uuid;
BEGIN
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days';

  PERFORM pg_advisory_xact_lock(
    hashtext('referral-weekly-challenge:' || p_user_id::text || ':' || v_week_start::text)
  );

  SELECT count(*) INTO v_weekly_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND first_withdrawal_rewarded = true
    AND created_at >= v_week_start
    AND created_at < v_week_end;

  SELECT id INTO v_challenge_id
  FROM public.referral_challenges
  WHERE user_id = p_user_id
    AND week_start = v_week_start
    AND challenge_type = 'weekly_3_refs'
  FOR UPDATE;

  IF v_challenge_id IS NULL AND v_weekly_count >= 1 THEN
    INSERT INTO public.referral_challenges
      (user_id, challenge_type, target_count, current_count, reward_amount, week_start, week_end, completed, completed_at)
    VALUES
      (p_user_id, 'weekly_3_refs', 3, v_weekly_count, v_challenge_reward, v_week_start, v_week_end,
       v_weekly_count >= 3, CASE WHEN v_weekly_count >= 3 THEN now() ELSE NULL END)
    ON CONFLICT (user_id, challenge_type, week_start) DO NOTHING
    RETURNING id INTO v_challenge_id;

    IF v_challenge_id IS NULL THEN
      SELECT id INTO v_challenge_id
      FROM public.referral_challenges
      WHERE user_id = p_user_id
        AND week_start = v_week_start
        AND challenge_type = 'weekly_3_refs'
      FOR UPDATE;
    END IF;
  ELSE
    UPDATE public.referral_challenges
    SET current_count = v_weekly_count,
        completed = (v_weekly_count >= 3),
        completed_at = CASE
          WHEN v_weekly_count >= 3 AND NOT completed THEN now()
          ELSE completed_at
        END
    WHERE id = v_challenge_id;
  END IF;

  IF v_weekly_count >= 3 THEN
    UPDATE public.referral_challenges
    SET reward_paid = true
    WHERE id = v_challenge_id
      AND completed = true
      AND reward_paid = false;

    IF FOUND THEN
      UPDATE public.wallets
      SET balance = balance + v_challenge_reward
      WHERE user_id = p_user_id;

      INSERT INTO public.transactions (user_id, type, amount, description)
      VALUES (p_user_id, 'affiliate_reward', v_challenge_reward,
              'Weekly challenge reward - 3 verified referrals this week');

      INSERT INTO public.notifications (user_id, title, message)
      VALUES (p_user_id, 'Weekly Challenge Complete!',
              'You referred 3 verified users this week and earned NGN 4,500 bonus!');
    END IF;
  END IF;
END;
$$;
