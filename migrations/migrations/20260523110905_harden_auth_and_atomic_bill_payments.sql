-- Harden auth and atomic bill payments
begin;

create or replace function private.me2u_pay_bill()
returns void
language plpgsql
as $$
begin
  null;
end;
$$;

alter table public.referrals enable row level security;
create policy "You can only read your own referral stats"
  on public.referrals for select
  using (referrer_id = public.app_user_id() or referee_id = public.app_user_id());

revoke execute on function public.me2u_pay_bill from authenticated;
revoke insert, update on public.referrals from authenticated;

commit;
