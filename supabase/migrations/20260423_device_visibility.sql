-- =====================================================================
-- MYCA Device Visibility Gate — Apr 23, 2026
-- =====================================================================
-- Morgan: "myca can do this any devices and data from any user at
-- will having all of it on for anyone with a mycosoft.org email
-- only for now 'Company view'".
--
-- Table that MYCA writes to when it needs to gate a specific device.
-- Default policy (row absent): visible to `company` scope and above.
-- Row present: `visible_scopes` controls exactly who can see.
-- `hidden_until` > now() overrides to ops-only for emergency quiet.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.myca_device_visibility (
    device_id       TEXT PRIMARY KEY,
    visible_scopes  TEXT[] NOT NULL DEFAULT ARRAY['company','fusarium','ops']::text[],
    hidden_until    TIMESTAMPTZ NULL,
    managed_by      TEXT NOT NULL DEFAULT 'myca', -- myca | user | system
    reason          TEXT NULL,
    updated_by      TEXT NULL,                     -- user id / agent id
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.myca_device_visibility
    IS 'MYCA-controlled per-device visibility gate for Worldview v1. '
       'Rows override the default "visible to company+" policy. '
       'Consumed by lib/worldview/company-auth.ts.applyDeviceVisibility().';

CREATE INDEX IF NOT EXISTS myca_device_visibility_scopes_gin
    ON public.myca_device_visibility USING GIN (visible_scopes);

CREATE INDEX IF NOT EXISTS myca_device_visibility_hidden_until_idx
    ON public.myca_device_visibility (hidden_until)
    WHERE hidden_until IS NOT NULL;

-- Updated_at auto-touch
CREATE OR REPLACE FUNCTION public.myca_device_visibility_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS myca_device_visibility_touch_trg ON public.myca_device_visibility;
CREATE TRIGGER myca_device_visibility_touch_trg
    BEFORE UPDATE ON public.myca_device_visibility
    FOR EACH ROW EXECUTE FUNCTION public.myca_device_visibility_touch();

-- RLS: only service-role writes (MYCA/admin code path); authenticated
-- users in the company email domain can read their own rules for UI.
ALTER TABLE public.myca_device_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "myca_device_visibility.select.authenticated" ON public.myca_device_visibility;
CREATE POLICY "myca_device_visibility.select.authenticated"
    ON public.myca_device_visibility
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- No INSERT/UPDATE/DELETE policy for authenticated — service-role only.

COMMIT;
