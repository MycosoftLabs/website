/**
 * Aircraft Registry — Multi-Source Aviation Entity Aggregator
 *
 * Queries ALL available free aircraft/aviation data sources in parallel,
 * deduplicates by ICAO hex code, and merges properties from multiple sources.
 *
 * Sources:
 *   1. FlightRadar24 (existing) — /api/oei/flightradar24
 *   2. MINDEX PostGIS cache — /api/mindex/proxy/aircraft
 *   3. OpenSky Network — https://opensky-network.org/api/states/all (free, no key)
 *   4. ADS-B Exchange (if ADSBX_API_KEY exists)
 *   5. ADSB.lol — https://api.adsb.lol/v2/ladd (free community ADS-B)
 *
 * Each source has a 10 s timeout. Sources without required API keys are
 * skipped silently. All errors are caught per-source so one failure never
 * blocks others.
 */

import { getFlightRadar24Client } from "@/lib/oei/connectors/flightradar24"

// =============================================================================
// TYPES
// =============================================================================

export interface AircraftRecord {
  id: string
  icao: string
  callsign: string
  lat: number
  lng: number
  altitude: number | null
  heading: number | null
  velocity: number | null
  verticalRate: number | null
  onGround: boolean
  source: string
  timestamp: string
}

interface SourceResult {
  source: string
  aircraft: AircraftRecord[]
  error?: string
  durationMs: number
}

// =============================================================================
// ENV / CONFIG
// =============================================================================

const MINDEX_URL =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_URL ||
  "http://192.168.0.189:8000"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

const ADSBX_API_KEY = process.env.ADSBX_API_KEY || ""

const SOURCE_TIMEOUT_MS = 5_000 // 5s per source — fast fail, don't block rendering

// =============================================================================
// SOURCE FETCHERS
// =============================================================================

/**
 * Source 1 — FlightRadar24 (via existing connector)
 */
async function fetchFromFlightRadar24(): Promise<AircraftRecord[]> {
  try {
    const client = getFlightRadar24Client()
    const raw = await client.fetchFlights({})
    return (raw as any[]).map((a) => normaliseGeneric(a, "flightradar24"))
  } catch {
    return []
  }
}

/**
 * Source 2 — MINDEX PostGIS cache
 */
