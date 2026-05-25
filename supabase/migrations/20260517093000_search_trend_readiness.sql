-- Trend-aware search readiness cache.
-- Stores Google Trends / global trend queries that are relevant to Mycosoft
-- search, plus the deterministic widget and Earth filter plan used to warm
-- MINDEX before users search them.

CREATE TABLE IF NOT EXISTS public.search_trend_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo TEXT NOT NULL DEFAULT 'GLOBAL',
  source TEXT NOT NULL DEFAULT 'google_trends_rss',
  topic TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  relevance_score NUMERIC(8,3) NOT NULL DEFAULT 0,
  categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  primary_widget TEXT NULL,
  widget_order TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled_earth_filters JSONB NOT NULL DEFAULT '[]'::JSONB,
  live_result_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preload_sequence JSONB NOT NULL DEFAULT '[]'::JSONB,
  etl_missing TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  traffic TEXT NULL,
  related_queries TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_warmed_at TIMESTAMPTZ NULL,
  warm_status TEXT NOT NULL DEFAULT 'planned',
  UNIQUE (geo, normalized_query)
);

CREATE INDEX IF NOT EXISTS search_trend_readiness_updated_idx
  ON public.search_trend_readiness (updated_at DESC);
CREATE INDEX IF NOT EXISTS search_trend_readiness_score_idx
  ON public.search_trend_readiness (relevance_score DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS search_trend_readiness_categories_idx
  ON public.search_trend_readiness USING GIN (categories);
CREATE INDEX IF NOT EXISTS search_trend_readiness_query_idx
  ON public.search_trend_readiness USING GIN (to_tsvector('english', normalized_query));

ALTER TABLE public.search_trend_readiness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_trend_readiness.service_role_all" ON public.search_trend_readiness;
CREATE POLICY "search_trend_readiness.service_role_all"
  ON public.search_trend_readiness FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.search_trend_readiness TO service_role;
