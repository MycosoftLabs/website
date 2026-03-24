import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CABLES_URL = "https://www.submarinecablemap.com/api/v3/cable/all.json"
const LANDING_POINTS_URL = "https://www.submarinecablemap.com/api/v3/landing-point/all.json"
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const FETCH_TIMEOUT_MS = 15_000

interface CableRaw {
  id: string
  name: string
  color: string
  length?: string
  rfs?: string
  owners?: string
  url?: string
  coordinates?: number[][][] | number[][] // GeoJSON LineString or MultiLineString
}

interface LandingPointRaw {
  id: string
  name: string
  country?: string
  latitude?: string | number
  longitude?: string | number
}

interface CachedData {
  cables: TransformedCable[]
  landingPoints: TransformedLandingPoint[]
  timestamp: number
}

interface TransformedCable {
  id: string
  name: string
  color: string
  length_km: number | null
  rfs: string | null
  owners: string | null
  url: string | null
  coordinates: number[][]
}

interface TransformedLandingPoint {
  id: string
  name: string
  country: string | null
  latitude: number
  longitude: number
}

let cache: CachedData | null = null

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.timestamp < CACHE_DURATION_MS
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

function parseLengthKm(length?: string): number | null {
  if (!length) return null
  const cleaned = length.replace(/[^0-9.]/g, "")
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

function extractCoordinates(cable: CableRaw): number[][] {
  if (!cable.coordinates) return []

  // GeoJSON coordinates can be LineString (number[][]) or MultiLineString (number[][][])
  // Flatten MultiLineString into a single array of coordinate pairs
  const coords = cable.coordinates
  if (coords.length === 0) return []

  // Check if it's a MultiLineString (array of arrays of coordinate pairs)
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    // MultiLineString: flatten all segments into one path
    return (coords as number[][][]).flat()
  }

  // LineString: already an array of coordinate pairs
  return coords as number[][]
}

function transformCable(raw: CableRaw): TransformedCable {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color || "#000000",
    length_km: parseLengthKm(raw.length),
    rfs: raw.rfs || null,
    owners: raw.owners || null,
    url: raw.url || null,
    coordinates: extractCoordinates(raw),
  }
}

function transformLandingPoint(raw: LandingPointRaw): TransformedLandingPoint | null {
  const lat = typeof raw.latitude === "string" ? parseFloat(raw.latitude) : raw.latitude
  const lng = typeof raw.longitude === "string" ? parseFloat(raw.longitude) : raw.longitude

  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null

  return {
    id: raw.id,
    name: raw.name,
    country: raw.country || null,
    latitude: lat,
    longitude: lng,
  }
}

/**
 * GET /api/oei/submarine-cables
 * Fetch submarine cable routes and landing points from Submarine Cable Map API
 *
 * Returns cable routes with GeoJSON coordinates and global landing points.
 * Data is cached for 24 hours since it rarely changes.
 */
export async function GET(_request: NextRequest) {
  try {
    // Return cached data if still valid
    if (isCacheValid() && cache) {
      return NextResponse.json({
        cables: cache.cables,
        landingPoints: cache.landingPoints,
        total_cables: cache.cables.length,
        total_landing_points: cache.landingPoints.length,
        cached: true,
      })
    }

    // Fetch cables and landing points in parallel
    const [cablesResponse, landingPointsResponse] = await Promise.allSettled([
      fetchWithTimeout(CABLES_URL),
      fetchWithTimeout(LANDING_POINTS_URL),
    ])

    let cables: TransformedCable[] = []
    let landingPoints: TransformedLandingPoint[] = []

    // Process cables
    if (cablesResponse.status === "fulfilled" && cablesResponse.value.ok) {
      try {
        const rawCables: CableRaw[] = await cablesResponse.value.json()
        cables = rawCables.map(transformCable)
      } catch {
        console.error("[submarine-cables] Failed to parse cables response")
      }
    } else {
      const reason =
        cablesResponse.status === "rejected"
          ? cablesResponse.reason
          : `HTTP ${cablesResponse.value.status}`
      console.error("[submarine-cables] Failed to fetch cables:", reason)
    }

    // Process landing points
    if (landingPointsResponse.status === "fulfilled" && landingPointsResponse.value.ok) {
      try {
        const rawPoints: LandingPointRaw[] = await landingPointsResponse.value.json()
        landingPoints = rawPoints
          .map(transformLandingPoint)
          .filter((p): p is TransformedLandingPoint => p !== null)
      } catch {
        console.error("[submarine-cables] Failed to parse landing points response")
      }
    } else {
      const reason =
        landingPointsResponse.status === "rejected"
          ? landingPointsResponse.reason
          : `HTTP ${landingPointsResponse.value.status}`
      console.error("[submarine-cables] Failed to fetch landing points:", reason)
    }

    // Update cache if we got any data
    if (cables.length > 0 || landingPoints.length > 0) {
      cache = {
        cables,
        landingPoints,
        timestamp: Date.now(),
      }
    }

    return NextResponse.json({
      cables,
      landingPoints,
      total_cables: cables.length,
      total_landing_points: landingPoints.length,
      cached: false,
    })
  } catch (error) {
    console.error("[submarine-cables] Unexpected error:", error)
    return NextResponse.json(
      {
        cables: [],
        landingPoints: [],
        total_cables: 0,
        total_landing_points: 0,
        cached: false,
        error: "Failed to fetch submarine cable data",
      },
      { status: 500 }
    )
  }
}