async function fetchFromMINDEX(): Promise<AircraftRecord[]> {
  const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=aircraft&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=10000`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  const entities: any[] = data.features ?? data.entities ?? data.aircraft ?? []
  return entities.map((a) => normaliseGeneric(a, "mindex"))
}

/**
 * Source 3 — OpenSky Network (free, no key, 10 s cache)
 *
 * Returns all aircraft with active transponders worldwide.
 * Free tier: ~1 req/10 s, ~6000-10000 aircraft per response.
 *
 * Response shape: { time: number, states: [icao24, callsign, origin_country, ...] }
 */
async function fetchFromOpenSky(): Promise<AircraftRecord[]> {
  const url = "https://opensky-network.org/api/states/all"
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const states: any[][] = data.states ?? []
  const now = new Date().toISOString()

  return states
    .filter((s) => s[5] != null && s[6] != null) // must have position
    .map((s) => ({
      id: `osky-${s[0]}`,
      icao: String(s[0] ?? "").trim(),
      callsign: String(s[1] ?? "").trim() || "Unknown",
      lat: s[6] as number,
      lng: s[5] as number,
      altitude: s[7] != null ? (s[7] as number) : (s[13] as number | null),
      heading: s[10] != null ? (s[10] as number) : null,
      velocity: s[9] != null ? (s[9] as number) : null,
      verticalRate: s[11] != null ? (s[11] as number) : null,
      onGround: Boolean(s[8]),
      source: "opensky" as const,
      timestamp: s[3] ? new Date((s[3] as number) * 1000).toISOString() : now,
    }))
}

/**
 * Source 4 — ADS-B Exchange (requires ADSBX_API_KEY)
 */
async function fetchFromADSBExchange(): Promise<AircraftRecord[]> {
  if (!ADSBX_API_KEY) return []

  const url = "https://adsbexchange.com/api/aircraft/v2/all"
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "api-auth": ADSBX_API_KEY,
    },
  })
  if (!res.ok) return []
  const data = await res.json()
  const aircraft: any[] = data.ac ?? data.aircraft ?? []

  return aircraft
    .filter((a) => a.lat != null && a.lon != null)
    .map((a) => ({
      id: `adsbx-${a.hex ?? a.icao ?? Date.now()}`,
      icao: String(a.hex ?? a.icao ?? "").trim(),
      callsign: String(a.flight ?? a.callsign ?? "").trim() || "Unknown",
      lat: parseFloat(a.lat),
      lng: parseFloat(a.lon),
      altitude: a.alt_baro != null ? parseFloat(a.alt_baro) : (a.alt_geom != null ? parseFloat(a.alt_geom) : null),
      heading: a.track != null ? parseFloat(a.track) : null,
      velocity: a.gs != null ? parseFloat(a.gs) : null,
      verticalRate: a.baro_rate != null ? parseFloat(a.baro_rate) : null,
      onGround: a.alt_baro === "ground" || a.on_ground === true,
      source: "adsbexchange" as const,
      timestamp: a.seen != null ? new Date(Date.now() - (a.seen as number) * 1000).toISOString() : new Date().toISOString(),
    }))
}

/**
 * Source 5 — ADSB.lol (free community ADS-B, no key needed)
 */
async function fetchFromADSBLol(): Promise<AircraftRecord[]> {
  // /v2/all returns ALL aircraft (~5000-8000), not just LADD-listed ones
  const url = "https://api.adsb.lol/v2/all"
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const aircraft: any[] = data.ac ?? data.aircraft ?? []

  return aircraft
    .filter((a) => a.lat != null && a.lon != null)
    .map((a) => ({
      id: `lol-${a.hex ?? a.icao ?? Date.now()}`,
      icao: String(a.hex ?? a.icao ?? "").trim(),
      callsign: String(a.flight ?? a.callsign ?? "").trim() || "Unknown",
      lat: parseFloat(a.lat),
      lng: parseFloat(a.lon),
      altitude: a.alt_baro != null ? parseFloat(a.alt_baro) : (a.alt_geom != null ? parseFloat(a.alt_geom) : null),
      heading: a.track != null ? parseFloat(a.track) : null,
      velocity: a.gs != null ? parseFloat(a.gs) : null,
      verticalRate: a.baro_rate != null ? parseFloat(a.baro_rate) : null,
      onGround: a.alt_baro === "ground" || a.on_ground === true,
      source: "adsb.lol" as const,
      timestamp: a.seen != null ? new Date(Date.now() - (a.seen as number) * 1000).toISOString() : new Date().toISOString(),
    }))
}

// =============================================================================
// NORMALISATION
// =============================================================================

/**
 * Best-effort normalisation for generic aircraft objects (MINDEX / FR24 connector).
 */
function normaliseGeneric(a: any, source: string): AircraftRecord {
  const coords = a.location?.coordinates ?? a.geometry?.coordinates
  const props = a.properties ?? {}
  // FR24 connector returns location: { latitude, longitude } — extract these
  const locLat = a.location?.latitude ?? a.location?.lat
  const locLng = a.location?.longitude ?? a.location?.lng

  return {
    id: a.id ?? `${source}-${a.icao24 ?? a.icao ?? Date.now()}`,
    icao: String(a.icao24 ?? a.icao ?? props.icao24 ?? "").trim(),
    callsign: String(a.callsign ?? a.name ?? props.callsign ?? "").trim() || "Unknown",
    lat: coords ? coords[1] : (locLat ?? parseFloat(a.lat ?? a.latitude ?? 0)),
    lng: coords ? coords[0] : (locLng ?? parseFloat(a.lng ?? a.longitude ?? 0)),
    altitude: a.altitude ?? a.alt ?? props.altitude ?? null,
    heading: a.heading ?? a.track ?? props.heading ?? null,
    velocity: a.velocity ?? a.speed ?? props.velocity ?? null,
    verticalRate: a.verticalRate ?? a.vertical_rate ?? props.verticalRate ?? null,
    onGround: Boolean(a.onGround ?? a.on_ground ?? props.onGround ?? false),
    source,
    timestamp:
      a.lastSeen ??
      a.timestamp ??
      a.provenance?.collectedAt ??
      new Date().toISOString(),
  }
}

// =============================================================================
// DEDUPLICATION & MERGE
// =============================================================================

/**
 * Merge two AircraftRecords, preferring newer position data and filling
 * in null fields from secondary sources.
 */
function mergeAircraft(existing: AircraftRecord, incoming: AircraftRecord): AircraftRecord {
  const existingTs = new Date(existing.timestamp).getTime()
  const incomingTs = new Date(incoming.timestamp).getTime()
  // Only use incoming position if it has VALID coordinates (not 0,0)
  const incomingHasCoords = incoming.lat !== 0 || incoming.lng !== 0
  const existingHasCoords = existing.lat !== 0 || existing.lng !== 0
  const useIncomingPos = incomingHasCoords && (!existingHasCoords || incomingTs >= existingTs)

  return {
    id: existing.id,
    icao: existing.icao,
    callsign: existing.callsign !== "Unknown" ? existing.callsign : incoming.callsign,
    lat: useIncomingPos ? incoming.lat : existing.lat,
    lng: useIncomingPos ? incoming.lng : existing.lng,
    altitude: (useIncomingPos ? incoming.altitude : existing.altitude) ?? existing.altitude ?? incoming.altitude,
    heading: (useIncomingPos ? incoming.heading : existing.heading) ?? existing.heading ?? incoming.heading,
    velocity: (useIncomingPos ? incoming.velocity : existing.velocity) ?? existing.velocity ?? incoming.velocity,
    verticalRate: (useIncomingPos ? incoming.verticalRate : existing.verticalRate) ?? existing.verticalRate ?? incoming.verticalRate,
    onGround: useIncomingPos ? incoming.onGround : existing.onGround,
    source: `${existing.source}+${incoming.source}`,
    timestamp: useIncomingPos ? incoming.timestamp : existing.timestamp,
  }
}

/**
 * Deduplicate aircraft by ICAO hex code and merge properties.
 */
function deduplicateByICAO(allAircraft: AircraftRecord[]): AircraftRecord[] {
  const map = new Map<string, AircraftRecord>()

  for (const a of allAircraft) {
    // Filter out invalid coordinates
    if (a.lat === 0 && a.lng === 0) continue

    // Use ICAO for dedup when available, otherwise use callsign or id as key
    const key = (a.icao && a.icao !== "")
      ? a.icao.toLowerCase()
      : (a.callsign && a.callsign !== "Unknown")
        ? `cs-${a.callsign.toLowerCase()}`
        : a.id // fallback to unique id (no dedup, just include)

    const existing = map.get(key)
    if (existing) {
      map.set(key, mergeAircraft(existing, a))
    } else {
      map.set(key, a)
    }
  }

  return Array.from(map.values())
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface AircraftRegistryResult {
  aircraft: AircraftRecord[]
  sources: Record<string, number>
  totalBeforeDedup: number
  fetchedAt: string
}

/**
 * Fetch aircraft from ALL available sources in parallel, deduplicate by ICAO
 * hex code, and return the combined set.
 */
export async function fetchAllAircraft(): Promise<AircraftRecord[]> {
  const result = await fetchAllAircraftWithMeta()
  return result.aircraft
}

/**
 * Same as fetchAllAircraft but includes per-source counts and metadata.
 */
export async function fetchAllAircraftWithMeta(): Promise<AircraftRegistryResult> {
  const sourceFetchers: Array<{ name: string; fn: () => Promise<AircraftRecord[]> }> = [
    { name: "flightradar24", fn: fetchFromFlightRadar24 },
    { name: "mindex", fn: fetchFromMINDEX },
    { name: "opensky", fn: fetchFromOpenSky },
    { name: "adsbexchange", fn: fetchFromADSBExchange },
    { name: "adsb.lol", fn: fetchFromADSBLol },
  ]

  const results = await Promise.allSettled(
    sourceFetchers.map(async ({ name, fn }): Promise<SourceResult> => {
      const start = Date.now()
      try {
        const aircraft = await fn()
        const dur = Date.now() - start
        if (aircraft.length > 0) {
          console.log(`[AircraftRegistry] ${name}: ${aircraft.length} aircraft (${dur}ms)`)
        }
        return { source: name, aircraft, durationMs: dur }
      } catch (err) {
        const dur = Date.now() - start
        console.warn(`[AircraftRegistry] ${name} failed (${dur}ms):`, (err as Error).message)
        return { source: name, aircraft: [], error: (err as Error).message, durationMs: dur }
      }
    })
  )

  const allAircraft: AircraftRecord[] = []
  const sourceCounts: Record<string, number> = {}

  for (const r of results) {
    if (r.status === "fulfilled") {
      allAircraft.push(...r.value.aircraft)
      sourceCounts[r.value.source] = r.value.aircraft.length
    }
  }

  const deduplicated = deduplicateByICAO(allAircraft)

  console.log(
    `[AircraftRegistry] Combined: ${allAircraft.length} raw -> ${deduplicated.length} unique ICAO from ${Object.entries(sourceCounts)
      .filter(([, c]) => c > 0)
      .map(([s, c]) => `${s}(${c})`)
      .join(", ") || "no sources"}`
  )

  return {
    aircraft: deduplicated,
    sources: sourceCounts,
    totalBeforeDedup: allAircraft.length,
    fetchedAt: new Date().toISOString(),
  }
}
