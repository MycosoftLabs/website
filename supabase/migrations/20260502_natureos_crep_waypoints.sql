-- NatureOS / CREP — saved map waypoints (May 2, 2026)
-- Apply via Supabase CLI or dashboard. Requires auth.users.
-- Client: migrate CREP localStorage waypoints → POST/UPSERT (follow-up in shell backlog).

CREATE TABLE IF NOT EXISTS public.crep_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  zoom real,
  source text DEFAULT 'crep',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crep_waypoints_user ON public.crep_waypoints (user_id);

ALTER TABLE public.crep_waypoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crep_waypoints_select_own" ON public.crep_waypoints;
DROP POLICY IF EXISTS "crep_waypoints_insert_own" ON public.crep_waypoints;
DROP POLICY IF EXISTS "crep_waypoints_update_own" ON public.crep_waypoints;
DROP POLICY IF EXISTS "crep_waypoints_delete_own" ON public.crep_waypoints;

CREATE POLICY "crep_waypoints_select_own" ON public.crep_waypoints
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "crep_waypoints_insert_own" ON public.crep_waypoints
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crep_waypoints_update_own" ON public.crep_waypoints
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crep_waypoints_delete_own" ON public.crep_waypoints
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.crep_waypoints IS 'CREP / NatureOS map bookmarks; RLS per user. Enable Realtime in dashboard if needed.';
