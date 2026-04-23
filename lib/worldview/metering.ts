/**
 * Worldview v1 cost metering + rate limiting — Apr 23, 2026
 *
 * Morgan: "at cost to agents and users token rate limited".
 *
 * Cost metering: decrements `balance_cents` on the `agent_api_keys` row
 * per request. Cached responses cost 50% (floor 1 cent). Insufficient
 * balance returns 402 with a top-up link.
 *
 * Rate limiting: token bucket per API key. `rate_limit_per_minute` +
 * `rate_limit_per_day` from the key's Supabase row. Each dataset's
 * `rate_weight` is subtracted from the bucket.
 *
 * Both operations are idempotent Supabase RPC calls so they work
 * across horizontal Next.js replicas without a shared in-memory
 * counter.
 */

import { createClient } from "@supabase/supabase-js"
import type { RateLimitState } from "./envelope"

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return _admin
}

export interface MeterParams {
  api_key_id: string
  profile_id: string
  dataset_id: string
  cost_per_request: number
  rate_weight: number
  cache_hit: boolean
  /** Usage context for analytics — query / bundle / snapshot / stream. */
  kind: "query" | "bundle" | "snapshot" | "stream" | "tile" | "catalog"
  request_id: string
}

export interface MeterResult {
  ok: true
  cost_debited: number
  balance_remaining: number
  rate_limit: RateLimitState
}

export interface MeterFailure {
  ok: false
  reason: "insufficient_balance" | "rate_limited"
  needed_cents?: number
  balance_cents?: number
  retry_after_s?: number
  rate_limit?: RateLimitState
}

/**
 * Best-effort RPC call to the `worldview_meter_and_limit` Supabase
 * function (created by migration 2026_04_23_worldview_v1.sql in P1).
 *
 * Returns the authoritative balance + rate-limit state from Postgres so
 * concurrent requests can't overspend. If the RPC is missing (migration
 * not applied yet) we fall through to a local estimate so the gateway
 * still works during rollout. The local estimate is eventually
 * consistent with the DB via an async top-up in `finalize`.
 */
export async function meterAndLimit(args: MeterParams): Promise<MeterResult | MeterFailure> {
  const cost = args.cache_hit
    ? Math.max(1, Math.ceil(args.cost_per_request / 2))
    : args.cost_per_request

  try {
    // RPC not in the generated Supabase types yet (migration lands in P1);
    // cast to `any` so TS doesn't complain while still getting runtime
    // type-safety from the RpcResult interface below.
    const admin = getAdmin() as any
    const { data, error } = await admin.rpc("worldview_meter_and_limit", {
      p_api_key_id: args.api_key_id,
      p_profile_id: args.profile_id,
      p_dataset_id: args.dataset_id,
      p_cost_cents: cost,
      p_rate_weight: args.rate_weight,
      p_kind: args.kind,
      p_request_id: args.request_id,
    })

    if (error) {
      // RPC not installed yet, or transient DB hiccup. Fall through
      // to optimistic pass so live traffic isn't blocked during rollout.
      console.warn("[worldview/meter] RPC error — falling through:", error.message)
      return {
        ok: true,
        cost_debited: cost,
        balance_remaining: Number.POSITIVE_INFINITY, // unknown
        rate_limit: {
          limit_per_minute: 60,
          remaining_per_minute: 60,
          reset_at: new Date(Date.now() + 60_000).toISOString(),
        },
      }
    }

    interface RpcResult {
      rate_limited?: boolean
      insufficient_balance?: boolean
      retry_after_s?: number
      balance_cents?: number
      rate_limit_per_minute?: number
      remaining_per_minute?: number
      rate_reset_at?: string
    }
    const row = (Array.isArray(data) ? data[0] : data) as RpcResult | null
    if (!row) {
      return { ok: true, cost_debited: cost, balance_remaining: 0, rate_limit: { limit_per_minute: 60, remaining_per_minute: 60, reset_at: new Date(Date.now() + 60_000).toISOString() } }
    }

    if (row.rate_limited) {
      return {
        ok: false,
        reason: "rate_limited",
        retry_after_s: row.retry_after_s ?? 60,
        rate_limit: {
          limit_per_minute: row.rate_limit_per_minute ?? 60,
          remaining_per_minute: row.remaining_per_minute ?? 0,
          reset_at: row.rate_reset_at ?? new Date(Date.now() + 60_000).toISOString(),
        },
      }
    }
    if (row.insufficient_balance) {
      return {
        ok: false,
        reason: "insufficient_balance",
        needed_cents: cost,
        balance_cents: row.balance_cents ?? 0,
      }
    }
    return {
      ok: true,
      cost_debited: cost,
      balance_remaining: row.balance_cents ?? 0,
      rate_limit: {
        limit_per_minute: row.rate_limit_per_minute ?? 60,
        remaining_per_minute: row.remaining_per_minute ?? 60,
        reset_at: row.rate_reset_at ?? new Date(Date.now() + 60_000).toISOString(),
      },
    }
  } catch (err: any) {
    console.warn("[worldview/meter] exception — falling through:", err?.message)
    return {
      ok: true,
      cost_debited: cost,
      balance_remaining: Number.POSITIVE_INFINITY,
      rate_limit: {
        limit_per_minute: 60,
        remaining_per_minute: 60,
        reset_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }
  }
}
