import { NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

/**
 * Worldview v1 — liveness check. Free, no auth.
 *
 * GET /api/worldview/v1/health
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const started = Date.now()
  const mindexUrl = resolveMindexServerBaseUrl()
  const masUrl = resolveMasServerBaseUrl()

  const [mindex, mas] = await Promise.all([
    headReachable(`${mindexUrl}/health`),
    headReachable(`${masUrl}/health`),
  ])

  return NextResponse.json({
    ok: true,
    api: "worldview",
    version: "v1",
    status: mindex.ok && mas.ok ? "operational" : mindex.ok || mas.ok ? "degraded" : "offline",
    generated_at: new Date().toISOString(),
    latency_ms: Date.now() - started,
    upstream: {
      mindex: { url: mindexUrl, reachable: mindex.ok, latency_ms: mindex.ms },
      mas:    { url: masUrl,    reachable: mas.ok,    latency_ms: mas.ms },
    },
    docs: {
      catalog: "/api/worldview/v1/catalog",
      bundles: "/api/worldview/v1/bundles",
      openapi: "/api/worldview/v1/openapi.json",
      topup:   "https://mycosoft.com/agent",
    },
  }, {
    headers: { "Cache-Control": "public, max-age=10" },
  })
}

async function headReachable(url: string): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now()
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return { ok: r.ok, ms: Date.now() - t0 }
  } catch {
    return { ok: false, ms: Date.now() - t0 }
  }
}
