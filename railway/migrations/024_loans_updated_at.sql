-- Loan mutation routes write updated_at; keep the column present in every
-- Railway database and refresh it consistently on future loan changes.
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS loans_set_updated_at ON public.loans;
CREATE TRIGGER loans_set_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
