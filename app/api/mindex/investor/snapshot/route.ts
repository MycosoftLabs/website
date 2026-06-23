import { NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * Investor snapshot BFF — proxies the internal MINDEX route
 * `GET /api/mindex/investor/snapshot` (auth: X-Internal-Token + X-API-Key).
 *
 * Single source of truth for the investor PDF + website search headline cards.
 * Server-side only; the internal token never reaches the browser. This proxies
 * the MINDEX FastAPI route (8000) rather than opening a raw pg.Pool to 189:5432
 * from the website.
 *
 * Degrades to an empty `metrics` list (HTTP 200, no mock data) when MINDEX is
 * unreachable or migration 035 / the first capture hasn't landed yet.
 */
export const dynamic = "force-dynamic"

const MINDEX_API = resolveMindexServerBaseUrl()

function internalToken(): string {
  const raw = process.env.MINDEX_INTERNAL_TOKEN || process.env.MINDEX_INTERNAL_TOKENS || ""
  return (raw.includes(",") ? raw.split(",")[0] : raw).trim()
}

export async function GET() {
  const startedAt = Date.now()
  const token = internalToken()
  let body: any = null
  let upstreamOk = false
  try {
    const res = await fetch(`${MINDEX_API}/api/mindex/investor/snapshot`, {
      headers: {
        Accept: "application/json",
        ...(token ? { "X-Internal-Token": token } : {}),
        "X-API-Key": process.env.MINDEX_API_KEY || "",
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    if (res.ok) {
      body = await res.json()
      upstreamOk = true
    }
  } catch {
    /* graceful: empty metrics */
  }

  const metrics = Array.isArray(body?.metrics) ? body.metrics : []
  const totalMs = Date.now() - startedAt
  return NextResponse.json(
    {
      captured_at: body?.captured_at ?? null,
      count: metrics.length,
      metrics,
      meta: {
        source: "mindex.investor.snapshot",
        upstream: upstreamOk ? "mindex" : "unavailable",
        timings: { totalMs },
        timestamp: new Date().toISOString(),
      },
    },
    { headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=1800" } },
  )
}
