ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_lending_enabled boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pool_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (pool_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id uuid REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read all circles" ON public.circles;
CREATE POLICY "Authenticated users can read all circles"
ON public.circles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create circles" ON public.circles;
CREATE POLICY "Users can create circles"
ON public.circles FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creator can update or delete circle" ON public.circles;
CREATE POLICY "Creator can update or delete circle"
ON public.circles FOR ALL TO authenticated USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can read circle members" ON public.circle_members;
CREATE POLICY "Authenticated users can read circle members"
ON public.circle_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Circle members can manage members" ON public.circle_members;
CREATE POLICY "Circle members can manage members"
ON public.circle_members FOR ALL TO authenticated USING (true);
