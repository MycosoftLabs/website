import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

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
  "uncertainty",
])

const MINDEX_API = resolveMindexServerBaseUrl()

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

function rebalanceCellsForViewport(
  cells: any[],
  limit: number,
  bounds?: FungalAtlasBounds,
) {
  if (!bounds || cells.length <= limit) return cells
  const latSpan = Math.max(0.000001, bounds.north - bounds.south)
  const lngSpan = Math.max(0.000001, bounds.east - bounds.west)
  const gridX = 16
  const gridY = 10
  const buckets = new Map<string, any>()
  for (const cell of cells) {
    const lat = Number(cell?.lat)
    const lng = Number(cell?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const nx = Math.max(0, Math.min(gridX - 1, Math.floor(((lng - bounds.west) / lngSpan) * gridX)))
    const ny = Math.max(0, Math.min(gridY - 1, Math.floor(((lat - bounds.south) / latSpan) * gridY)))
    const bucketKey = `${nx}:${ny}`
    const score = Number(cell.sampleCount || 0) + Number(cell.richness || 0) + Number(cell.amScore || 0) + Number(cell.ecmScore || 0)
    const tieBreaker = hashString(String(cell.id || `${lat}:${lng}`))
    const current = buckets.get(bucketKey)
    if (!current || score > current.score || (score === current.score && tieBreaker > current.tieBreaker)) {
      buckets.set(bucketKey, { score, tieBreaker, cell })
    }
  }

  const firstPass = Array.from(buckets.values()).map((item) => item.cell)
  if (firstPass.length >= limit) return firstPass.slice(0, limit)

  const selectedIds = new Set(firstPass.map((cell) => String(cell.id)))
  const remainder = cells
    .filter((cell) => !selectedIds.has(String(cell.id)))
    .sort((a, b) => {
      const scoreA = Number(a.sampleCount || 0) + Number(a.richness || 0) + Number(a.amScore || 0) + Number(a.ecmScore || 0)
      const scoreB = Number(b.sampleCount || 0) + Number(b.richness || 0) + Number(b.amScore || 0) + Number(b.ecmScore || 0)
      return scoreB - scoreA
    })
    .slice(0, Math.max(0, limit - firstPass.length))
  return [...firstPass, ...remainder]
}

async function fetchMindexOverlayCells(
  layer: FungalAtlasLayer,
  limit: number,
  bounds?: FungalAtlasBounds,
) {
  const internalTokenRaw =
    process.env.MINDEX_INTERNAL_TOKEN ||
    process.env.MINDEX_INTERNAL_TOKENS ||
    ""
  const internalToken = internalTokenRaw.includes(",")
    ? internalTokenRaw.split(",")[0]?.trim()
    : internalTokenRaw.trim()
  const requestLimit = bounds ? Math.min(Math.max(limit * 6, 1800), 10000) : limit
  const params = new URLSearchParams({
    layer,
    limit: String(requestLimit),
  })
  if (bounds) {
    params.set("bbox", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`)
  }
  const response = await fetch(`${MINDEX_API}/api/mindex/fungal-overlays/cells?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(internalToken ? { "X-Internal-Token": internalToken } : {}),
      "X-API-Key": process.env.MINDEX_API_KEY || "",
    },
    // Keep MINDEX-first, but fail over quickly so ECM appears immediately on refresh.
    signal: AbortSignal.timeout(1200),
    cache: "no-store",
  })
  if (!response.ok) return null
  const body = await response.json()
  if (!Array.isArray(body?.data)) return null
  const mappedCells = body.data
    .map((row: any) => {
      const lat = Number(row.centroid_lat ?? row.lat ?? row.latitude)
      const lng = Number(row.centroid_lng ?? row.lng ?? row.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        id: String(row.cell_id ?? `${layer}:${lat.toFixed(4)}:${lng.toFixed(4)}`),
        lat,
        lng,
        sampleCount: Number(row.observation_count ?? 0),
        richness: Number(row.fungi_intensity ?? row.mycelium_heat ?? 0),
        activity: Number(row.fungi_intensity ?? row.mycelium_heat ?? 0),
        amScore: Number(row.am_density ?? 0),
        ecmScore: Number(row.ecm_density ?? 0),
        rarity: Number(row.rarity ?? 0),
        endemicity: Number(row.rarity ?? 0),
        uncertainty: Number(row.uncertainty ?? 0),
        fciPriority: Number(row.fci_priority ?? 0),
        nativeResolutionMeters: 1000,
        sourceResolution: "MINDEX overlay grid cells",
        dateRange: { from: row.observed_from, to: row.observed_to },
        sources: ["MINDEX"],
      }
    })
    .filter(Boolean)
  const cells = rebalanceCellsForViewport(mappedCells, limit, bounds)
  // Fail open to local atlas cells when MINDEX returns no usable rows,
  // so AM/ECM never disappear on startup while MINDEX backfills.
  if (!cells.length) return null
  return {
    cells,
    summary: {
      sampleCount: cells.reduce((sum: number, c: any) => sum + (c.sampleCount || 0), 0),
      cellCount: cells.length,
      sourceDir: "mindex",
      metadataFile: null,
      countryCount: 0,
      topCountries: [],
      sampleTypes: [],
      barcodeRegions: [],
      dateRange: {},
      nativeResolutionMeters: 1000,
      sourceResolution: "MINDEX overlay cells",
      loadedAt: new Date().toISOString(),
      truncated: false,
    },
    sources: [{ id: "atlas_derivatives", name: "MINDEX Overlay Cells", status: "available", files: [], notes: "MINDEX-first fungal overlays" }],
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const params = request.nextUrl.searchParams
  const layerRaw = (params.get("layer") || "mycelium") as FungalAtlasLayer
  const layer = VALID_LAYERS.has(layerRaw) ? layerRaw : "mycelium"
  const limit = Number(params.get("limit") || 600)
  const bounds = parseBounds(params)
  const mindexResult = await fetchMindexOverlayCells(layer, limit, bounds).catch(() => null)
  const result = mindexResult ?? (await getFungalAtlasCells({ bounds, limit, layer }))

  const totalMs = Date.now() - startedAt
  const response = NextResponse.json(
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
        timings: {
          totalMs,
          budgetMs: 1000,
          withinBudget: totalMs <= 1000,
        },
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
  response.headers.set("Server-Timing", `total;dur=${totalMs}`)
  return response
}
