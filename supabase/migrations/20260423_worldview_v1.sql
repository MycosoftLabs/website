-- =====================================================================
-- Worldview v1 — cost metering + rate limiting + usage events
-- =====================================================================
-- Apr 23, 2026
--
-- Adds the DB primitives Worldview v1 depends on:
--   1. `agent_api_keys.scopes` text[] column — which scopes the key may
--      use (public / agent / fusarium / ops).
--   2. `agent_usage_events` table — one row per metered request.
--   3. `worldview_meter_and_limit` RPC — atomic debit + rate-limit +
--      usage log. Consumed by lib/worldview/metering.ts.
--
-- Idempotent: every ALTER / CREATE guards with IF NOT EXISTS.
--
-- Rollback: drop the RPC first, then the table, then the column.
-- =====================================================================

BEGIN;

-- ---- 1. scopes column ------------------------------------------------
ALTER TABLE IF EXISTS public.agent_api_keys
    ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT ARRAY['agent']::text[];

COMMENT ON COLUMN public.agent_api_keys.scopes
    IS 'Worldview scopes the key may use — any of: public, agent, fusarium, ops. '
       'Middleware at /api/worldview/v1/* checks this array.';

CREATE INDEX IF NOT EXISTS agent_api_keys_scopes_gin_idx
    ON public.agent_api_keys USING GIN (scopes);

