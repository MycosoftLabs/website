import { NextRequest } from "next/server"
import { runWithEnvelope } from "@/lib/worldview/middleware"
import { DATASETS } from "@/lib/worldview/registry"

/**
 * Worldview v1 — world-state snapshot. Wraps the existing snapshot
 * aggregator in the v1 envelope (auth + meter + rate-limit).
 *
 * GET /api/worldview/v1/snapshot?project=global|oyster|goffs
 *
 * The public, unauthenticated snapshot at /api/worldview/snapshot
 * stays live for existing dashboards that already consume it.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SNAPSHOT_DATASET = {
  id: "crep.snapshot",
  name: "Worldview snapshot",
  category: "natureos" as const,
  description: "Aggregated world-state: live entity counts + project overlays + middleware reachability.",
  underlying_routes: ["/api/worldview/snapshot"],
  response_shape: "json.Object" as const,
  supports: { bbox: false, cursor: false, time_range: false, stream: false, tile: false, id_lookup: false },
  scope: "agent" as const,
  cost_per_request: 2,
  rate_weight: 3,
  cache_ttl_ms: 30_000,
  example: "/api/worldview/v1/snapshot?project=global",
  handler: async ({ req, internalOrigin }: any) => {
    const project = req.nextUrl.searchParams.get("project") || "global"
    const r = await fetch(`${internalOrigin}/api/worldview/snapshot?project=${encodeURIComponent(project)}`, {
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    })
    if (!r.ok) throw new Error(`snapshot upstream ${r.status}`)
    const data = await r.json()
    return {
      data,
      ttl_s: 30,
      cache: "miss" as const,
      meta: {
        live_entities: data.live_entities,
        middleware: data.middleware,
      },
    }
  },
}

export async function GET(req: NextRequest) {
  return runWithEnvelope({ req, dataset: SNAPSHOT_DATASET as any, kind: "snapshot" })
}
