-- RAILWAY MIGRATION 016 · Badge check must not reference transactions.updated_at
--
-- public.transactions has never had an updated_at column (see 002_complete_schema.sql:
-- it carries only created_at). Migration 005's private.me2u_check_user_badges, however,
-- reads max(updated_at) from public.transactions for the speed_repayer badge. Because
-- that function is invoked by the referrals_check_badges BEFORE INSERT trigger on
-- public.referrals, EVERY referral-row insert (including a registration that carries a
-- referral code) raised:
--     column "updated_at" does not exist
-- and the whole insert was rolled back – silently breaking the referral system end to end.
--
-- Transactions are immutable, so created_at is the correct timing column. This migration
-- replaces the function body in place (idempotent; safe on any DB state).

create or replace function private.me2u_check_user_badges(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_profile record;
  v_loans_completed integer;
  v_loans_lent integer;
  v_total_volume numeric;
  v_total_savings numeric;
  v_verified_referrals integer;
  v_circle_members integer;
  v_education_completed integer;
  v_total_repayments integer;
  v_on_time_repayments integer;
  v_has_speed_repayment boolean;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then return; end if;

  select count(*) into v_loans_completed
  from public.loans where borrower_id = p_user_id and status = 'completed';

  select count(distinct borrower_id) into v_loans_lent
  from public.loans where lender_id = p_user_id and status = 'completed';

  select coalesce(sum(amount), 0) into v_total_volume
  from public.loans where borrower_id = p_user_id or lender_id = p_user_id;

  select coalesce(sum(current_amount), 0) into v_total_savings
  from public.savings_goals where user_id = p_user_id;

  select count(*) into v_verified_referrals
  from public.referrals r
  join public.profiles p on p.id = r.referee_id
  where r.referrer_id = p_user_id and p.kyc_verified = true;

  select max(member_count) into v_circle_members
  from public.circles c
  join public.circle_performance cp on cp.circle_id = c.id
  where c.creator_id = p_user_id;

  select count(distinct lesson_key) into v_education_completed
  from public.learning_progress where user_id = p_user_id;

  select exists (
    select 1 from public.loans
    where borrower_id = p_user_id
      and status = 'completed'
      and created_at >= (select max(created_at) from public.loans where borrower_id = p_user_id and status = 'completed')
      and extract(epoch from (
        (select max(created_at) from public.transactions
         where user_id = p_user_id and type = 'loan_repayment'
         and description like '%' || id::text || '%')
        - start_date
      )) <= 86400
  ) into v_has_speed_repayment;

  if v_profile.trust_score >= 90 then
    perform private.me2u_award_badge(p_user_id, 'trust_builder');
  end if;
  if v_loans_lent >= 5 then
    perform private.me2u_award_badge(p_user_id, 'community_lender');
  end if;
  if v_loans_completed >= 5 then
    perform private.me2u_award_badge(p_user_id, 'responsible_borrower');
  end if;
  if v_circle_members >= 10 then
    perform private.me2u_award_badge(p_user_id, 'circle_champion');
  end if;
  if v_verified_referrals >= 10 then
    perform private.me2u_award_badge(p_user_id, 'referral_master');
  end if;
  if v_total_volume >= 100000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_100k');
  elsif v_total_volume >= 50000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_50k');
  elsif v_total_volume >= 5000 then
    perform private.me2u_award_badge(p_user_id, 'milestone_5k');
  end if;
  if v_total_savings >= 50000 then
    perform private.me2u_award_badge(p_user_id, 'super_saver');
  end if;
  if v_has_speed_repayment then
    perform private.me2u_award_badge(p_user_id, 'speed_repayer');
  end if;

  select count(*) into v_total_repayments
  from public.loans where borrower_id = p_user_id and status = 'completed';

  if v_total_repayments >= 5 then
    select count(*) into v_on_time_repayments
    from public.loans
    where borrower_id = p_user_id and status = 'completed'
      and updated_at <= due_date;
    if v_on_time_repayments = v_total_repayments then
      perform private.me2u_award_badge(p_user_id, 'perfect_record');
    end if;
  end if;
end;
$$;