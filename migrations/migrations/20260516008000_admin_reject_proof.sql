-- Migration to add admin_reject_payment_proof RPC
-- Path: supabase/migrations/20260516008000_admin_reject_proof.sql

create or replace function public.admin_reject_payment_proof(p_proof_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Ensure the caller is an admin
    if not exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    ) then
        raise exception 'Unauthorized: Only admins can reject payment proofs.';
    end if;

    -- Update the proof status and notify user
    with rejected_proof as (
        update public.payment_proofs
        set status = 'rejected'
        where id = p_proof_id and status = 'pending'
        returning user_id, amount
    )
    insert into public.notifications (user_id, title, message)
    select user_id, 'Payment Rejected', 'Your payment proof of ₦' || amount || ' was rejected. Please check your reference and re-upload.'
    from rejected_proof;

    if not found then
        raise exception 'Payment proof not found or already processed.';
    end if;
end;
$$;
