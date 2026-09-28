BEGIN;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'in_review', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_completion_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_one_open_request_per_user
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('requested', 'in_review');

CREATE INDEX IF NOT EXISTS account_deletion_requests_status_requested_idx
  ON public.account_deletion_requests (status, requested_at);

COMMIT;
