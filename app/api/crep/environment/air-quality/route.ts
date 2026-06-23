import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * Earth Simulator air-quality BFF — proxies the internal MINDEX route
 * `GET /api/mindex/environment/air-quality` (auth: X-Internal-Token + X-API-Key)
 * and returns a GeoJSON FeatureCollection of AQI station readings from
 * `atmos.air_quality`. Internal-token only — never forwards a customer mk_ key.
 *
 * Fails open to an empty FeatureCollection (no mock data). `atmos.air_quality`
 * is currently empty (awaiting the OpenAQ/AirNow ETL keys on 189), so this
 * returns an honest empty state until that data lands.
 */
export const dynamic = "force-dynamic"

const MINDEX_API = resolveMindexServerBaseUrl()

type Bounds = { west: number; south: number; east: number; north: number }

function parseBounds(params: URLSearchParams): Bounds | undefined {
  const bbox = params.get("bbox")
  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number)
    if ([west, south, east, north].every(Number.isFinite) && north > south && east > west) {
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

function internalToken(): string {
  const raw = process.env.MINDEX_INTERNAL_TOKEN || process.env.MINDEX_INTERNAL_TOKENS || ""
  return (raw.includes(",") ? raw.split(",")[0] : raw).trim()
}

async function fetchMindexAirQuality(bounds: Bounds, limit: number) {
  const token = internalToken()
  const qs = new URLSearchParams({
    lat_min: String(bounds.south),
    lat_max: String(bounds.north),
    lng_min: String(bounds.west),
    lng_max: String(bounds.east),
    limit: String(limit),
  })
  const res = await fetch(`${MINDEX_API}/api/mindex/environment/air-quality?${qs.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { "X-Internal-Token": token } : {}),
      "X-API-Key": process.env.MINDEX_API_KEY || "",
    },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  })
  if (!res.ok) return null
  const body = await res.json()
  return Array.isArray(body?.items) ? body.items : Array.isArray(body?.data) ? body.data : null
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const params = request.nextUrl.searchParams
  const limit = Math.min(Math.max(Number(params.get("limit") || 1000), 1), 2000)
  const bounds = parseBounds(params) ?? { west: -179.9, south: -89.9, east: 179.9, north: 89.9 }

  const items = await fetchMindexAirQuality(bounds, limit).catch(() => null)
  const upstreamOk = items != null

  // Aggregate per station: MINDEX returns one row per pollutant, so multiple
  // readings stack at the same lat/lng. Collapse to one marker per location
  // with every pollutant in a single popup summary.
  const PARAM_LABEL: Record<string, string> = {
    pm2_5: "PM2.5", pm10: "PM10", ozone: "O₃", nitrogen_dioxide: "NO₂",
    sulphur_dioxide: "SO₂", carbon_monoxide: "CO", us_aqi: "AQI", european_aqi: "AQI",
    ammonia: "NH₃", dust: "Dust",
  }
  type Reading = { value: any; unit: string | null; measuredAt: string }
  type Station = {
    lat: number; lng: number; station: string | null; source: string;
    measuredAt: string | null; params: Map<string, Reading>
  }
  const byStation = new Map<string, Station>()
  for (const row of items || []) {
    const lat = Number(row.lat ?? row.latitude)
    const lng = Number(row.lng ?? row.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    let s = byStation.get(key)
    if (!s) {
      s = { lat, lng, station: row.station_name ?? null, source: row.source ?? "mindex", measuredAt: row.measured_at ?? null, params: new Map() }
      byStation.set(key, s)
    }
    const rowTime = String(row.measured_at ?? "")
    if (row.parameter != null) {
      // Keep only the most recent reading per pollutant.
      const existing = s.params.get(row.parameter)
      if (!existing || rowTime > (existing.measuredAt || "")) {
        s.params.set(row.parameter, { value: row.value, unit: row.unit ?? null, measuredAt: rowTime })
      }
    }
    if (rowTime && (!s.measuredAt || rowTime > String(s.measuredAt))) s.measuredAt = row.measured_at
  }
  const features = [...byStation.values()].map((s) => {
    const readings = [...s.params.entries()]
    const summary = readings
      .map(([param, r]) => `${PARAM_LABEL[param] || param} ${r.value}${r.unit ? " " + r.unit : ""}`)
      .join(" · ")
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      properties: {
        source: s.source,
        stationName: s.station,
        measuredAt: s.measuredAt,
        parameterCount: readings.length,
        summary,
      },
    }
  })

  const totalMs = Date.now() - startedAt
  const response = NextResponse.json(
    {
      type: "FeatureCollection",
      features,
      count: features.length,
      meta: {
        source: "mindex.atmos.air_quality",
        upstream: upstreamOk ? "mindex" : "unavailable",
        bbox: bounds,
        renderer: "mycosoft-maplibre",
        timings: { totalMs, budgetMs: 1000, withinBudget: totalMs <= 1000 },
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
    },
  )
  response.headers.set("Server-Timing", `total;dur=${totalMs}`)
  return response
}
