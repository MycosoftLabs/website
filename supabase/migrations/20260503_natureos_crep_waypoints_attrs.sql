-- CREP waypoints — extended attributes + client id for Supabase-first sync (May 3, 2026)
-- Apply after 20260502_natureos_crep_waypoints.sql

ALTER TABLE public.crep_waypoints
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.crep_waypoints
  ADD COLUMN IF NOT EXISTS client_legacy_id text;

-- Backfill then enforce NOT NULL so upserts can use ON CONFLICT (user_id, client_legacy_id)
UPDATE public.crep_waypoints SET client_legacy_id = id::text WHERE client_legacy_id IS NULL;

ALTER TABLE public.crep_waypoints
  ALTER COLUMN client_legacy_id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.crep_waypoints
  ALTER COLUMN client_legacy_id SET NOT NULL;

DROP INDEX IF EXISTS idx_crep_waypoints_user_client_legacy;

CREATE UNIQUE INDEX idx_crep_waypoints_user_client_legacy
  ON public.crep_waypoints (user_id, client_legacy_id);

COMMENT ON COLUMN public.crep_waypoints.payload IS 'Extended CREP waypoint fields: color, icon, notes, category, icon label, etc.';
COMMENT ON COLUMN public.crep_waypoints.client_legacy_id IS 'Original client id (e.g. wp-*) before server-assigned uuid; used for idempotent migration upserts.';
