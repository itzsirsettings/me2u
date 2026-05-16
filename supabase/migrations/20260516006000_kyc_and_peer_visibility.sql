-- Migration: KYC, Proof of Payment, and Notifications

-- 1. Add `passport_photo_url` and `role` to `profiles`
ALTER TABLE public.profiles
ADD COLUMN passport_photo_url text,
ADD COLUMN role text not null default 'user' check (role in ('user', 'admin'));

-- 2. Peer Profile Visibility Policy
-- Allow a user to select another user's profile if they are both involved in an active peer loan.
CREATE POLICY "Users can read peer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loans l
    WHERE l.status = 'active'
      AND l.source = 'peer'
      AND (
        (l.borrower_id = auth.uid() AND l.lender_id = profiles.id)
        OR
        (l.lender_id = auth.uid() AND l.borrower_id = profiles.id)
      )
  )
);

-- 3. Create `payment_proofs` table
CREATE TYPE public.payment_proof_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_proof_type AS ENUM ('wallet_funding', 'registration_deposit');

CREATE TABLE public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  reference text not null,
  type public.payment_proof_type not null,
  receipt_image_url text not null,
  status public.payment_proof_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TRIGGER payment_proofs_set_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.payment_proofs TO authenticated;

CREATE POLICY "Users can read own payment proofs"
ON public.payment_proofs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment proofs"
ON public.payment_proofs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all payment proofs"
ON public.payment_proofs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update payment proofs"
ON public.payment_proofs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Create `notifications` table
CREATE TABLE public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Inserting notifications will typically be done by SECURITY DEFINER functions (RPCs)
-- triggered by admin actions or backend processes, so we do not grant raw insert to users.

-- 5. Storage Buckets for KYC and Receipts
-- In a real environment, Storage Buckets and policies must be created via SQL if migrating,
-- or manually in the Dashboard. We will create them via SQL here for completeness.
-- NOTE: Requires `storage` schema access. If running via local CLI, this works.
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT DO NOTHING;

-- Storage Policies for KYC
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read their own KYC documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all KYC documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Storage Policies for Receipts
CREATE POLICY "Users can upload their own receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read their own receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. RPC for Admin to Approve Payment Proofs
CREATE OR REPLACE FUNCTION public.admin_approve_payment_proof(p_proof_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proof public.payment_proofs%ROWTYPE;
  v_admin boolean;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO v_admin;
  IF NOT v_admin THEN
    RAISE EXCEPTION 'Only admins can approve payments.';
  END IF;

  SELECT * INTO v_proof FROM public.payment_proofs WHERE id = p_proof_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment proof not found.';
  END IF;

  IF v_proof.status != 'pending' THEN
    RAISE EXCEPTION 'Payment proof is not pending.';
  END IF;

  -- Update status
  UPDATE public.payment_proofs SET status = 'approved', updated_at = now() WHERE id = p_proof_id;

  -- Apply logic based on type
  IF v_proof.type = 'wallet_funding' THEN
    UPDATE public.wallets SET balance = balance + v_proof.amount, updated_at = now() WHERE user_id = v_proof.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_proof.user_id, 'deposit', v_proof.amount, 'Wallet funded via admin approval');
  ELSIF v_proof.type = 'registration_deposit' THEN
    UPDATE public.profiles SET registration_deposit_paid = true, registration_deposit_amount = v_proof.amount, registration_deposit_confirmed_at = now(), updated_at = now() WHERE id = v_proof.user_id;
    -- Note: first platform loan is expected to be triggered elsewhere or added here, but for simplicity we rely on existing mechanisms or add it directly:
    PERFORM public.me2u_request_platform_loan(v_proof.user_id, 2000);
  END IF;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message) VALUES (v_proof.user_id, 'Payment Approved', 'Your payment of ?' || v_proof.amount || ' has been approved.');
END;
$$;

