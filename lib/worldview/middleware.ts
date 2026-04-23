/**
 * Worldview v1 request middleware — Apr 23, 2026
 *
 * Pipeline every /api/worldview/v1/* handler wraps itself in:
 *   1. Generate request_id
 *   2. Authenticate caller (bearer API key OR Supabase JWT)
 *   3. Scope check (public / agent / fusarium / ops)
 *   4. Cost meter + rate limit (Supabase RPC — atomic across replicas)
 *   5. Invoke the dataset / bundle handler
 *   6. Cache lookup + store
 *   7. Wrap response in envelope
 *   8. Log usage event (async, fire-and-forget)
 *
 * One function, one envelope, one billing path.
 */

import type { NextRequest } from "next/server"
import { getAgentProfile, type AgentProfile } from "@/lib/agent-auth"
import { getDataset, scopeAllows, type Dataset, type WorldviewScope } from "./registry"
import { meterAndLimit } from "./metering"
import { ok, err, newRequestId } from "./envelope"
import { readCache, writeCache } from "./cache"
import { resolveEffectiveScope } from "./company-auth"

/** What the handler-wrapper needs from the dataset. */
interface RunContext {
  req: NextRequest
  dataset: Dataset
  kind: "query" | "bundle" | "snapshot" | "stream" | "tile" | "catalog"
  /** For bundles: the bundle id (distinct from dataset.id used for billing). */
  bundleId?: string
}

