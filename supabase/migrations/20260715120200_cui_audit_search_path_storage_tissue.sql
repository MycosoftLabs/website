-- CUI Audit JUL15 2026 — Findings MYCO-AUDIT-2026-0005, 0006, 0007
-- search_path pin, storage listing note, tissue_* access-model documentation
-- APPLY AFTER Morgan Rockcoons approval

BEGIN;

-- 0005: pin mutable search_path
ALTER FUNCTION public.worldview_rate_weight_last_minute(uuid)
  SET search_path = public;

ALTER FUNCTION public.worldview_meter_and_limit(uuid, uuid, text, integer, integer, text, text)
  SET search_path = public;

-- 0006: public bucket listing — drop broad SELECT that enables enumeration.
-- Public object URLs may still work via Storage CDN when bucket is marked public;
-- if avatar/species image loads break, re-add path-scoped policies or use signed URLs.
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for species-images" ON storage.objects;

-- Allow SELECT only when requesting a known object path under the caller's folder
-- (authenticated users) OR service_role (bypasses RLS). Anon listing removed.
CREATE POLICY "Authenticated read own avatars folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role read avatars"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated read species-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'species-images');

CREATE POLICY "Service role read species-images"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'species-images');

-- 0007: document tissue_* as service_role-only by design (RLS on, no client policies)
COMMENT ON TABLE public.tissue_access_grants IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_contaminations IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_events IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_experiment_accessions IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_interactions IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_locations IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_scientists IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';
COMMENT ON TABLE public.tissue_transfers IS
  'CUI JUL15 2026: RLS enabled, no client policies — service_role only by design.';

COMMIT;
