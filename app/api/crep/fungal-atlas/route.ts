import { NextRequest, NextResponse } from "next/server"

import {
  getFungalAtlasCells,
  type FungalAtlasBounds,
  type FungalAtlasLayer,
} from "@/lib/crep/fungal-atlas"

export const dynamic = "force-dynamic"

function parseBounds(params: URLSearchParams): FungalAtlasBounds | undefined {
  const bbox = params.get("bbox")
  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number)
    if ([west, south, east, north].every(Number.isFinite) && north > south) {
      return { west, south, east, north }
    }
  }
  const north = Number(params.get("north"))
  const south = Number(params.get("south"))
  const east = Number(params.get("east"))
  const west = Number(params.get("west"))
  if ([north, south, east, west].every(Number.isFinite) && north > south) {
    return { north, south, east, west }
  }
  return undefined
}

const VALID_LAYERS = new Set<FungalAtlasLayer>([
  "mycelium",
  "am",
  "ecm",
  "rarity",
  "endemic",
  "fci",
  "protected",
])

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const layerRaw = (params.get("layer") || "mycelium") as FungalAtlasLayer
  const layer = VALID_LAYERS.has(layerRaw) ? layerRaw : "mycelium"
  const limit = Number(params.get("limit") || 600)
  const bounds = parseBounds(params)
  const result = await getFungalAtlasCells({ bounds, limit, layer })

  return NextResponse.json(
    {
      cells: result.cells,
      meta: {
        total: result.cells.length,
        layer,
        bounds,
        summary: result.summary,
        sources: result.sources,
        renderer: "mycosoft-maplibre",
        feltApisUsed: false,
        precisionNote:
          "High-zoom pixels are interpolated visualization detail. Use nativeResolutionMeters/sourceResolution for scientific precision.",
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
