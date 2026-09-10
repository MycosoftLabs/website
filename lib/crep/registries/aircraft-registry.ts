// @ts-nocheck
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
import {
  AIRCRAFT_MAX_FEATURES,
  CREP_OSINT_UA,
  bboxCenter,
  bboxFitsPointBackup,
  bboxIsFinite,
  bboxRadiusNm,
  capRows,
  failedUpstreamNames,
  firstNonEmpty,
  inBbox,
  type MoverQuery,
  type UpstreamAttempt,
} from "@/lib/crep/osint-movers-failover"

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

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

const ADSBX_API_KEY = process.env.ADSBX_API_KEY || ""

// OpenSky OAuth2 client-credentials (Apr 2026). Anonymous /states/all is heavily
// rate-limited; set both vars to restore the broad global aircraft feed.
const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID || ""
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET || ""

const configuredMovingSourceTimeout = Number(process.env.CREP_MOVING_SOURCE_TIMEOUT_MS)
const SOURCE_TIMEOUT_MS =
  Number.isFinite(configuredMovingSourceTimeout) && configuredMovingSourceTimeout > 0
    ? configuredMovingSourceTimeout
    : process.env.NODE_ENV === "development"
      ? 1500
      : 5000 // Fast fail; moving assets should never block map navigation.

const ENABLE_WEBSITE_MINDEX_WRITEBACK =
  process.env.CREP_ENABLE_WEBSITE_MINDEX_WRITEBACK === "1"
const DEBUG_MOVING_REGISTRY = process.env.CREP_DEBUG_MOVING_REGISTRY === "1"

function logMovingRegistryDebug(...args: unknown[]) {
  if (DEBUG_MOVING_REGISTRY) console.log(...args)
}

// =============================================================================
// SOURCE FETCHERS
// =============================================================================

/**
 * Source 1 — FlightRadar24 (via existing connector)
 */
async function fetchFromFlightRadar24(): Promise<AircraftRecord[]> {
  if (ENABLE_WEBSITE_MINDEX_WRITEBACK) try {
    const client = getFlightRadar24Client()
    const raw = await client.fetchFlights({})
    return (raw as any[]).map((a) => normaliseGeneric(a, "flightradar24"))
  } catch {
    return []
  }
  return []
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

// OpenSky OAuth2 client-credentials token, cached until just before expiry.
let openSkyToken: { value: string; expiresAt: number } | null = null

async function getOpenSkyToken(): Promise<string | null> {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return null
  const now = Date.now()
  if (openSkyToken && now < openSkyToken.expiresAt) return openSkyToken.value
  try {
    const res = await fetch(
      "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: OPENSKY_CLIENT_ID,
          client_secret: OPENSKY_CLIENT_SECRET,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!data?.access_token) return null
    const ttlSec = Number(data.expires_in) || 1800
    openSkyToken = { value: data.access_token, expiresAt: now + (ttlSec - 60) * 1000 }
    return data.access_token
  } catch {
    return null
  }
}

/**
 * Source 3 — OpenSky Network
 *
 * Returns all aircraft with active transponders worldwide (~6000-10000).
 * Authenticated via OAuth2 when OPENSKY_CLIENT_ID/SECRET are set.
 *
 * Response shape: { time: number, states: [icao24, callsign, origin_country, ...] }
 */
function mapAdsbStyleAircraft(a: any, source: "adsb.lol" | "adsb.fi" | "adsbexchange"): AircraftRecord {
  return {
    id: `${source}-${a.hex ?? a.icao ?? Date.now()}`,
    icao: String(a.hex ?? a.icao ?? "").trim(),
    callsign: String(a.flight ?? a.callsign ?? "").trim() || "Unknown",
    lat: parseFloat(a.lat),
    lng: parseFloat(a.lon),
    altitude: a.alt_baro != null ? parseFloat(a.alt_baro) : (a.alt_geom != null ? parseFloat(a.alt_geom) : null),
    heading: a.track != null ? parseFloat(a.track) : null,
    velocity: a.gs != null ? parseFloat(a.gs) : null,
    verticalRate: a.baro_rate != null ? parseFloat(a.baro_rate) : null,
    onGround: a.alt_baro === "ground" || a.on_ground === true,
    source,
    timestamp: a.seen != null ? new Date(Date.now() - (a.seen as number) * 1000).toISOString() : new Date().toISOString(),
  }
}

async function fetchFromOpenSky(query?: MoverQuery): Promise<AircraftRecord[]> {
  const params = new URLSearchParams()
  if (bboxIsFinite(query?.bbox)) {
    params.set("lamin", String(query.bbox.south))
    params.set("lamax", String(query.bbox.north))
    params.set("lomin", String(query.bbox.west))
    params.set("lomax", String(query.bbox.east))
  }
  const qs = params.toString()
  const url = `https://opensky-network.org/api/states/all${qs ? `?${qs}` : ""}`
  const token = await getOpenSkyToken()
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(bboxIsFinite(query?.bbox) ? 10_000 : 15_000),
    headers: {
      Accept: "application/json",
      "User-Agent": CREP_OSINT_UA,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`)
  const data = await res.json()
  const states: any[][] = data.states ?? []
  const now = new Date().toISOString()

  return states
    .filter((s) => s[5] != null && s[6] != null)
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

/** Community ADS-B point feed (adsb.lol). Keyless. Regional bbox only. */
async function fetchFromADSBLolPoint(query?: MoverQuery): Promise<AircraftRecord[]> {
  if (!bboxFitsPointBackup(query?.bbox)) {
    throw new Error("adsb.lol point skipped: bbox too large or missing")
  }
  const { lat, lon } = bboxCenter(query.bbox)
  const dist = bboxRadiusNm(query.bbox)
  const url = `https://api.adsb.lol/v2/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${dist}`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/json", "User-Agent": CREP_OSINT_UA },
  })
  if (!res.ok) throw new Error(`adsb.lol HTTP ${res.status}`)
  const data = await res.json()
  const aircraft: any[] = data.ac ?? data.aircraft ?? []
  return aircraft
    .filter((a) => a.lat != null && a.lon != null && inBbox(parseFloat(a.lat), parseFloat(a.lon), query?.bbox))
    .map((a) => mapAdsbStyleAircraft(a, "adsb.lol"))
}

