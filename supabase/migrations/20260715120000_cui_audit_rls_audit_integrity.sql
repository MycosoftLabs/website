-- CUI Audit JUL15 2026 — Finding MYCO-AUDIT-2026-0003
-- Tighten RLS on audit_logs / security_events / incidents / defense_briefing_requests
-- APPLY AFTER Morgan Rockcoons approval — do not apply blindly to prod
-- (Staff/SOC UIs must write via service_role server routes, not client JWT.)

BEGIN;

-- ---------------------------------------------------------------------------
-- audit_logs: remove authenticated forge + blanket read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can read audit_logs" ON public.audit_logs;
-- Keep: "Service role can do all on audit_logs"

-- ---------------------------------------------------------------------------
-- security_events: remove authenticated forge + blanket read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert security_events" ON public.security_events;
DROP POLICY IF EXISTS "Authenticated users can read security_events" ON public.security_events;
-- Keep: "Service role can do all on security_events"

-- ---------------------------------------------------------------------------
-- incidents: remove authenticated forge insert/update + blanket read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can read incidents" ON public.incidents;
-- Keep: "Service role can do all"

-- ---------------------------------------------------------------------------
-- defense_briefing_requests: stop PII dump to any authenticated user
-- Allow insert for form submissions (authenticated) only when email present;
-- read/update remains service_role.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert defense_briefing_requests" ON public.defense_briefing_requests;
DROP POLICY IF EXISTS "Authenticated read defense_briefing_requests" ON public.defense_briefing_requests;

CREATE POLICY "Authenticated submit defense_briefing_requests"
ON public.defense_briefing_requests
FOR INSERT
TO authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(trim(email)) >= 5
  AND name IS NOT NULL
  AND length(trim(name)) >= 1
);

COMMENT ON TABLE public.audit_logs IS
  'CUI JUL15 2026: writes/reads via service_role only (no authenticated forge).';
COMMENT ON TABLE public.security_events IS
  'CUI JUL15 2026: writes/reads via service_role only (no authenticated forge).';
COMMENT ON TABLE public.incidents IS
  'CUI JUL15 2026: writes/reads via service_role only (no authenticated forge/update).';

COMMIT;
