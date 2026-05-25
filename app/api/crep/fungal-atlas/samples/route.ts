import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

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

const MINDEX_API = resolveMindexServerBaseUrl()

function parseBounds(params: URLSearchParams): FungalAtlasBounds | undefined {
  const bbox = params.get("bbox")
  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number)
    if ([west, south, east, north].every(Number.isFinite) && north > south) return { west, south, east, north }
  }
  return undefined
}

async function fetchMindexOverlaySamples(bounds: FungalAtlasBounds | undefined, limit: number) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (bounds) {
    params.set("bbox", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`)
  }
  const response = await fetch(`${MINDEX_API}/api/mindex/fungal-overlays/samples?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
    },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  })
  if (!response.ok) return null
  const body = await response.json()
  if (!Array.isArray(body?.data)) return null
  const normalized = body.data.map((row: any) => ({
    id: row.id,
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    observed_on: row.observed_at,
    group: row.group || "fungi",
    source: row.source || "MINDEX",
    confidence: Number(row.confidence ?? 0.7),
    sampleType: row.group || "fungi",
    sourceResolution: "MINDEX observation point",
    nativeResolutionMeters: 30,
  }))
  return normalized
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const params = request.nextUrl.searchParams
  const zoom = Number(params.get("zoom") || 2)
  const limit = Number(params.get("limit") || 0) || undefined
  const bounds = parseBounds(params)
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

  const mindexSamplesRaw = await fetchMindexOverlaySamples(bounds, limit || 4000).catch(() => null)
  const mindexSamples = mindexSamplesRaw
    ? groups.length
      ? mindexSamplesRaw.filter((sample) => groups.includes(sample.group as FungalSampleGroup))
      : mindexSamplesRaw
    : null
  const result = mindexSamples
    ? {
        samples: mindexSamples,
        summary: {
          sampleCount: mindexSamples.length,
          cellCount: 0,
          sourceDir: "mindex",
          metadataFile: null,
          countryCount: 0,
          topCountries: [],
          sampleTypes: [],
          barcodeRegions: [],
          dateRange: {},
          nativeResolutionMeters: 30,
          sourceResolution: "MINDEX observation samples",
          loadedAt: new Date().toISOString(),
          truncated: false,
        },
        sources: [{ id: "atlas_derivatives", name: "MINDEX Overlay Samples", status: "available", files: [], notes: "MINDEX-first fungal samples" }],
        zoom,
        limit: limit || 4000,
      }
    : await getFungalAtlasSamples({
    bounds,
    zoom,
    limit,
    groups: groups.length ? groups : undefined,
  })
  const fc = samplesToGeoJson(result.samples)

  const totalMs = Date.now() - startedAt
  const response = NextResponse.json(
    {
      ...fc,
      sample_count: result.samples.length,
      meta: {
        zoom,
        limit: result.limit,
        summary: result.summary,
        sources: result.sources,
        timings: {
          totalMs,
          budgetMs: 1000,
          withinBudget: totalMs <= 1000,
        },
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
  response.headers.set("Server-Timing", `total;dur=${totalMs}`)
  return response
}