/** Community ADS-B point feed (opendata.adsb.fi). Keyless. Regional bbox only. */
async function fetchFromADSBFiPoint(query?: MoverQuery): Promise<AircraftRecord[]> {
  if (!bboxFitsPointBackup(query?.bbox)) {
    throw new Error("adsb.fi point skipped: bbox too large or missing")
  }
  const { lat, lon } = bboxCenter(query.bbox)
  const dist = bboxRadiusNm(query.bbox)
  const url = `https://opendata.adsb.fi/api/v2/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${dist}`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/json", "User-Agent": CREP_OSINT_UA },
  })
  if (!res.ok) throw new Error(`adsb.fi HTTP ${res.status}`)
  const data = await res.json()
  const aircraft: any[] = data.ac ?? data.aircraft ?? []
  return aircraft
    .filter((a) => a.lat != null && a.lon != null && inBbox(parseFloat(a.lat), parseFloat(a.lon), query?.bbox))
    .map((a) => mapAdsbStyleAircraft(a, "adsb.fi"))
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
 *
 * Note: /v2/all was removed from ADSB.lol in 2025. The remaining public
 * endpoints are subset feeds: /v2/mil (military), /v2/ladd (LADD),
 * /v2/pia (PIA). We pull from mil to add defense-interesting aircraft
 * that OpenSky / FR24 sometimes miss.
 */
async function fetchFromADSBLol(): Promise<AircraftRecord[]> {
  const UA = "Mycosoft-CREP/1.0 (+https://mycosoft.com)"
  const endpoints = [
    "https://api.adsb.lol/v2/mil",
    "https://api.adsb.lol/v2/ladd",
  ]
  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        headers: { Accept: "application/json", "User-Agent": UA },
      })
      if (!res.ok) return [] as any[]
      const data = await res.json()
      return (data.ac ?? data.aircraft ?? []) as any[]
    })
  )
  const aircraft: any[] = []
  for (const r of results) if (r.status === "fulfilled") aircraft.push(...r.value)

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
  usedSource: string | null
  failedUpstreams: string[]
  attempts: UpstreamAttempt[]
}

