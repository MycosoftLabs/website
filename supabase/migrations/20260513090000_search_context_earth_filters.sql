-- Context-aware search, mobile widget ranking, and Earth Simulator filter telemetry.

CREATE TABLE IF NOT EXISTS public.search_intent_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NULL,
  session_id TEXT NULL,
  query_text TEXT NOT NULL,
  classification TEXT NOT NULL,
  intent_type TEXT NOT NULL,
  confidence NUMERIC(5,4) NULL,
  primary_widget TEXT NULL,
  secondary_widgets TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  result_counts JSONB NOT NULL DEFAULT '{}'::JSONB,
  source TEXT NOT NULL DEFAULT 'search'
);

CREATE TABLE IF NOT EXISTS public.search_earth_filter_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  intent_telemetry_id UUID NULL REFERENCES public.search_intent_telemetry(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  enabled_filters JSONB NOT NULL DEFAULT '[]'::JSONB,
  disabled_filters TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  layer_state JSONB NOT NULL DEFAULT '{}'::JSONB,
  search_terms JSONB NOT NULL DEFAULT '{}'::JSONB,
  agent_refinement JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS public.search_widget_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NULL,
  session_id TEXT NULL,
  query_text TEXT NOT NULL,
  widget_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  interaction TEXT NOT NULL DEFAULT 'shown',
  device_class TEXT NOT NULL DEFAULT 'unknown'
);

CREATE TABLE IF NOT EXISTS public.search_agent_audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NULL,
  agent_id TEXT NULL,
  query_text TEXT NOT NULL,
  action TEXT NOT NULL,
  proposed_filters JSONB NOT NULL DEFAULT '[]'::JSONB,
  resolved_filters JSONB NOT NULL DEFAULT '[]'::JSONB,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS search_intent_telemetry_created_idx
  ON public.search_intent_telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS search_intent_telemetry_query_idx
  ON public.search_intent_telemetry USING GIN (to_tsvector('english', query_text));
CREATE INDEX IF NOT EXISTS search_earth_filter_decisions_created_idx
  ON public.search_earth_filter_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS search_widget_usage_widget_created_idx
  ON public.search_widget_usage (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_agent_audit_records_created_idx
  ON public.search_agent_audit_records (created_at DESC);

ALTER TABLE public.search_intent_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_earth_filter_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_widget_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_agent_audit_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_intent_telemetry.service_role_all" ON public.search_intent_telemetry;
CREATE POLICY "search_intent_telemetry.service_role_all"
  ON public.search_intent_telemetry FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "search_earth_filter_decisions.service_role_all" ON public.search_earth_filter_decisions;
CREATE POLICY "search_earth_filter_decisions.service_role_all"
  ON public.search_earth_filter_decisions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "search_widget_usage.service_role_all" ON public.search_widget_usage;
CREATE POLICY "search_widget_usage.service_role_all"
  ON public.search_widget_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "search_agent_audit_records.service_role_all" ON public.search_agent_audit_records;
CREATE POLICY "search_agent_audit_records.service_role_all"
  ON public.search_agent_audit_records FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.search_intent_telemetry TO service_role;
GRANT ALL ON public.search_earth_filter_decisions TO service_role;
GRANT ALL ON public.search_widget_usage TO service_role;
GRANT ALL ON public.search_agent_audit_records TO service_role;
