/**
 * USGS Earthquake API Client
 * 
 * Fetches real-time earthquake data from USGS for M-Wave correlation
 * https://earthquake.usgs.gov/earthquakes/feed/v1.0/
 * 
 * Used for:
 * - Real-time earthquake monitoring
 * - Correlation with MycoBrain sensor data
 * - Prediction model training
 */

import { env } from "@/lib/env"

export interface USGSEarthquake {
  id: string
  properties: {
    mag: number
    place: string
    time: number
    updated: number
    url: string
    detail: string
    felt: number | null
    cdi: number | null
    mmi: number | null
    alert: string | null
    status: string
    tsunami: number
    sig: number
    net: string
    code: string
    ids: string
    sources: string
    types: string
    nst: number | null
    dmin: number | null
    rms: number | null
    gap: number | null
    magType: string
    type: string
    title: string
  }
  geometry: {
    type: "Point"
    coordinates: [number, number, number] // [longitude, latitude, depth]
  }
}

export interface USGSResponse {
  type: "FeatureCollection"
  metadata: {
    generated: number
    url: string
    title: string
    status: number
    api: string
    count: number
  }
  features: USGSEarthquake[]
  bbox?: number[]
}

export interface EarthquakeFilter {
  minMagnitude?: number
  maxMagnitude?: number
  startTime?: Date
  endTime?: Date
  minLatitude?: number
  maxLatitude?: number
  minLongitude?: number
  maxLongitude?: number
  limit?: number
  orderby?: "time" | "time-asc" | "magnitude" | "magnitude-asc"
}

const USGS_BASE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0"
const USGS_QUERY_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"

/**
 * Fetch earthquakes from the last hour
 */
export async function fetchRecentEarthquakes(
  feedType: "all_hour" | "all_day" | "all_week" | "all_month" | "significant_hour" | "significant_day" | "significant_week" | "significant_month" = "all_hour"
): Promise<USGSResponse> {
  const [significance, timeframe] = feedType.split("_")
  const url = `${USGS_BASE_URL}/summary/${significance}_${timeframe}.geojson`
  
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mycosoft-MINDEX-MWave/2.0",
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  })
  
  if (!response.ok) {
    throw new Error(`USGS API error: HTTP ${response.status}`)
  }
  
  return response.json()
}

/**
 * Query earthquakes with filters
 */
export async function queryEarthquakes(filters: EarthquakeFilter): Promise<USGSResponse> {
  const params = new URLSearchParams()
  params.set("format", "geojson")
  
  if (filters.minMagnitude !== undefined) params.set("minmagnitude", filters.minMagnitude.toString())
  if (filters.maxMagnitude !== undefined) params.set("maxmagnitude", filters.maxMagnitude.toString())
  if (filters.startTime) params.set("starttime", filters.startTime.toISOString())
  if (filters.endTime) params.set("endtime", filters.endTime.toISOString())
  if (filters.minLatitude !== undefined) params.set("minlatitude", filters.minLatitude.toString())
  if (filters.maxLatitude !== undefined) params.set("maxlatitude", filters.maxLatitude.toString())
  if (filters.minLongitude !== undefined) params.set("minlongitude", filters.minLongitude.toString())
  if (filters.maxLongitude !== undefined) params.set("maxlongitude", filters.maxLongitude.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.orderby) params.set("orderby", filters.orderby)
  
  const url = `${USGS_QUERY_URL}?${params.toString()}`
  
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mycosoft-MINDEX-MWave/2.0",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })
  
  if (!response.ok) {
    throw new Error(`USGS Query API error: HTTP ${response.status}`)
  }
  
  return response.json()
}

/**
 * Get earthquakes near a specific location
 */
export async function fetchEarthquakesNearLocation(
  latitude: number,
  longitude: number,
  radiusKm: number = 500,
  days: number = 7,
  minMagnitude: number = 2.5
): Promise<USGSResponse> {
  const now = new Date()
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  // USGS doesn't support radius queries directly, so we calculate bounding box
  // Rough approximation: 1 degree ≈ 111 km
  const radiusDegrees = radiusKm / 111
  
  return queryEarthquakes({
    minLatitude: latitude - radiusDegrees,
    maxLatitude: latitude + radiusDegrees,
    minLongitude: longitude - radiusDegrees,
    maxLongitude: longitude + radiusDegrees,
    startTime,
    endTime: now,
    minMagnitude,
    orderby: "time",
    limit: 100,
  })
}

/**
 * Transform USGS earthquake to MINDEX-compatible format
 */
export function transformEarthquake(eq: USGSEarthquake) {
  const [longitude, latitude, depth] = eq.geometry.coordinates
  
  return {
    id: eq.id,
    magnitude: eq.properties.mag,
    magnitude_type: eq.properties.magType,
    location: {
      place: eq.properties.place,
      latitude,
      longitude,
      depth_km: depth,
    },
    timestamp: new Date(eq.properties.time).toISOString(),
    updated_at: new Date(eq.properties.updated).toISOString(),
    significance: eq.properties.sig,
    alert_level: eq.properties.alert,
    tsunami_warning: eq.properties.tsunami === 1,
    felt_reports: eq.properties.felt,
    url: eq.properties.url,
    source: eq.properties.net,
    type: eq.properties.type,
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
