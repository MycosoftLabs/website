/**
 * Ocean Buoy Data API Route - Apr 2026
 * Real-time ocean buoy observations from NOAA NDBC + MINDEX cache
 *
 * Sources:
 *   1. NOAA NDBC (National Data Buoy Center) -- free, no API key
 *      https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt
 *      ~1300 active ocean buoys worldwide with weather/wave data
 *   2. MINDEX cache (/api/mindex/proxy/buoys -- PostGIS cached data)
 *
 * Data is cached in-memory for 5 minutes and ingested into MINDEX on fetch.
 */

import { NextRequest, NextResponse } from "next/server"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { saveBuoysToDiskCache, readBuoysFromDiskCache } from "@/lib/crep/buoy-disk-cache"

export const dynamic = "force-dynamic"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuoyObservation {
  id: string
  station_id: string
  lat: number
  lng: number
  wind_speed: number | null       // m/s
  wind_direction: number | null   // degrees
  wind_gust: number | null        // m/s
  wave_height: number | null      // meters (significant wave height)
  dominant_wave_period: number | null // seconds
  water_temp: number | null       // Celsius
  air_temp: number | null         // Celsius
  pressure: number | null         // hPa
  visibility: number | null       // nautical miles
  dew_point: number | null        // Celsius
  timestamp: string               // ISO 8601
  source: "ndbc" | "mindex"
}

// ── In-memory cache (5 minutes) ──────────────────────────────────────────────

interface BuoyCache {
  data: BuoyObservation[]
  timestamp: number
  expiresAt: number
}

let buoyCache: BuoyCache | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── MINDEX config ────────────────────────────────────────────────────────────

const MINDEX_URL =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_URL ||
  "http://192.168.0.189:8000"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

// ── NDBC Parser ──────────────────────────────────────────────────────────────

/**
 * Parse NOAA NDBC latest_obs.txt (fixed-width / whitespace-delimited format).
 *
 * The file has two header rows:
 *   Row 1: column names (#STN  LAT  LON ...)
 *   Row 2: units         (#deg  deg  ...)
 * Followed by data rows, one per station.
 *
 * Missing values are encoded as "MM".
 */
