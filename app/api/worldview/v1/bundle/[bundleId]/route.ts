import { NextRequest } from "next/server"
import { getBundle } from "@/lib/worldview/bundles"
import { getDataset } from "@/lib/worldview/registry"
import { err, ok, newRequestId } from "@/lib/worldview/envelope"
import { getAgentProfile } from "@/lib/agent-auth"
import { meterAndLimit } from "@/lib/worldview/metering"
import { readCache, writeCache } from "@/lib/worldview/cache"

/**
 * Worldview v1 — bundle fetch.
 *
 * GET /api/worldview/v1/bundle/{bundle_id}?bbox=...
 *
 * Runs every member dataset in parallel and returns one merged
 * response. Billing is per-bundle (usually discounted vs N individual
 * queries). Rate-weight is also per-bundle (not summed) to keep
 * agents using bundles as the efficient path.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { bundleId: string } }) {
  const requestId = newRequestId()
  const bundle = getBundle(params.bundleId)
  if (!bundle) {
    return err({
      code: "BUNDLE_NOT_FOUND",
      message: `Unknown bundle "${params.bundleId}". Browse /api/worldview/v1/bundles for the full list.`,
      status: 404,
      request_id: requestId,
    })
  }

  // Auth — bundles always require the `agent` scope (or higher)
  const profile = await getAgentProfile(req)
  if (!profile) {
    return err({
      code: "UNAUTHENTICATED",
      message: "Bundles require an API key. Get one at https://mycosoft.com/agent",
      status: 401,
      request_id: requestId,
      details: { top_up_url: "https://mycosoft.com/agent" },
    })
  }

  // Meter first (before spending handler cycles)
  const cacheKey = `bundle|${bundle.id}|${paramKeyFor(req.nextUrl.searchParams)}`
  const cached = bundle.cache_ttl_ms > 0 ? readCache(cacheKey, bundle.cache_ttl_ms) : null
  const meter = await meterAndLimit({
    api_key_id: profile.api_key_id!,
    profile_id: profile.profile_id,
    dataset_id: `bundle:${bundle.id}`,
    cost_per_request: bundle.cost_per_request,
    rate_weight: bundle.rate_weight,
    cache_hit: !!cached,
    kind: "bundle",
    request_id: requestId,
  })
  if (!meter.ok) {
    if (meter.reason === "insufficient_balance") {
      return err({
        code: "INSUFFICIENT_BALANCE",
        message: `Bundle "${bundle.id}" needs ${bundle.cost_per_request} cents. Balance is ${meter.balance_cents}. Top up at https://mycosoft.com/agent`,
        status: 402,
        request_id: requestId,
        details: { needed_cents: bundle.cost_per_request, balance_cents: meter.balance_cents, top_up_url: "https://mycosoft.com/agent" },
      })
    }
    return err({
      code: "RATE_LIMITED",
      message: `Rate limit exceeded. Retry after ${meter.retry_after_s}s.`,
      status: 429,
      request_id: requestId,
      rate_limit: meter.rate_limit,
      headers: { "Retry-After": String(meter.retry_after_s ?? 60) },
    })
  }

  // Serve cached bundle if still warm
  if (cached) {
    return ok({
      request_id: requestId,
      bundle: bundle.id,
      cost_debited: meter.cost_debited,
      balance_remaining: meter.balance_remaining,
      rate_limit: meter.rate_limit,
      cache: "hit",
      ttl_s: Math.max(1, Math.floor((cached.expiresAt - Date.now()) / 1000)),
      data: cached.data,
      meta: cached.meta,
    })
  }

  // Merge default_params with caller params (caller wins).
  const merged = new URLSearchParams()
  for (const [k, v] of Object.entries(bundle.default_params || {})) {
    merged.set(k, String(v))
  }
  req.nextUrl.searchParams.forEach((v, k) => merged.set(k, v))

  const internalOrigin = new URL(req.url).origin

  // Run each member dataset in parallel, swallowing individual failures.
  const results = await Promise.all(
    bundle.datasets.map(async (datasetId) => {
      const ds = getDataset(datasetId)
      if (!ds) return { dataset_id: datasetId, ok: false, error: "unknown_dataset" }
      try {
        const r = await ds.handler({
          req,
          params: merged,
          requestId,
          internalOrigin,
        })
        return { dataset_id: datasetId, ok: true, data: r.data, meta: r.meta, ttl_s: r.ttl_s }
      } catch (e: any) {
        return { dataset_id: datasetId, ok: false, error: e?.message || "upstream_failed" }
      }
    }),
  )

  const payload = {
    bundle: {
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      datasets: bundle.datasets,
      default_params: bundle.default_params,
    },
    members: results,
    member_counts: Object.fromEntries(
      results.map((r) => [r.dataset_id, r.ok ? (
        Array.isArray((r as any).data?.features) ? (r as any).data.features.length :
        Array.isArray((r as any).data) ? (r as any).data.length : null
      ) : 0]),
    ),
    ok_count: results.filter((r) => r.ok).length,
    fail_count: results.filter((r) => !r.ok).length,
  }

  // Cache by param-key + bundle id
  if (bundle.cache_ttl_ms > 0) {
    writeCache(cacheKey, {
      data: payload,
      meta: { ok_count: payload.ok_count, fail_count: payload.fail_count },
      expiresAt: Date.now() + bundle.cache_ttl_ms,
    })
  }

  return ok({
    request_id: requestId,
    bundle: bundle.id,
    cost_debited: meter.cost_debited,
    balance_remaining: meter.balance_remaining,
    rate_limit: meter.rate_limit,
    cache: "miss",
    ttl_s: Math.floor(bundle.cache_ttl_ms / 1000),
    data: payload,
    meta: { ok_count: payload.ok_count, fail_count: payload.fail_count },
  })
}

function paramKeyFor(p: URLSearchParams): string {
  const entries: [string, string][] = []
  p.forEach((v, k) => entries.push([k.toLowerCase(), v]))
  entries.sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([k, v]) => `${k}=${v}`).join("&")
}
