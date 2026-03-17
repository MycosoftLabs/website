-- Migration: Agent Payment Pipeline v2
-- WORKS WITH EXISTING TABLES: profiles, payments, economy_wallets, api_usage
-- ADDS: missing columns to profiles & payments, creates agent_api_keys & agent_sessions
-- Run this in Supabase Dashboard → SQL Editor

-- =============================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING PROFILES TABLE
-- =============================================================================
-- The existing profiles table has: id, username, full_name, avatar_url, organization,
-- role, stripe_customer_id, stripe_subscription_id, subscription_tier/status/period_end

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS sol_wallet TEXT,
  ADD COLUMN IF NOT EXISTS eth_wallet TEXT,
  ADD COLUMN IF NOT EXISTS btc_address TEXT,
  ADD COLUMN IF NOT EXISTS balance_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT false;

-- Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- =============================================================================
-- 2. ADD MISSING COLUMNS TO EXISTING PAYMENTS TABLE
-- =============================================================================
-- The existing payments table has: id, user_id, amount, currency, description,
-- status, stripe_invoice_id, stripe_payment_intent_id

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'card',  -- 'card' or 'crypto'
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT,  -- 'solana', 'ethereum', 'base', 'bitcoin'
  ADD COLUMN IF NOT EXISTS sender_address TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================================================
-- 3. CREATE AGENT API KEYS TABLE
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

-- =============================================================================
-- 4. CREATE AGENT SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_id      UUID REFERENCES public.agent_api_keys(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'error')),
  tokens_used     INTEGER NOT NULL DEFAULT 0,
  cost_cents      INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_sessions IS 'Metered agent session tracking';

-- =============================================================================
-- 5. INDEXES
-- =============================================================================
-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_sol_wallet ON public.profiles(sol_wallet) WHERE sol_wallet IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_eth_wallet ON public.profiles(eth_wallet) WHERE eth_wallet IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_agent ON public.profiles(is_agent) WHERE is_agent = true;

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON public.payments(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- Agent API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_profile ON public.agent_api_keys(profile_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.agent_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.agent_api_keys(is_active) WHERE is_active = true;

-- Agent sessions indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_profile ON public.agent_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON public.agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_api_key ON public.agent_sessions(api_key_id) WHERE api_key_id IS NOT NULL;

-- =============================================================================
-- 6. UPDATE ECONOMY_WALLETS WITH REAL ADDRESSES
-- =============================================================================
UPDATE public.economy_wallets
SET address = 'BdmxPETu9qx3dXCPhf74C1eTaPUrDhP59DDuBWbhdGMY'
WHERE wallet_type = 'solana';

UPDATE public.economy_wallets
SET address = 'bc1qjksusf6mjst30cpc4489qvjhaa0xw97xhgy8s2'
WHERE wallet_type = 'bitcoin';

-- Add ETH/Base wallet if not exists
INSERT INTO public.economy_wallets (wallet_type, address, balance, currency)
VALUES ('ethereum', '0xb9110785C81E6e428A70Dc7C14a67dC1675b92ae', 0, 'ETH')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 7. UPDATED_AT TRIGGER (if not already exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_payments_updated_at') THEN
    CREATE TRIGGER set_payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- =============================================================================
-- 8. ROW LEVEL SECURITY FOR NEW TABLES
-- =============================================================================

-- Agent API keys: users can read their own
ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own API keys"
  ON public.agent_api_keys FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access on api_keys"
  ON public.agent_api_keys FOR ALL
  USING (auth.role() = 'service_role');

-- Agent sessions: users can read their own
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON public.agent_sessions FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access on sessions"
  ON public.agent_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 9. HELPER FUNCTION: Look up profile by wallet address
-- =============================================================================
CREATE OR REPLACE FUNCTION public.find_profile_by_wallet(wallet_addr TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.profiles
  WHERE sol_wallet = wallet_addr
     OR eth_wallet = wallet_addr
     OR btc_address = wallet_addr
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- DONE! Tables ready for agent payment pipeline.
-- =============================================================================
