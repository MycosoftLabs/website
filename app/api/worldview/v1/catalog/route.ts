import { NextRequest, NextResponse } from "next/server"
import { DATASETS, listDatasets, type WorldviewScope, type WorldviewCategory } from "@/lib/worldview/registry"

/**
 * Worldview v1 — dataset catalog. Free, no auth. Machine-readable.
 *
 * Agents call this once on startup to discover every dataset + its
 * cost / rate-weight / scope / example URL. Updates here surface
 * automatically to the /agent page and the OpenAPI spec.
 *
 * GET /api/worldview/v1/catalog?scope=agent&category=live.aviation
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") as WorldviewScope | null
  const category = req.nextUrl.searchParams.get("category") as WorldviewCategory | null

  const datasets = listDatasets({
    scope: scope || undefined,
    category: category || undefined,
  })

  const payload = {
    api: "worldview",
    version: "v1",
    generated_at: new Date().toISOString(),
    total: datasets.length,
    total_all: DATASETS.length,
    categories: [...new Set(DATASETS.map((d) => d.category))].sort(),
    scopes: ["public", "agent", "fusarium", "ops"],
    datasets: datasets.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      description: d.description,
      response_shape: d.response_shape,
      supports: d.supports,
      scope: d.scope,
      cost_per_request_cents: d.cost_per_request,
      rate_weight: d.rate_weight,
      cache_ttl_s: Math.floor(d.cache_ttl_ms / 1000),
      example: d.example,
      underlying_routes: d.underlying_routes,
    })),
    usage: {
      fetch: "GET /api/worldview/v1/query?type=<dataset_id>&<params>",
      auth: "Authorization: Bearer mk_<your_api_key>",
      top_up: "https://mycosoft.com/agent",
      envelope_docs: "https://mycosoft.com/docs/worldview#envelope",
    },
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=60" },
  })
}
