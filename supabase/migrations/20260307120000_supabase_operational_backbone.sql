-- Migration: Supabase Operational Backbone
-- Date: 2026-03-07
-- Description: Canonical schema for spreadsheet domains, external systems, sync runs, and LLM usage.
-- Plan: supabase_operational_backbone_d160cd3a

-- =============================================================================
-- 1. apps_services (Apps & Services tab)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.apps_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    url TEXT,
    owner TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apps_services_category ON public.apps_services(category);
CREATE INDEX IF NOT EXISTS idx_apps_services_source ON public.apps_services(source_system, source_record_id);

COMMENT ON TABLE public.apps_services IS 'Canonical apps and services registry for master spreadsheet';

-- =============================================================================
-- 2. customer_vendors (Customer/Vendors tab)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customer_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('customer', 'vendor', 'partner')),
    contact TEXT,
    terms TEXT,
    notes TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_vendors_type ON public.customer_vendors(type);
CREATE INDEX IF NOT EXISTS idx_customer_vendors_source ON public.customer_vendors(source_system, source_record_id);

COMMENT ON TABLE public.customer_vendors IS 'Canonical customer and vendor registry';

-- =============================================================================
-- 3. commitments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    due_date DATE,
    owner TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commitments_status ON public.commitments(status);
CREATE INDEX IF NOT EXISTS idx_commitments_due_date ON public.commitments(due_date);
CREATE INDEX IF NOT EXISTS idx_commitments_source ON public.commitments(source_system, source_record_id);

-- =============================================================================
-- 4. liabilities
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount NUMERIC(12, 2),
    due_date DATE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liabilities_status ON public.liabilities(status);
CREATE INDEX IF NOT EXISTS idx_liabilities_source ON public.liabilities(source_system, source_record_id);

-- =============================================================================
-- 5. recruitment_roles
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recruitment_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'filled', 'cancelled')),
    owner TEXT,
    notes TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. recruitment_candidates
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.recruitment_roles(id) ON DELETE SET NULL,
    name TEXT,
    status TEXT DEFAULT 'applied',
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 7. production_runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.production_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product TEXT,
    quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 8. singlogs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.singlogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_date DATE DEFAULT CURRENT_DATE,
    log_type TEXT,
    message TEXT,
    source TEXT,
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    content_hash TEXT,
    updated_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_singlogs_date ON public.singlogs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_singlogs_type ON public.singlogs(log_type);

-- =============================================================================
-- 9. external_accounts (vendor/system accounts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.external_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    system_type TEXT NOT NULL,
    external_id TEXT,
    metadata JSONB DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(system_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_accounts_system ON public.external_accounts(system_type);

-- =============================================================================
-- 10. integration_connections
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name TEXT NOT NULL,
    connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'syncing')),
    credentials_status TEXT,
    last_sync_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 11. agent_skills_registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agent_skills_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL UNIQUE,
    skill_name TEXT NOT NULL,
    agent_id TEXT,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 12. mcp_connections_registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mcp_connections_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcp_id TEXT NOT NULL,
    mcp_name TEXT,
    connection_status TEXT DEFAULT 'disconnected',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 13. llm_usage_ledger
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.llm_usage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    estimated_cost NUMERIC(12, 6) DEFAULT 0,
    tool_or_workflow_owner TEXT,
    requesting_agent TEXT,
    requesting_app TEXT,
    user_scope TEXT,
    workspace_scope TEXT,
    related_business_object_id TEXT,
    related_run_id TEXT,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_provider ON public.llm_usage_ledger(provider);
CREATE INDEX IF NOT EXISTS idx_llm_usage_recorded ON public.llm_usage_ledger(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_app ON public.llm_usage_ledger(requesting_app);

COMMENT ON TABLE public.llm_usage_ledger IS 'Canonical LLM token and cost usage for CFO/COO/CTO reporting';

-- =============================================================================
-- 14. sync_runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    source_system TEXT,
    target_system TEXT,
    status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'partial')),
    records_processed INTEGER DEFAULT 0,
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_type ON public.sync_runs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON public.sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON public.sync_runs(status);

COMMENT ON TABLE public.sync_runs IS 'Durable audit of sync job runs for n8n/Zapier orchestration';

-- =============================================================================
-- 15. external_record_links (cross-system identity linkage)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.external_record_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_table TEXT NOT NULL,
    canonical_record_id UUID NOT NULL,
    source_system TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(canonical_table, canonical_record_id, source_system, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_links_canonical ON public.external_record_links(canonical_table, canonical_record_id);
CREATE INDEX IF NOT EXISTS idx_ext_links_source ON public.external_record_links(source_system, source_record_id);

COMMENT ON TABLE public.external_record_links IS 'Maps canonical records to Asana/Notion/GitHub/sheet tab row IDs';

-- =============================================================================
-- 16. sheet_sync_status (durable sync status per tab)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sheet_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    rows_synced INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(spreadsheet_id, tab_name)
);

CREATE INDEX IF NOT EXISTS idx_sheet_sync_tab ON public.sheet_sync_status(spreadsheet_id, tab_name);

-- =============================================================================
-- RLS: service role bypasses; allow authenticated staff for operational tables
-- =============================================================================
ALTER TABLE public.apps_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.singlogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_connections_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_sync_status ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Policies allow backend/authenticated access for operational tables.
CREATE POLICY "Operational access apps_services" ON public.apps_services
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access customer_vendors" ON public.customer_vendors
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access commitments" ON public.commitments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access liabilities" ON public.liabilities
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access recruitment_roles" ON public.recruitment_roles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access recruitment_candidates" ON public.recruitment_candidates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access production_runs" ON public.production_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access singlogs" ON public.singlogs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access external_accounts" ON public.external_accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access integration_connections" ON public.integration_connections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access agent_skills_registry" ON public.agent_skills_registry
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access mcp_connections_registry" ON public.mcp_connections_registry
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access llm_usage_ledger" ON public.llm_usage_ledger
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access sync_runs" ON public.sync_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access external_record_links" ON public.external_record_links
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Operational access sheet_sync_status" ON public.sheet_sync_status
  FOR ALL USING (true) WITH CHECK (true);

-- Grant to service_role and authenticated
GRANT ALL ON public.apps_services TO service_role;
GRANT ALL ON public.customer_vendors TO service_role;
GRANT ALL ON public.commitments TO service_role;
GRANT ALL ON public.liabilities TO service_role;
GRANT ALL ON public.recruitment_roles TO service_role;
GRANT ALL ON public.recruitment_candidates TO service_role;
GRANT ALL ON public.production_runs TO service_role;
GRANT ALL ON public.singlogs TO service_role;
GRANT ALL ON public.external_accounts TO service_role;
GRANT ALL ON public.integration_connections TO service_role;
GRANT ALL ON public.agent_skills_registry TO service_role;
GRANT ALL ON public.mcp_connections_registry TO service_role;
GRANT ALL ON public.llm_usage_ledger TO service_role;
GRANT ALL ON public.sync_runs TO service_role;
GRANT ALL ON public.external_record_links TO service_role;
GRANT ALL ON public.sheet_sync_status TO service_role;