export async function runWithEnvelope(ctx: RunContext) {
  const requestId = newRequestId()
  const { req, dataset, kind } = ctx

  // 1. Auth
  let profile: AgentProfile | null = null
  const needsAuth = dataset.scope !== "public"
  if (needsAuth) {
    profile = await getAgentProfile(req)
    if (!profile) {
      return err({
        code: "UNAUTHENTICATED",
        message: "Provide `Authorization: Bearer mk_<key>` or authenticate via https://mycosoft.com/agent",
        status: 401,
        request_id: requestId,
        dataset: dataset.id,
        details: { top_up_url: "https://mycosoft.com/agent" },
      })
    }
  }

  // 2. Scope check
  const callerScope = profileScope(profile)
  if (!scopeAllows(callerScope, dataset.scope)) {
    return err({
      code: "INSUFFICIENT_SCOPE",
      message: `Dataset ${dataset.id} requires scope "${dataset.scope}". Your scope is "${callerScope}".`,
      status: 403,
      request_id: requestId,
      dataset: dataset.id,
      details: { required_scope: dataset.scope, caller_scope: callerScope, upgrade_url: "https://mycosoft.com/agent" },
    })
  }

  // 3. Internal origin for cross-route proxying
  const internalOrigin = resolveInternalOrigin(req)

  // 4. Cache lookup (pre-meter — if we have a cached value the cost is 50%
  //    but we still want to charge so spamming doesn't incentivize cache hits)
  const paramKey = paramKeyFor(req.nextUrl.searchParams)
  const cacheKey = `${dataset.id}|${paramKey}`
  const cached = dataset.cache_ttl_ms > 0 ? readCache(cacheKey, dataset.cache_ttl_ms) : null
  const cacheHit = !!cached

  // 5. Meter + rate limit
  let meterResult
  if (profile && profile.api_key_id) {
    meterResult = await meterAndLimit({
      api_key_id: profile.api_key_id,
      profile_id: profile.profile_id,
      dataset_id: dataset.id,
      cost_per_request: dataset.cost_per_request,
      rate_weight: dataset.rate_weight,
      cache_hit: cacheHit,
      kind,
      request_id: requestId,
    })
    if (!meterResult.ok) {
      if (meterResult.reason === "insufficient_balance") {
        return err({
          code: "INSUFFICIENT_BALANCE",
          message: `Need ${meterResult.needed_cents} cents, balance is ${meterResult.balance_cents}. Top up at https://mycosoft.com/agent`,
          status: 402,
          request_id: requestId,
          dataset: dataset.id,
          details: { needed_cents: meterResult.needed_cents, balance_cents: meterResult.balance_cents, top_up_url: "https://mycosoft.com/agent" },
          balance_remaining: meterResult.balance_cents ?? 0,
        })
      }
      if (meterResult.reason === "rate_limited") {
        return err({
          code: "RATE_LIMITED",
          message: `Rate limit exceeded. Retry after ${meterResult.retry_after_s}s.`,
          status: 429,
          request_id: requestId,
          dataset: dataset.id,
          details: { retry_after_s: meterResult.retry_after_s },
          rate_limit: meterResult.rate_limit,
          headers: { "Retry-After": String(meterResult.retry_after_s ?? 60) },
        })
      }
    }
  }

  // 6. Invoke handler (cached or live)
  let data: any
  let ttlS = Math.floor((dataset.cache_ttl_ms || 0) / 1000)
  let cacheStatus: "hit" | "miss" | "stale" | "bypass" = "miss"
  let meta: Record<string, any> | undefined
  if (cached) {
    data = cached.data
    ttlS = Math.max(1, Math.floor(((cached.expiresAt - Date.now()) / 1000)))
    cacheStatus = "hit"
    meta = cached.meta
  } else {
    try {
      const result = await dataset.handler({ req, params: req.nextUrl.searchParams, requestId, internalOrigin })
      data = result.data
      ttlS = result.ttl_s
      cacheStatus = result.cache ?? "miss"
      meta = result.meta
      if (dataset.cache_ttl_ms > 0) {
        writeCache(cacheKey, { data, meta, expiresAt: Date.now() + dataset.cache_ttl_ms })
      }
    } catch (handlerErr: any) {
      const msg = String(handlerErr?.message || handlerErr)
      const isInvalid = /INVALID_PARAMS/.test(msg)
      return err({
        code: isInvalid ? "INVALID_PARAMS" : "UPSTREAM_UNREACHABLE",
        message: msg,
        status: isInvalid ? 400 : 502,
        request_id: requestId,
        dataset: dataset.id,
        details: { dataset: dataset.id },
      })
    }
  }

  // 7. Envelope response
  return ok({
    request_id: requestId,
    dataset: ctx.bundleId ? undefined : dataset.id,
    bundle: ctx.bundleId,
    cost_debited: meterResult?.ok ? meterResult.cost_debited : 0,
    balance_remaining: meterResult?.ok ? meterResult.balance_remaining : null,
    rate_limit: meterResult?.ok ? meterResult.rate_limit : null,
    cache: cacheStatus,
    ttl_s: ttlS,
    data,
    meta,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────

function profileScope(profile: AgentProfile | null): WorldviewScope {
  // Apr 23, 2026 — Delegated to resolveEffectiveScope so the
  // `company` tier (email-domain + scopes-array) is applied uniformly
  // across every Worldview path.
  return resolveEffectiveScope(profile)
}

function paramKeyFor(p: URLSearchParams): string {
  const entries: [string, string][] = []
  p.forEach((v, k) => entries.push([k.toLowerCase(), v]))
  entries.sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([k, v]) => `${k}=${v}`).join("&")
}

function resolveInternalOrigin(req: NextRequest): string {
  // Same-container fetches prefer the public origin so routing through
  // Next.js middleware + nginx works identically to a real consumer.
  try { return new URL(req.url).origin } catch { return "http://localhost:3000" }
}

/** For routes that want to look up the dataset by query-string `type=<id>`. */
export function resolveDatasetFromParams(req: NextRequest): { dataset?: Dataset; error?: ReturnType<typeof err> } {
  const type = req.nextUrl.searchParams.get("type")
  if (!type) {
    return { error: err({ code: "INVALID_PARAMS", message: "query requires ?type=<dataset_id>. See /api/worldview/v1/catalog", status: 400 }) }
  }
  const dataset = getDataset(type)
  if (!dataset) {
    return { error: err({ code: "DATASET_NOT_FOUND", message: `Unknown dataset "${type}". Browse /api/worldview/v1/catalog for the full list.`, status: 404, details: { type } }) }
  }
  return { dataset }
}
