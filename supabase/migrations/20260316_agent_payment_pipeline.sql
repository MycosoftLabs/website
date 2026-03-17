-- Migration: Agent Payment Pipeline
-- Creates profiles, payments, agent_sessions, and agent_api_keys tables
-- with RLS policies, triggers, indexes, and constraints.

-- =============================================================================
-- 1. PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT,
  display_name    TEXT,
  stripe_customer_id TEXT UNIQUE,
  sol_wallet      TEXT,
  eth_wallet      TEXT,
  btc_address     TEXT,
  balance_cents   INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  total_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_paid_cents >= 0),
  api_key_hash    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User/agent profiles with payment and wallet info';
COMMENT ON COLUMN public.profiles.balance_cents IS 'Current credit balance in cents';
COMMENT ON COLUMN public.profiles.api_key_hash IS 'SHA-256 hash of the active API key (legacy, prefer agent_api_keys)';

-- =============================================================================
-- 2. PAYMENTS
-- =============================================================================
CREATE TYPE public.payment_method AS ENUM ('card', 'crypto');
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE public.crypto_network AS ENUM ('solana', 'ethereum', 'base', 'bitcoin');

CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  method          public.payment_method NOT NULL,
  status          public.payment_status NOT NULL DEFAULT 'pending',
  -- Stripe fields
  stripe_payment_intent_id TEXT,
  -- Crypto fields
  tx_hash         TEXT,
  network         public.crypto_network,
  sender_address  TEXT,
  -- Metadata
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'All payment records (card + crypto)';

-- =============================================================================
-- 3. AGENT SESSIONS
-- =============================================================================
CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'expired', 'error');

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_id      UUID,  -- FK added after agent_api_keys table creation
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  status          public.session_status NOT NULL DEFAULT 'active',
  tokens_used     INTEGER NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  cost_cents      INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_sessions IS 'Metered agent session tracking';

-- =============================================================================
-- 4. AGENT API KEYS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agent_api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL UNIQUE,
  key_prefix      TEXT NOT NULL,  -- First 8 chars for display (e.g., "mk_a1b2...")
  name            TEXT DEFAULT 'Default',
  scopes          TEXT[] NOT NULL DEFAULT ARRAY['agent:read', 'agent:write'],
  is_active       BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day    INTEGER NOT NULL DEFAULT 10000,
  requests_today  INTEGER NOT NULL DEFAULT 0,
  requests_this_minute INTEGER NOT NULL DEFAULT 0,
  last_minute_reset TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_day_reset  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_api_keys IS 'API keys with SHA-256 hashed storage and rate limits';
COMMENT ON COLUMN public.agent_api_keys.key_hash IS 'SHA-256 hex digest of the raw API key';
COMMENT ON COLUMN public.agent_api_keys.key_prefix IS 'First 8 chars of key for identification';

-- Add FK from agent_sessions to agent_api_keys
ALTER TABLE public.agent_sessions
  ADD CONSTRAINT fk_agent_sessions_api_key
  FOREIGN KEY (api_key_id) REFERENCES public.agent_api_keys(id) ON DELETE SET NULL;

-- =============================================================================
-- 5. INDEXES
-- =============================================================================
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_profiles_sol_wallet ON public.profiles(sol_wallet) WHERE sol_wallet IS NOT NULL;
CREATE INDEX idx_profiles_eth_wallet ON public.profiles(eth_wallet) WHERE eth_wallet IS NOT NULL;

CREATE INDEX idx_payments_profile ON public.payments(profile_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_tx_hash ON public.payments(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);

CREATE INDEX idx_agent_sessions_profile ON public.agent_sessions(profile_id);
CREATE INDEX idx_agent_sessions_status ON public.agent_sessions(status);
CREATE INDEX idx_agent_sessions_api_key ON public.agent_sessions(api_key_id) WHERE api_key_id IS NOT NULL;

CREATE INDEX idx_api_keys_profile ON public.agent_api_keys(profile_id);
CREATE INDEX idx_api_keys_hash ON public.agent_api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON public.agent_api_keys(is_active) WHERE is_active = true;

-- =============================================================================
-- 6. AUTO-CREATE PROFILE ON AUTH.USERS INSERT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 7. UPDATED_AT TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 8. ROW LEVEL SECURITY
-- =============================================================================

-- Profiles: users can read and update their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Payments: users can read their own
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service role full access on payments"
  ON public.payments FOR ALL
  USING (auth.role() = 'service_role');

-- Agent sessions: users can read their own
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON public.agent_sessions FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service role full access on sessions"
  ON public.agent_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- API keys: users can read their own
ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own API keys"
  ON public.agent_api_keys FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service role full access on api_keys"
  ON public.agent_api_keys FOR ALL
  USING (auth.role() = 'service_role');
