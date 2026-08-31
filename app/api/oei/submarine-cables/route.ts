import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/** Canonical geometry sources — all.json has metadata only; geo endpoints carry coordinates. */
const CABLES_GEO_URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json"
const LANDING_POINTS_GEO_URL =
  "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json"
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 20_000

interface GeoJsonFeatureCollection {
  type: "FeatureCollection"
  features: unknown[]
}

interface CachedPayload {
  cables: GeoJsonFeatureCollection
  landingPoints: GeoJsonFeatureCollection
  timestamp: number
}

let cache: CachedPayload | null = null

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.timestamp < CACHE_DURATION_MS
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    })
  } finally {
    clearTimeout(timeout)
  }
}

function emptyFeatureCollection(): GeoJsonFeatureCollection {
  return { type: "FeatureCollection", features: [] }
}

async function fetchFeatureCollection(url: string): Promise<GeoJsonFeatureCollection> {
  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  const body = (await response.json()) as GeoJsonFeatureCollection
  if (body?.type !== "FeatureCollection" || !Array.isArray(body.features)) {
    throw new Error(`Invalid FeatureCollection from ${url}`)
  }
  return body
}

/**
 * GET /api/oei/submarine-cables
 * Same-origin proxy for Submarine Cable Map GeoJSON (real MultiLineString geometry).
 * Returns cable FeatureCollection unchanged; landing points in sibling field.
 */
export async function GET(_request: NextRequest) {
  try {
    if (isCacheValid() && cache) {
      return NextResponse.json({
        ...cache.cables,
        landingPoints: cache.landingPoints,
        total_cables: cache.cables.features.length,
        total_landing_points: cache.landingPoints.features.length,
        cached: true,
        source: "submarinecablemap.com",
      })
    }

    const [cablesResult, landingResult] = await Promise.allSettled([
      fetchFeatureCollection(CABLES_GEO_URL),
      fetchFeatureCollection(LANDING_POINTS_GEO_URL),
    ])

    const cables =
      cablesResult.status === "fulfilled" ? cablesResult.value : emptyFeatureCollection()
    const landingPoints =
      landingResult.status === "fulfilled" ? landingResult.value : emptyFeatureCollection()

    if (cablesResult.status === "rejected") {
      console.error("[submarine-cables] Cable geo fetch failed:", cablesResult.reason)
    }
    if (landingResult.status === "rejected") {
      console.error("[submarine-cables] Landing geo fetch failed:", landingResult.reason)
    }

    if (cables.features.length > 0 || landingPoints.features.length > 0) {
      cache = { cables, landingPoints, timestamp: Date.now() }
    }

    return NextResponse.json({
      ...cables,
      landingPoints,
      total_cables: cables.features.length,
      total_landing_points: landingPoints.features.length,
      cached: false,
      source: "submarinecablemap.com",
    })
  } catch (error) {
    console.error("[submarine-cables] Unexpected error:", error)
    return NextResponse.json(
      {
        type: "FeatureCollection",
        features: [],
        landingPoints: emptyFeatureCollection(),
        total_cables: 0,
        total_landing_points: 0,
        cached: false,
        error: "Failed to fetch submarine cable data",
      },
      { status: 500 }
    )
  }
}
