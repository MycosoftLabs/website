-- Migration: Agent Platform v3
-- ADDS: agent_usage_log, agent_events, agent_temp_keys tables
-- ADDS: validate_api_key, increment_api_usage, get_agent_usage_summary, get_upsell_message RPCs
-- Builds on 20260316_agent_payment_pipeline.sql

-- =============================================================================
-- 1. AGENT USAGE LOG TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agent_usage_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      UUID REFERENCES public.agent_api_keys(id) ON DELETE SET NULL,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  method          TEXT NOT NULL DEFAULT 'GET',
  status_code     INTEGER,
  cost_cents      INTEGER NOT NULL DEFAULT 1,
  latency_ms      INTEGER,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_profile ON public.agent_usage_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_api_key ON public.agent_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON public.agent_usage_log(created_at);

ALTER TABLE public.agent_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage logs"
  ON public.agent_usage_log FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access on usage_log"
  ON public.agent_usage_log FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. AGENT EVENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agent_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_id      UUID REFERENCES public.agent_api_keys(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  message         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_profile ON public.agent_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.agent_events(created_at);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own events"
  ON public.agent_events FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access on events"
  ON public.agent_events FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 3. AGENT TEMP KEYS TABLE (for Stripe checkout flow)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agent_temp_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT UNIQUE NOT NULL,
  raw_key         TEXT NOT NULL,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_temp_keys_session ON public.agent_temp_keys(session_id);

ALTER TABLE public.agent_temp_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on temp_keys"
  ON public.agent_temp_keys FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 4. ADD rotated_from AND revoke columns to agent_api_keys
-- =============================================================================
ALTER TABLE public.agent_api_keys
  ADD COLUMN IF NOT EXISTS rotated_from UUID REFERENCES public.agent_api_keys(id),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- =============================================================================
-- 5. ADD stripe_checkout_session_id to payments
-- =============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- =============================================================================
-- 6. RPC: validate_api_key
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE (
  api_key_id UUID,
  profile_id UUID,
  is_active BOOLEAN,
  scopes TEXT[],
  balance_cents INTEGER,
  rate_limit_per_minute INTEGER,
  rate_limit_per_day INTEGER,
  requests_this_minute INTEGER,
  requests_today INTEGER
) AS $$
BEGIN
  -- Reset minute counter if more than 1 minute has elapsed
  UPDATE public.agent_api_keys
  SET requests_this_minute = 0, last_minute_reset = now()
  WHERE key_hash = p_key_hash
    AND last_minute_reset < now() - interval '1 minute';

  -- Reset daily counter if more than 1 day has elapsed
  UPDATE public.agent_api_keys
  SET requests_today = 0, last_day_reset = now()
  WHERE key_hash = p_key_hash
    AND last_day_reset < now() - interval '1 day';

  -- Update last_used_at
  UPDATE public.agent_api_keys
  SET last_used_at = now()
  WHERE key_hash = p_key_hash;

  RETURN QUERY
  SELECT
    k.id AS api_key_id,
    k.profile_id,
    k.is_active,
    k.scopes,
    p.balance_cents,
    k.rate_limit_per_minute,
    k.rate_limit_per_day,
    k.requests_this_minute,
    k.requests_today
  FROM public.agent_api_keys k
  JOIN public.profiles p ON p.id = k.profile_id
  WHERE k.key_hash = p_key_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. RPC: increment_api_usage
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_api_key_id UUID, p_cost_cents INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  v_profile_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Get profile_id from key
  SELECT profile_id INTO v_profile_id
  FROM public.agent_api_keys
  WHERE id = p_api_key_id;

  IF v_profile_id IS NULL THEN
    RETURN -1;
  END IF;

  -- Increment counters on the key
  UPDATE public.agent_api_keys
  SET requests_this_minute = requests_this_minute + 1,
      requests_today = requests_today + 1
  WHERE id = p_api_key_id;

  -- Deduct from balance
  UPDATE public.profiles
  SET balance_cents = balance_cents - p_cost_cents
  WHERE id = v_profile_id
  RETURNING balance_cents INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. RPC: get_agent_usage_summary
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_agent_usage_summary(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'balance_cents', p.balance_cents,
    'total_paid_cents', p.total_paid_cents,
    'active_keys', (SELECT count(*) FROM public.agent_api_keys WHERE profile_id = p_profile_id AND is_active = true),
    'total_requests_24h', (SELECT coalesce(count(*), 0) FROM public.agent_usage_log WHERE profile_id = p_profile_id AND created_at > now() - interval '24 hours'),
    'total_cost_24h', (SELECT coalesce(sum(cost_cents), 0) FROM public.agent_usage_log WHERE profile_id = p_profile_id AND created_at > now() - interval '24 hours'),
    'recent_events', (SELECT coalesce(json_agg(e ORDER BY e.created_at DESC), '[]'::json) FROM (SELECT id, event_type, severity, message, metadata, created_at FROM public.agent_events WHERE profile_id = p_profile_id ORDER BY created_at DESC LIMIT 10) e)
  ) INTO v_result
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. RPC: get_upsell_message
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_upsell_message(p_event_type TEXT, p_balance_cents INTEGER)
RETURNS JSON AS $$
BEGIN
  IF p_event_type = 'balance_exhausted' THEN
    RETURN json_build_object(
      'title', 'Balance Exhausted',
      'message', 'Your API balance has been depleted. Top up to continue using the worldstate API.',
      'action_url', '/agent',
      'action_label', 'Top Up Now'
    );
  ELSIF p_event_type = 'balance_low' THEN
    RETURN json_build_object(
      'title', 'Low Balance Warning',
      'message', format('Your balance is down to $%s. Consider topping up to avoid interruptions.', (p_balance_cents::numeric / 100)::text),
      'action_url', '/agent',
      'action_label', 'Top Up'
    );
  ELSIF p_event_type = 'rate_limit_hit' THEN
    RETURN json_build_object(
      'title', 'Rate Limit Reached',
      'message', 'You have hit your rate limit. Requests will resume shortly.',
      'action_url', '/agent',
      'action_label', 'View Usage'
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- DONE! Agent platform v3 tables and functions ready.
-- =============================================================================
