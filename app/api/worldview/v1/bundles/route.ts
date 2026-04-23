import { NextResponse } from "next/server"
import { BUNDLES } from "@/lib/worldview/bundles"

/**
 * Worldview v1 — bundle catalog. Free, no auth.
 *
 * GET /api/worldview/v1/bundles
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    api: "worldview",
    version: "v1",
    total: BUNDLES.length,
    bundles: BUNDLES.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      datasets: b.datasets,
      default_params: b.default_params,
      scope: b.scope,
      cost_per_request_cents: b.cost_per_request,
      rate_weight: b.rate_weight,
      cache_ttl_s: Math.floor(b.cache_ttl_ms / 1000),
      fetch_url: `/api/worldview/v1/bundle/${b.id}`,
    })),
    usage: {
      fetch: "GET /api/worldview/v1/bundle/<bundle_id>",
      auth: "Authorization: Bearer mk_<your_api_key>",
      top_up: "https://mycosoft.com/agent",
    },
  }, { headers: { "Cache-Control": "public, max-age=60" } })
}
