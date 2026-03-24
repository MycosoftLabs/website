-- Migration: Mycosoft Unified Capabilities
-- Date: 2026-03-24
-- Description: Provisioning relational data foundations for AVANI, NLM, CREP, MINDEX, SEARCH, MMP, and MDP.

-- =============================================================================
-- 1. AVANI (Avatar intelligence & emotional state persistence)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.avani_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avatar_name TEXT NOT NULL,
    associated_agent_id TEXT,
    emotional_state JSONB DEFAULT '{"mood": "neutral", "energy": 0.8}'::jsonb,
    voice_profile_id TEXT,
    visual_mesh_url TEXT,
    active BOOLEAN DEFAULT true,
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_avani_avatars_agent ON public.avani_avatars(associated_agent_id);

-- =============================================================================
-- 2. NLM (Nature Language Model training & checkpoints)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.nlm_training_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_name TEXT NOT NULL,
    model_architecture TEXT NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    status TEXT DEFAULT 'training' CHECK (status IN ('training', 'paused', 'completed', 'failed')),
    current_epoch INTEGER DEFAULT 0,
    current_loss NUMERIC(10, 6),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.nlm_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.nlm_training_runs(id) ON DELETE CASCADE,
    epoch INTEGER,
    s3_url TEXT NOT NULL,
    validation_score NUMERIC(10, 6),
    is_best BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. MINDEX (Proxy Cache for Cross-DB queries)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mindex_proxy_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gbif_id TEXT,
    scientific_name TEXT NOT NULL,
    taxonomy JSONB DEFAULT '{}',
    imageUrl TEXT,
    primary_habitat TEXT,
    last_synced_from_mindex_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_mindex_proxy_name ON public.mindex_proxy_cache(scientific_name);

-- =============================================================================
-- 4. CREP (Fungal computing & resource allocation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.crep_compute_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_name TEXT NOT NULL,
    node_type TEXT CHECK (node_type IN ('edge', 'mycobrain', 'cloud_gpu', 'fungal_bridge')),
    status TEXT DEFAULT 'idle',
    compute_capacity_teraflops NUMERIC(8, 2),
    current_load_percentage NUMERIC(5, 2) DEFAULT 0,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crep_workloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES public.crep_compute_nodes(id) ON DELETE SET NULL,
    workload_type TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    status TEXT DEFAULT 'queued',
    payload JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- =============================================================================
-- 5. SEARCH (Global search index vectors & history)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.global_search_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Relies on pgvector extension
    last_indexed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_indices_type ON public.global_search_indices(entity_type);

CREATE TABLE IF NOT EXISTS public.search_query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    query_text TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    latency_ms INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. MMP (Mycosoft Mesh Protocol Topography)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mmp_mesh_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mac_address TEXT UNIQUE,
    ip_address TEXT,
    battery_level INTEGER,
    signal_strength INTEGER,
    firmware_version TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8)
);

CREATE TABLE IF NOT EXISTS public.mmp_routing_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id UUID REFERENCES public.mmp_mesh_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES public.mmp_mesh_nodes(id) ON DELETE CASCADE,
    hop_count INTEGER DEFAULT 1,
    link_quality INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_node_id, target_node_id)
);

-- =============================================================================
-- 7. MDP (Mycosoft Data Protocol Streams)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mdp_data_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_name TEXT NOT NULL UNIQUE,
    protocol_version TEXT DEFAULT '1.0',
    encryption_type TEXT DEFAULT 'AES256',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mdp_payloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID REFERENCES public.mdp_data_streams(id) ON DELETE CASCADE,
    sequence_number BIGINT NOT NULL,
    payload_hash TEXT NOT NULL,
    byte_size INTEGER,
    received_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdp_payloads_stream ON public.mdp_payloads(stream_id, sequence_number);

-- =============================================================================
-- RLS Policies & Permissions
-- =============================================================================
ALTER TABLE public.avani_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nlm_training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nlm_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindex_proxy_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crep_compute_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crep_workloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_search_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmp_mesh_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmp_routing_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdp_data_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdp_payloads ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted operational backend access for Service Roles
CREATE POLICY "Operational access all" ON public.avani_avatars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.nlm_training_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.nlm_checkpoints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.mindex_proxy_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.crep_compute_nodes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.crep_workloads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.global_search_indices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.search_query_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.mmp_mesh_nodes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.mmp_routing_tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.mdp_data_streams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Operational access all" ON public.mdp_payloads FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.avani_avatars TO service_role;
GRANT ALL ON public.nlm_training_runs TO service_role;
GRANT ALL ON public.nlm_checkpoints TO service_role;
GRANT ALL ON public.mindex_proxy_cache TO service_role;
GRANT ALL ON public.crep_compute_nodes TO service_role;
GRANT ALL ON public.crep_workloads TO service_role;
GRANT ALL ON public.global_search_indices TO service_role;
GRANT ALL ON public.search_query_history TO service_role;
GRANT ALL ON public.mmp_mesh_nodes TO service_role;
GRANT ALL ON public.mmp_routing_tables TO service_role;
GRANT ALL ON public.mdp_data_streams TO service_role;
GRANT ALL ON public.mdp_payloads TO service_role;