function parseNDBCText(text: string): BuoyObservation[] {
  const lines = text.split("\n").filter(l => l.trim().length > 0)
  if (lines.length < 3) return [] // Need header + units + at least 1 data row

  // Parse header to get column indices
  const headerLine = lines[0].replace(/^#/, "").trim()
  const headers = headerLine.split(/\s+/)

  // Build column index map
  const col = (name: string): number => {
    const idx = headers.findIndex(h => h.toUpperCase() === name.toUpperCase())
    return idx
  }

  const iSTN = col("STN")
  const iLAT = col("LAT")
  const iLON = col("LON")
  const iYY = col("YYYY") !== -1 ? col("YYYY") : col("YY")
  const iMM = col("MM")
  const iDD = col("DD")
  const iHH = col("hh")
  const iMN = col("mm")
  const iWDIR = col("WDIR")
  const iWSPD = col("WSPD")
  const iGST = col("GST")
  const iWVHT = col("WVHT")
  const iDPD = col("DPD")
  const iATMP = col("ATMP")
  const iWTMP = col("WTMP")
  const iPRES = col("PRES")
  const iVIS = col("VIS")
  const iDEWP = col("DEWP")

  const buoys: BuoyObservation[] = []

  // Skip header (line 0) and units (line 1), parse data rows
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith("#")) continue

    const fields = line.split(/\s+/)
    if (fields.length < 5) continue

    const stationId = iSTN >= 0 ? fields[iSTN] : fields[0]
    const lat = parseNDBCFloat(iLAT >= 0 ? fields[iLAT] : fields[1])
    const lng = parseNDBCFloat(iLON >= 0 ? fields[iLON] : fields[2])

    // Skip entries without valid coordinates
    if (lat === null || lng === null) continue
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue

    // Build timestamp from date fields
    let timestamp: string
    try {
      const year = iYY >= 0 ? fields[iYY] : "2026"
      const month = iMM >= 0 ? fields[iMM] : "01"
      const day = iDD >= 0 ? fields[iDD] : "01"
      const hour = iHH >= 0 ? fields[iHH] : "00"
      const min = iMN >= 0 ? fields[iMN] : "00"
      timestamp = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${min.padStart(2, "0")}:00Z`).toISOString()
    } catch {
      timestamp = new Date().toISOString()
    }

    buoys.push({
      id: `ndbc-${stationId}`,
      station_id: stationId,
      lat,
      lng,
      wind_speed: parseNDBCFloat(iWSPD >= 0 ? fields[iWSPD] : undefined),
      wind_direction: parseNDBCFloat(iWDIR >= 0 ? fields[iWDIR] : undefined),
      wind_gust: parseNDBCFloat(iGST >= 0 ? fields[iGST] : undefined),
      wave_height: parseNDBCFloat(iWVHT >= 0 ? fields[iWVHT] : undefined),
      dominant_wave_period: parseNDBCFloat(iDPD >= 0 ? fields[iDPD] : undefined),
      water_temp: parseNDBCFloat(iWTMP >= 0 ? fields[iWTMP] : undefined),
      air_temp: parseNDBCFloat(iATMP >= 0 ? fields[iATMP] : undefined),
      pressure: parseNDBCFloat(iPRES >= 0 ? fields[iPRES] : undefined),
      visibility: parseNDBCFloat(iVIS >= 0 ? fields[iVIS] : undefined),
      dew_point: parseNDBCFloat(iDEWP >= 0 ? fields[iDEWP] : undefined),
      timestamp,
      source: "ndbc",
    })
  }

  return buoys
}

/** Parse a NDBC field value; returns null for missing ("MM", "999", "99.0", etc.) */
function parseNDBCFloat(value: string | undefined): number | null {
  if (!value || value === "MM" || value === "999" || value === "99.0" || value === "999.0" || value === "9999.0" || value === "99.00") return null
  const n = parseFloat(value)
  return isNaN(n) ? null : n
}

// ── Source fetchers ──────────────────────────────────────────────────────────

async function fetchNDBCBuoys(): Promise<BuoyObservation[]> {
  try {
    const res = await fetch("https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt", {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "text/plain" },
    })
    if (!res.ok) {
      console.warn(`[Buoys/NDBC] HTTP ${res.status} from NDBC`)
      return []
    }
    const text = await res.text()
    const buoys = parseNDBCText(text)
    console.log(`[Buoys/NDBC] Parsed ${buoys.length} active buoys from NDBC latest_obs.txt`)
    return buoys
  } catch (err) {
    console.warn("[Buoys/NDBC] Fetch failed:", err)
    return []
  }
}

async function fetchMINDEXBuoys(): Promise<BuoyObservation[]> {
  try {
    const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=buoys&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=2000`
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
    })
    if (!res.ok) return []
    const data = await res.json()
    const entities: any[] = data.features ?? data.entities ?? data.buoys ?? []
    return entities.map((e: any, i: number) => ({
      id: e.id || `mindex-buoy-${i}`,
      station_id: e.station_id || e.properties?.station_id || e.id || `mindex-${i}`,
      lat: e.lat ?? e.latitude ?? e.geometry?.coordinates?.[1] ?? 0,
      lng: e.lng ?? e.longitude ?? e.geometry?.coordinates?.[0] ?? 0,
      wind_speed: e.wind_speed ?? e.properties?.wind_speed ?? null,
      wind_direction: e.wind_direction ?? e.properties?.wind_direction ?? null,
      wind_gust: e.wind_gust ?? e.properties?.wind_gust ?? null,
      wave_height: e.wave_height ?? e.properties?.wave_height ?? null,
      dominant_wave_period: e.dominant_wave_period ?? e.properties?.dominant_wave_period ?? null,
      water_temp: e.water_temp ?? e.properties?.water_temp ?? null,
      air_temp: e.air_temp ?? e.properties?.air_temp ?? null,
      pressure: e.pressure ?? e.properties?.pressure ?? null,
      visibility: e.visibility ?? e.properties?.visibility ?? null,
      dew_point: e.dew_point ?? e.properties?.dew_point ?? null,
      timestamp: e.timestamp || new Date().toISOString(),
      source: "mindex" as const,
    }))
  } catch {
    return []
  }
}

// ── MINDEX ingest (fire-and-forget) ──────────────────────────────────────────