/**
 * Fetch aircraft from ALL available sources in parallel, deduplicate by ICAO
 * hex code, and return the combined set.
 */
export async function fetchAllAircraft(query?: MoverQuery): Promise<AircraftRecord[]> {
  const result = await fetchAllAircraftWithMeta(query)
  return result.aircraft
}

/**
 * Sequential ADS-B failover (OpenSky → adsb.lol point → adsb.fi point → mil/ladd).
 * No invented tracks. Empty + failedUpstreams when every live source fails.
 */
export async function fetchAllAircraftWithMeta(query?: MoverQuery): Promise<AircraftRegistryResult> {
  const limit = query?.limit && query.limit > 0 ? Math.min(query.limit, AIRCRAFT_MAX_FEATURES) : AIRCRAFT_MAX_FEATURES

  const live = await firstNonEmpty<AircraftRecord>([
    { name: "opensky", fn: () => fetchFromOpenSky(query) },
    { name: "adsb.lol", fn: () => fetchFromADSBLolPoint(query) },
    { name: "adsb.fi", fn: () => fetchFromADSBFiPoint(query) },
    { name: "adsb.lol-mil", fn: fetchFromADSBLol },
    { name: "adsbexchange", fn: fetchFromADSBExchange },
    { name: "mindex", fn: fetchFromMINDEX },
    { name: "flightradar24", fn: fetchFromFlightRadar24 },
  ])

  const inView = live.rows.filter((a) => inBbox(a.lat, a.lng, query?.bbox) && !(a.lat === 0 && a.lng === 0))
  const deduplicated = capRows(deduplicateByICAO(inView), limit)
  const sourceCounts: Record<string, number> = {}
  for (const attempt of live.attempts) sourceCounts[attempt.name] = attempt.count

  console.log(
    `[AircraftRegistry] failover used=${live.used || "none"} raw=${live.rows.length} unique=${deduplicated.length} failed=${failedUpstreamNames(live.attempts).join(",") || "none"}`
  )

  // Apr 20, 2026: fire-and-forget warm MINDEX crep.aircraft_live with this
  // fetch so next bbox read hits the cache. See lib/crep/mindex-ingest.ts
  // — no-op in local dev when MINDEX_INTERNAL_TOKEN / MINDEX_API_KEY are
  // unset. Awaited for typing clarity but wrapped in catch so a slow
  // MINDEX never delays the primary return.
  if (ENABLE_WEBSITE_MINDEX_WRITEBACK) {
  try {
    const { ingestToMindex } = await import("@/lib/crep/mindex-ingest")
    // Exclude MINDEX-sourced records so we don't round-trip our own cache
    const ingestables = deduplicated
      .filter((a) => a.source !== "mindex")
      .map((a) => ({
        source: a.source,
        source_id: a.icao || a.callsign || a.id,
        name: a.callsign || a.icao || null,
        entity_type: "aircraft",
        lat: a.lat,
        lng: a.lng,
        occurred_at: a.timestamp || new Date().toISOString(),
        properties: {
          icao: a.icao,
          callsign: a.callsign,
          altitude: a.altitude,
          velocity: a.velocity,
          heading: a.heading,
          origin: a.origin,
          destination: a.destination,
          aircraft_type: (a as any).aircraft_type,
          squawk: (a as any).squawk,
          on_ground: (a as any).on_ground,
        },
      }))
    void ingestToMindex({ layer: "aircraft_live", entities: ingestables, logPrefix: "[AircraftRegistry]" })
      .catch(() => { /* swallow */ })
  } catch { /* dynamic import failed; non-fatal */ }
  }

  return {
    aircraft: deduplicated,
    sources: sourceCounts,
    totalBeforeDedup: live.rows.length,
    fetchedAt: new Date().toISOString(),
    usedSource: live.used,
    failedUpstreams: failedUpstreamNames(live.attempts),
    attempts: live.attempts,
  }
}
