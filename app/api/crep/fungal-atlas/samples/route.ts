import { NextRequest, NextResponse } from "next/server"

import {
  getFungalAtlasSamples,
  samplesToGeoJson,
  type FungalAtlasBounds,
  type FungalSampleGroup,
} from "@/lib/crep/fungal-atlas"

export const dynamic = "force-dynamic"

const VALID_GROUPS = new Set<FungalSampleGroup>([
  "mycelium",
  "mushroom",
  "mold",
  "mildew",
  "yeast",
  "fungi",
])

function parseBounds(params: URLSearchParams): FungalAtlasBounds | undefined {
  const bbox = params.get("bbox")
  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number)
    if ([west, south, east, north].every(Number.isFinite) && north > south) return { west, south, east, north }
  }
  return undefined
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const zoom = Number(params.get("zoom") || 2)
  const limit = Number(params.get("limit") || 0) || undefined
  const groupsParam = params.get("groups")
  const groups = (groupsParam || "")
    .split(",")
    .map((s) => s.trim() as FungalSampleGroup)
    .filter((g) => VALID_GROUPS.has(g))

  if (groupsParam && groups.length === 0) {
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      sample_count: 0,
      meta: { zoom, filteredOut: true, timestamp: new Date().toISOString() },
    })
  }

  const result = await getFungalAtlasSamples({
    bounds: parseBounds(params),
    zoom,
    limit,
    groups: groups.length ? groups : undefined,
  })
  const fc = samplesToGeoJson(result.samples)

  return NextResponse.json(
    {
      ...fc,
      sample_count: result.samples.length,
      meta: {
        zoom,
        limit: result.limit,
        summary: result.summary,
        sources: result.sources,
        renderedAs: "zoom-gated sample points",
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      },
    },
  )
}