function ingestBuoysToMINDEX(buoys: BuoyObservation[]): void {
  if (!buoys || buoys.length === 0) return
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
  const now = new Date().toISOString()

  fetch(`${baseUrl}/api/mindex/proxy/buoys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entities: buoys.map(b => ({
        id: b.id,
        station_id: b.station_id,
        lat: b.lat,
        lng: b.lng,
        wind_speed: b.wind_speed,
        wind_direction: b.wind_direction,
        wind_gust: b.wind_gust,
        wave_height: b.wave_height,
        dominant_wave_period: b.dominant_wave_period,
        water_temp: b.water_temp,
        air_temp: b.air_temp,
        pressure: b.pressure,
        visibility: b.visibility,
        dew_point: b.dew_point,
        timestamp: b.timestamp || now,
        entity_type: "buoy",
      })),
    }),
  }).catch((err) => {
    console.warn("[Buoys] MINDEX ingest failed (non-blocking):", err)
  })
}

// ── Route handler ────────────────────────────────────────────────────────────

/**
 * GET /api/oei/buoys
 * Returns real-time ocean buoy observations.
 *
 * Sources: NOAA NDBC (primary) + MINDEX cache (supplement).
 * Cached in-memory for 5 minutes. Ingested to MINDEX on every fresh fetch.
 */
export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true"
  const now = Date.now()

  // Return cached data if still fresh
  if (!forceRefresh && buoyCache && now < buoyCache.expiresAt) {
    const age = Math.round((now - buoyCache.timestamp) / 1000)
    console.log(`[Buoys] Cache HIT (${buoyCache.data.length} buoys, ${age}s old)`)
    return NextResponse.json({
      success: true,
      total: buoyCache.data.length,
      buoys: buoyCache.data,
      source: "cache",
      timestamp: new Date(buoyCache.timestamp).toISOString(),
      cached: true,
    }, {
      // Apr 20, 2026 perf: 5 min edge cache + 30 min SWR. NDBC publishes
      // every 5-10 min so caching at the edge cuts our origin RPS dramatically.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    })
  }

  const startTime = Date.now()

  try {
    // Fetch from both sources in parallel
    const [ndbcBuoys, mindexBuoys] = await Promise.all([
      fetchNDBCBuoys(),
      fetchMINDEXBuoys(),
    ])

    // Combine and deduplicate (NDBC data takes priority by station_id)
    const byStation = new Map<string, BuoyObservation>()

    // MINDEX data first (lower priority -- will be overwritten by NDBC)
    for (const b of mindexBuoys) {
      byStation.set(b.station_id, b)
    }
    // NDBC data overwrites MINDEX for same station
    for (const b of ndbcBuoys) {
      byStation.set(b.station_id, b)
    }

    const combined = Array.from(byStation.values())
    const latency = Date.now() - startTime

    console.log(`[Buoys] Fetched ${ndbcBuoys.length} NDBC + ${mindexBuoys.length} MINDEX = ${combined.length} unique buoys (${latency}ms)`)
    logDataCollection("buoys", "ndbc.noaa.gov", combined.length, latency, false)

    // Update in-memory cache
    buoyCache = {
      data: combined,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    }

    // Fire-and-forget MINDEX ingest (only ingest fresh NDBC data, not MINDEX echos)
    if (ndbcBuoys.length > 0) {
      ingestBuoysToMINDEX(ndbcBuoys)
    }

    // Apr 22, 2026 — also persist to disk so NDBC outages don't wipe buoys
    // off the map. 6 h TTL per station_id; parallel to vessel-disk-cache.
    if (combined.length > 0) {
      saveBuoysToDiskCache(combined)
    }

    return NextResponse.json({
      success: true,
      total: combined.length,
      buoys: combined,
      sources: {
        ndbc: ndbcBuoys.length,
        mindex: mindexBuoys.length,
      },
      source: ndbcBuoys.length > 0 ? "ndbc" : "mindex",
      timestamp: new Date().toISOString(),
      cached: false,
    }, {
      // Apr 20, 2026 perf: 5 min edge cache + 30 min SWR. NDBC publishes
      // every 5-10 min. Edge serves stale-while-revalidate so users
      // never hit the slow NOAA upstream directly.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    })
  } catch (error) {
    console.error("[Buoys] Error:", error)
    logAPIError("buoys", "ndbc.noaa.gov", String(error))

    // Try MINDEX alone as emergency fallback
    try {
      const mindexBuoys = await fetchMINDEXBuoys()
      if (mindexBuoys.length > 0) {
        return NextResponse.json({
          success: true,
          total: mindexBuoys.length,
          buoys: mindexBuoys,
          source: "mindex-recovery",
          timestamp: new Date().toISOString(),
          cached: false,
        })
      }
    } catch {}

    // Apr 22, 2026 — disk cache as last-resort fallback: NDBC + MINDEX both
    // cold, we still serve up to 6 h old obs so the globe doesn't go blank.
    const diskBuoys = readBuoysFromDiskCache()
    if (diskBuoys.length > 0) {
      console.log(`[Buoys] Emergency fallback → ${diskBuoys.length} from disk cache`)
      return NextResponse.json({
        success: true,
        total: diskBuoys.length,
        buoys: diskBuoys,
        source: "disk-cache",
        timestamp: new Date().toISOString(),
        cached: true,
      })
    }

    return NextResponse.json({
      success: false,
      total: 0,
      buoys: [],
      source: "none",
      timestamp: new Date().toISOString(),
      error: String(error),
    })
  }
}
