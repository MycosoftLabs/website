-- Migration: Create presence tables for MYCA live awareness
-- Date: 2026-02-24
-- Description: active_sessions, user_heartbeat, api_usage_log for real-time user presence

-- Helper: Check if current user is staff (admin, superuser, owner, staff)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superuser', 'owner', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 1. active_sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    app_context TEXT DEFAULT 'web',
    page_path TEXT,
    device_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON public.active_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON public.active_sessions(last_activity_at DESC);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sessions
CREATE POLICY "Users can insert own sessions" ON public.active_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.active_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.active_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Users can view own; staff can view all
CREATE POLICY "Users or staff can view sessions" ON public.active_sessions
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO authenticated;

COMMENT ON TABLE public.active_sessions IS 'Tracks active user sessions for MYCA presence awareness';

-- =============================================================================
-- 2. user_heartbeat
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_heartbeat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    heartbeat_at TIMESTAMPTZ DEFAULT now(),
    is_online BOOLEAN DEFAULT true,
    current_page TEXT,
    activity_type TEXT DEFAULT 'active',
    session_id TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_user ON public.user_heartbeat(user_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_recent ON public.user_heartbeat(heartbeat_at DESC);

ALTER TABLE public.user_heartbeat ENABLE ROW LEVEL SECURITY;

-- Users can insert their own heartbeats
CREATE POLICY "Users can insert own heartbeat" ON public.user_heartbeat
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own; staff can view all
CREATE POLICY "Users or staff can view heartbeat" ON public.user_heartbeat
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff());

GRANT SELECT, INSERT ON public.user_heartbeat TO authenticated;

COMMENT ON TABLE public.user_heartbeat IS 'Frequent heartbeat records for online status';

-- =============================================================================
-- 3. api_usage_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    called_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user ON public.api_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_recent ON public.api_usage_log(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON public.api_usage_log(endpoint);

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert (their own or anonymous)
CREATE POLICY "Authenticated can insert api usage" ON public.api_usage_log
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- Users can view own; staff can view all
CREATE POLICY "Users or staff can view api usage" ON public.api_usage_log
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

GRANT SELECT, INSERT ON public.api_usage_log TO authenticated;

COMMENT ON TABLE public.api_usage_log IS 'API call logs for data intake/usage visibility';
