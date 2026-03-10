-- Migration: hardware_network_devices for master spreadsheet hardware tab
-- Date: 2026-03-07
-- Plan: supabase_operational_backbone (hardware tab projection)

CREATE TABLE IF NOT EXISTS public.hardware_network_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    device_name TEXT,
    host TEXT,
    port TEXT,
    connection_type TEXT,
    last_seen TIMESTAMPTZ,
    status TEXT DEFAULT 'unknown',
    source_system TEXT,
    source_record_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hardware_network_devices_device_id ON public.hardware_network_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_hardware_network_devices_status ON public.hardware_network_devices(status);

COMMENT ON TABLE public.hardware_network_devices IS 'Canonical hardware/network devices for master spreadsheet; populated by MAS device ingestor';
