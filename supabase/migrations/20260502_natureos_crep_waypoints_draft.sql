-- NatureOS / CREP — saved map waypoints (DRAFT — May 2, 2026)
-- Do not run in production until RLS and client migration from localStorage are ready.
-- See: docs/NATUREOS_SHELL_INTEGRATION_BACKLOG_MAY02_2026.md (MAS repo) and shell waypoints plan.

-- CREATE TABLE IF NOT EXISTS public.crep_waypoints (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
--   label text,
--   lat double precision NOT NULL,
--   lon double precision NOT NULL,
--   zoom real,
--   source text DEFAULT 'crep',
--   created_at timestamptz NOT NULL DEFAULT now(),
--   updated_at timestamptz NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS idx_crep_waypoints_user ON public.crep_waypoints (user_id);
-- ALTER TABLE public.crep_waypoints ENABLE ROW LEVEL SECURITY;
-- (Policies: select/insert/update/delete where auth.uid() = user_id)

SELECT 1; -- empty migration placeholder so `supabase db` tooling does not fail on empty file
