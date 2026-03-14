-- Agent Registry & Environmental Quality Cache Tables
-- For use with Mindex ETL pipeline and NatureOS Dashboard

-- Aggregated agent/bot/digital being population stats
CREATE TABLE IF NOT EXISTS agent_registry_stats (
  id TEXT PRIMARY KEY DEFAULT 'global-latest',
  total_digital_beings BIGINT NOT NULL DEFAULT 0,
  total_agents BIGINT NOT NULL DEFAULT 0,
  total_bots BIGINT NOT NULL DEFAULT 0,
  total_models INTEGER NOT NULL DEFAULT 0,
  total_mcp_servers INTEGER NOT NULL DEFAULT 0,
  creations_today INTEGER NOT NULL DEFAULT 0,
  archivals_today INTEGER NOT NULL DEFAULT 0,
  deletions_today INTEGER NOT NULL DEFAULT 0,
  agent_traffic_percent REAL NOT NULL DEFAULT 51.2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual agent/bot/model/MCP server entries for directory browsing
CREATE TABLE IF NOT EXISTS agent_registry_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('agent', 'bot', 'model', 'mcp_server')),
  platform TEXT NOT NULL DEFAULT 'unknown',
  builder TEXT NOT NULL DEFAULT 'unknown',
  description TEXT,
  capabilities TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deprecated')),
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast filtered queries
CREATE INDEX IF NOT EXISTS idx_agent_entries_category ON agent_registry_entries(category);
CREATE INDEX IF NOT EXISTS idx_agent_entries_platform ON agent_registry_entries(platform);
CREATE INDEX IF NOT EXISTS idx_agent_entries_status ON agent_registry_entries(status);
CREATE INDEX IF NOT EXISTS idx_agent_entries_updated ON agent_registry_entries(updated_at DESC);

-- Environmental quality cached readings from external APIs
CREATE TABLE IF NOT EXISTS environmental_quality_cache (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('air', 'water', 'ground')),
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_env_quality_type ON environmental_quality_cache(metric_type);
CREATE INDEX IF NOT EXISTS idx_env_quality_fetched ON environmental_quality_cache(fetched_at DESC);

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE agent_registry_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_quality_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dashboard
CREATE POLICY "Allow public read for agent stats" ON agent_registry_stats
  FOR SELECT USING (true);

CREATE POLICY "Allow public read for agent entries" ON agent_registry_entries
  FOR SELECT USING (true);

CREATE POLICY "Allow public read for env quality" ON environmental_quality_cache
  FOR SELECT USING (true);

-- Allow service role to write (for ETL pipeline)
CREATE POLICY "Allow service write for agent stats" ON agent_registry_stats
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service write for agent entries" ON agent_registry_entries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service write for env quality" ON environmental_quality_cache
  FOR ALL USING (true) WITH CHECK (true);
