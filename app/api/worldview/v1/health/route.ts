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
    serviceReachable(mindexUrl, ["/api/mindex/health", "/health"]),
    serviceReachable(masUrl, ["/api/myca/status", "/health"]),
  ])

  return NextResponse.json({
    ok: true,
    api: "worldview",
    version: "v1",
    status: mindex.ok && mas.ok ? "operational" : mindex.ok || mas.ok ? "degraded" : "offline",
    generated_at: new Date().toISOString(),
    latency_ms: Date.now() - started,
    upstream: {
      mindex: { url: mindexUrl, reachable: mindex.ok, latency_ms: mindex.ms, probe: mindex.path },
      mas:    { url: masUrl,    reachable: mas.ok,    latency_ms: mas.ms,    probe: mas.path },
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

async function serviceReachable(baseUrl: string, paths: string[]): Promise<{ ok: boolean; ms: number; path: string | null }> {
  const t0 = Date.now()
  for (const path of paths) {
    try {
      const r = await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      })
      if (r.ok) return { ok: true, ms: Date.now() - t0, path }
    } catch {
      // Try the next service-specific health probe.
    }
  }
  return { ok: false, ms: Date.now() - t0, path: null }
}