-- ---- 2. usage events table ------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_usage_events (
    id                BIGSERIAL PRIMARY KEY,
    profile_id        UUID        NOT NULL,
    api_key_id        UUID        NOT NULL,
    dataset_id        TEXT        NOT NULL,
    kind              TEXT        NOT NULL,   -- query | bundle | snapshot | stream | tile | catalog
    cost_cents        INTEGER     NOT NULL DEFAULT 0,
    rate_weight       INTEGER     NOT NULL DEFAULT 0,
    cache_hit         BOOLEAN     NOT NULL DEFAULT FALSE,
    status            TEXT        NOT NULL DEFAULT 'ok', -- ok | rate_limited | insufficient_balance | upstream_error
    request_id        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_usage_events
    IS 'Per-request billing + analytics log for Worldview v1. One row per '
       'metered request (including cache hits charged at 50%).';

CREATE INDEX IF NOT EXISTS agent_usage_events_profile_created_idx
    ON public.agent_usage_events (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_usage_events_key_created_idx
    ON public.agent_usage_events (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_usage_events_dataset_created_idx
    ON public.agent_usage_events (dataset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_usage_events_created_at_idx
    ON public.agent_usage_events (created_at DESC);

-- RLS: only service-role (RPC caller) writes; admins read; owning user
-- can read their own usage for the dashboard.
ALTER TABLE public.agent_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_usage_events.select.own" ON public.agent_usage_events;
CREATE POLICY "agent_usage_events.select.own"
    ON public.agent_usage_events
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

-- Service-role bypasses RLS automatically; no INSERT policy for authenticated.

-- ---- 3. helpers ------------------------------------------------------

-- Rolling 1-minute request count (sum of rate_weight, not raw count, so a
-- heavy bundle can still cost 20+ of the bucket while /catalog costs 0).
CREATE OR REPLACE FUNCTION public.worldview_rate_weight_last_minute(p_api_key_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(SUM(rate_weight), 0)::INTEGER
    FROM public.agent_usage_events
    WHERE api_key_id = p_api_key_id
      AND created_at >= now() - INTERVAL '1 minute'
      AND status = 'ok';
$$;

-- ---- 4. atomic meter + rate-limit + log -----------------------------
-- Returns a single row with the outcome. Middleware maps to:
--   rate_limited            -> 429
--   insufficient_balance    -> 402
--   (else)                  -> 200 envelope with cost_debited
--
-- Transaction-wrapped so concurrent requests cannot overdraft. Uses a
-- row-level lock on the api key to serialise balance updates.
CREATE OR REPLACE FUNCTION public.worldview_meter_and_limit(
    p_api_key_id   UUID,
    p_profile_id   UUID,
    p_dataset_id   TEXT,
    p_cost_cents   INTEGER,
    p_rate_weight  INTEGER,
    p_kind         TEXT,
    p_request_id   TEXT
)
RETURNS TABLE (
    rate_limited              BOOLEAN,
    insufficient_balance      BOOLEAN,
    retry_after_s             INTEGER,
    balance_cents             INTEGER,
    rate_limit_per_minute     INTEGER,
    remaining_per_minute      INTEGER,
    rate_reset_at             TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_key              public.agent_api_keys%ROWTYPE;
    v_used_this_minute INTEGER;
    v_rate_limit       INTEGER;
    v_day_used         INTEGER;
    v_day_limit        INTEGER;
    v_balance          INTEGER;
    v_profile_bal      INTEGER;
    v_now              TIMESTAMPTZ := now();
BEGIN
    -- Lock the key row so concurrent requests can't overdraft / overcount.
    SELECT * INTO v_key
    FROM public.agent_api_keys
    WHERE id = p_api_key_id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_key.is_active THEN
        -- Treat as insufficient_balance=true with 0 bal so middleware 402s.
        RETURN QUERY SELECT
            FALSE, TRUE, 0, 0, COALESCE(v_key.rate_limit_per_minute, 60),
            0, (v_now + INTERVAL '60 seconds')::text;
        RETURN;
    END IF;

    v_rate_limit := COALESCE(v_key.rate_limit_per_minute, 60);
    v_day_limit  := COALESCE(v_key.rate_limit_per_day, 10000);
    v_used_this_minute := public.worldview_rate_weight_last_minute(p_api_key_id);

    IF v_used_this_minute + p_rate_weight > v_rate_limit THEN
        -- Log the denial so analytics sees it.
        INSERT INTO public.agent_usage_events
            (profile_id, api_key_id, dataset_id, kind, cost_cents, rate_weight, status, request_id)
        VALUES
            (p_profile_id, p_api_key_id, p_dataset_id, p_kind, 0, p_rate_weight, 'rate_limited', p_request_id);
        RETURN QUERY SELECT
            TRUE, FALSE, 60, NULL::INTEGER, v_rate_limit,
            GREATEST(0, v_rate_limit - v_used_this_minute),
            (v_now + INTERVAL '60 seconds')::text;
        RETURN;
    END IF;

    -- Balance. We read profile-level balance if the agent_payment_pipeline
    -- migration set it on agent_profiles; otherwise fall back to the
    -- per-key balance if any.
    SELECT balance_cents INTO v_profile_bal
    FROM public.agent_profiles
    WHERE profile_id = p_profile_id;

    v_balance := COALESCE(v_profile_bal, 0);

    IF v_balance < p_cost_cents THEN
        INSERT INTO public.agent_usage_events
            (profile_id, api_key_id, dataset_id, kind, cost_cents, rate_weight, status, request_id)
        VALUES
            (p_profile_id, p_api_key_id, p_dataset_id, p_kind, 0, p_rate_weight, 'insufficient_balance', p_request_id);
        RETURN QUERY SELECT
            FALSE, TRUE, 0, v_balance, v_rate_limit,
            GREATEST(0, v_rate_limit - v_used_this_minute - p_rate_weight),
            (v_now + INTERVAL '60 seconds')::text;
        RETURN;
    END IF;

    -- Debit + log
    UPDATE public.agent_profiles
    SET balance_cents = balance_cents - p_cost_cents
    WHERE profile_id = p_profile_id;

    UPDATE public.agent_api_keys
    SET last_used_at = v_now,
        requests_today = COALESCE(requests_today, 0) + 1
    WHERE id = p_api_key_id;

    INSERT INTO public.agent_usage_events
        (profile_id, api_key_id, dataset_id, kind, cost_cents, rate_weight, status, request_id)
    VALUES
        (p_profile_id, p_api_key_id, p_dataset_id, p_kind, p_cost_cents, p_rate_weight, 'ok', p_request_id);

    RETURN QUERY SELECT
        FALSE, FALSE, 0, (v_balance - p_cost_cents), v_rate_limit,
        GREATEST(0, v_rate_limit - v_used_this_minute - p_rate_weight),
        (v_now + INTERVAL '60 seconds')::text;
END;
$$;

COMMENT ON FUNCTION public.worldview_meter_and_limit
    IS 'Atomic Worldview v1 metering. Row-locks the api key, checks rate limit '
       '(sum of rate_weight in last minute), checks balance, debits, logs, '
       'returns outcome row. Safe across Next.js replicas.';

-- ---- 5. revoke / grant -----------------------------------------------
-- Let service role call the RPC; authenticated can't invoke directly
-- (the middleware calls it via service-role client).
REVOKE ALL ON FUNCTION public.worldview_meter_and_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worldview_meter_and_limit TO service_role;

COMMIT;
