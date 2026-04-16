/**
 * Satellite Registry — Multi-Source Space Entity Aggregator
 *
 * Queries ALL available free satellite tracking data sources in parallel,
 * deduplicates by NORAD catalog number, and merges properties from multiple
 * sources including enrichment data (names, purposes, operators).
 *
 * Sources:
 *   1. CelesTrak GP JSON (primary) — https://celestrak.org/NORAD/elements/gp.php
 *   2. MINDEX PostGIS cache — /api/mindex/proxy/satellites
 *   3. TLE API mirror — https://tle.ivanstanojevic.me/api/tle/
 *   4. Space-Track.org (if SPACETRACK_USER + SPACETRACK_PASS exist)
 *   5. N2YO (if N2YO_API_KEY exists)
 *   6. UCS Satellite Database — static enrichment (names, purposes, operators)
 *
 * Each source has a 10 s timeout. Sources without required API keys/creds
 * are skipped silently. All errors are caught per-source so one failure never
 * blocks others.
 */

import { getSatelliteTrackingClient } from "@/lib/oei/connectors/satellite-tracking"

// =============================================================================
// TYPES
// =============================================================================

export interface SatelliteRecord {
  id: string
  noradId: number
  name: string
  lat: number
  lng: number
  altitude: number | null
  velocity: number | null
  inclination: number | null
  period: number | null
  orbitType: string | null
  objectType: string | null
  country: string | null
  source: string
  timestamp: string
  tleEpoch: string | null
  line1?: string
  line2?: string
  meanMotion?: number
  eccentricity?: number
  raAscNode?: number
  argPericenter?: number
  meanAnomaly?: number
  bstar?: number
}

interface SourceResult {
  source: string
  satellites: SatelliteRecord[]
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

const SPACETRACK_USER = process.env.SPACETRACK_USER || ""
const SPACETRACK_PASS = process.env.SPACETRACK_PASS || ""

const N2YO_API_KEY = process.env.N2YO_API_KEY || ""

const SOURCE_TIMEOUT_MS = 8_000 // 8s per source — fast fail, don't block CREP

const CELESTRAK_API = "https://celestrak.org/NORAD/elements/gp.php"
const TLE_API_BASE = "https://tle.ivanstanojevic.me/api/tle"

// =============================================================================
// SOURCE FETCHERS
// =============================================================================

/**
 * Source 1 — CelesTrak GP JSON (primary)
 *
 * Fetches GP (General Perturbations) data in JSON format for active satellites.
 * Returns orbital elements that can be propagated with SGP4.
 */
async function fetchFromCelesTrak(): Promise<SatelliteRecord[]> {
  // Fetch multiple CelesTrak groups in parallel for maximum coverage
  // Groups: active (~9K), stations (~500), starlink (~6K), weather (~900),
  // gnss (~130), resource (~160), science (~1K), misc (~500)
  const groups = ["active", "stations", "starlink", "weather", "gnss", "resource", "science", "misc"]

  const results = await Promise.allSettled(
    groups.map(async (group) => {
      const url = `${CELESTRAK_API}?GROUP=${group}&FORMAT=json`
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      })
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      return data
    })
  )

  const allGP: any[] = []
  for (const r of results) {
    if (r.status === "fulfilled") allGP.push(...r.value)
  }

  const now = new Date().toISOString()
  return allGP.map((gp: any) => ({
    id: `ct-${gp.NORAD_CAT_ID}`,
    noradId: parseInt(gp.NORAD_CAT_ID) || 0,
    name: gp.OBJECT_NAME ?? "Unknown",
    lat: 0, // Will be propagated by client-side SGP4
    lng: 0,
    altitude: null,
    velocity: null,
    inclination: gp.INCLINATION != null ? parseFloat(gp.INCLINATION) : null,
    period: gp.PERIOD != null ? parseFloat(gp.PERIOD) : null,
    orbitType: classifyOrbit(gp.PERIOD != null ? parseFloat(gp.PERIOD) : null, gp.INCLINATION != null ? parseFloat(gp.INCLINATION) : null),
    objectType: gp.OBJECT_TYPE ?? null,
    country: gp.COUNTRY_CODE ?? null,
    source: "celestrak" as const,
    timestamp: now,
    tleEpoch: gp.EPOCH ?? null,
    line1: gp.TLE_LINE1 ?? undefined,
    line2: gp.TLE_LINE2 ?? undefined,
    meanMotion: gp.MEAN_MOTION != null ? parseFloat(gp.MEAN_MOTION) : undefined,
    eccentricity: gp.ECCENTRICITY != null ? parseFloat(gp.ECCENTRICITY) : undefined,
    raAscNode: gp.RA_OF_ASC_NODE != null ? parseFloat(gp.RA_OF_ASC_NODE) : undefined,
    argPericenter: gp.ARG_OF_PERICENTER != null ? parseFloat(gp.ARG_OF_PERICENTER) : undefined,
    meanAnomaly: gp.MEAN_ANOMALY != null ? parseFloat(gp.MEAN_ANOMALY) : undefined,
    bstar: gp.BSTAR != null ? parseFloat(gp.BSTAR) : undefined,
  }))
}

/**
 * Source 2 — MINDEX PostGIS cache
 */
async function fetchFromMINDEX(): Promise<SatelliteRecord[]> {
  const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=satellites&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=10000`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  const entities: any[] = data.features ?? data.entities ?? data.satellites ?? []
  return entities.map((s) => normaliseGeneric(s, "mindex"))
}

/**
 * Source 3 — TLE API mirror (tle.ivanstanojevic.me)
 *
 * Free CelesTrak mirror that works in all network environments.
 * Paginated: default 20 per page, max 100.
 */
async function fetchFromTLEMirror(): Promise<SatelliteRecord[]> {
  // Paginate to get maximum TLE data — each page returns up to 100
  // Fetch first 50 pages in parallel (~5000 satellites) for broad coverage
  const PAGE_SIZE = 100
  const MAX_PAGES = 5 // 500 satellites from TLE mirror (more pages get rate-limited)
  const now = new Date().toISOString()

  const pageResults = await Promise.allSettled(
    Array.from({ length: MAX_PAGES }, (_, i) => i + 1).map(async (page) => {
      const url = `${TLE_API_BASE}?page=${page}&page_size=${PAGE_SIZE}&sort=popularity&sort_dir=desc`
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000), // shorter timeout per page
        headers: { Accept: "application/json" },
      })
      if (!res.ok) return []
      const data = await res.json()
      return data.member ?? data.results ?? []
    })
  )

  const allMembers: any[] = []
  for (const r of pageResults) {
    if (r.status === "fulfilled") allMembers.push(...r.value)
  }

  return allMembers.map((tle: any) => ({
    id: `tle-${tle.satelliteId ?? tle.noradCatalogId ?? Date.now()}`,
    noradId: parseInt(tle.satelliteId ?? tle.noradCatalogId) || 0,
    name: tle.name ?? "Unknown",
    lat: 0,
    lng: 0,
    altitude: null,
    velocity: null,
    inclination: null,
    period: null,
    orbitType: null,
    objectType: null,
    country: null,
    source: "tle-mirror" as const,
    timestamp: now,
    tleEpoch: tle.date ?? null,
    line1: tle.line1 ?? undefined,
    line2: tle.line2 ?? undefined,
  }))
}

/**
 * Source 4 — Space-Track.org (official USSPACECOM TLE source)
 *
 * Requires SPACETRACK_USER + SPACETRACK_PASS. Authenticates via cookie,
 * then fetches latest GP data.
 */
async function fetchFromSpaceTrack(): Promise<SatelliteRecord[]> {
  if (!SPACETRACK_USER || !SPACETRACK_PASS) return []

  // Step 1: Authenticate and get session cookie
  const loginUrl = "https://www.space-track.org/ajaxauth/login"
  const loginBody = new URLSearchParams({
    identity: SPACETRACK_USER,
    password: SPACETRACK_PASS,
  })

  const loginRes = await fetch(loginUrl, {
    method: "POST",
    body: loginBody,
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })

  if (!loginRes.ok) return []

  // Extract session cookies
  const cookies = loginRes.headers.getSetCookie?.() ?? []
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ")

  if (!cookieHeader) return []

  // Step 2: Fetch latest GP data (limit to 1000 for performance)
  const queryUrl =
    "https://www.space-track.org/basicspacedata/query/class/gp/DECAY_DATE/null-val/EPOCH/%3Enow-30/orderby/NORAD_CAT_ID/limit/1000/format/json"

  const dataRes = await fetch(queryUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
    },
  })

  if (!dataRes.ok) return []
  const data = await dataRes.json()
  if (!Array.isArray(data)) return []

  return data.map((gp: any) => ({
    id: `st-${gp.NORAD_CAT_ID}`,
    noradId: parseInt(gp.NORAD_CAT_ID) || 0,
    name: gp.OBJECT_NAME ?? "Unknown",
    lat: 0,
    lng: 0,
    altitude: null,
    velocity: null,
    inclination: gp.INCLINATION != null ? parseFloat(gp.INCLINATION) : null,
    period: gp.PERIOD != null ? parseFloat(gp.PERIOD) : null,
    orbitType: classifyOrbit(gp.PERIOD != null ? parseFloat(gp.PERIOD) : null, gp.INCLINATION != null ? parseFloat(gp.INCLINATION) : null),
    objectType: gp.OBJECT_TYPE ?? null,
    country: gp.COUNTRY_CODE ?? null,
    source: "spacetrack" as const,
    timestamp: new Date().toISOString(),
    tleEpoch: gp.EPOCH ?? null,
    line1: gp.TLE_LINE1 ?? undefined,
    line2: gp.TLE_LINE2 ?? undefined,
    meanMotion: gp.MEAN_MOTION != null ? parseFloat(gp.MEAN_MOTION) : undefined,
    eccentricity: gp.ECCENTRICITY != null ? parseFloat(gp.ECCENTRICITY) : undefined,
    raAscNode: gp.RA_OF_ASC_NODE != null ? parseFloat(gp.RA_OF_ASC_NODE) : undefined,
    argPericenter: gp.ARG_OF_PERICENTER != null ? parseFloat(gp.ARG_OF_PERICENTER) : undefined,
    meanAnomaly: gp.MEAN_ANOMALY != null ? parseFloat(gp.MEAN_ANOMALY) : undefined,
    bstar: gp.BSTAR != null ? parseFloat(gp.BSTAR) : undefined,
  }))
}

/**
 * Source 5 — N2YO satellite tracking API (requires N2YO_API_KEY)
 *
 * Fetches visual passes / positions for popular satellites.
 * The "above" endpoint returns satellites above a given position.
 * We use 0,0 with a huge radius to get as many as possible.
 */
async function fetchFromN2YO(): Promise<SatelliteRecord[]> {
  if (!N2YO_API_KEY) return []

  // Use "above" endpoint: returns satellites above a lat/lng within a search radius
  // observer_lat=0, observer_lng=0, observer_alt=0, search_radius=90 (degrees), category=0 (all)
  const url = `https://api.n2yo.com/rest/v1/satellite/above/0/0/0/90/0/&apiKey=${N2YO_API_KEY}`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const sats: any[] = data.above ?? []

  return sats.map((s: any) => ({
    id: `n2yo-${s.satid}`,
    noradId: parseInt(s.satid) || 0,
    name: s.satname ?? "Unknown",
    lat: parseFloat(s.satlat) || 0,
    lng: parseFloat(s.satlng) || 0,
    altitude: s.satalt != null ? parseFloat(s.satalt) : null,
    velocity: null,
    inclination: null,
    period: null,
    orbitType: null,
    objectType: null,
    country: null,
    source: "n2yo" as const,
    timestamp: new Date().toISOString(),
    tleEpoch: null,
  }))
}

/**
 * Source 6 — UCS Satellite Database (static enrichment data)
 *
 * CSV with names, purposes, operators, countries, orbit types.
 * Used to enrich records from other sources, not as a position source.
 * Fetches asynchronously; failures are non-fatal.
 */
async function fetchUCSEnrichment(): Promise<Map<string, Partial<SatelliteRecord>>> {
  const enrichMap = new Map<string, Partial<SatelliteRecord>>()

  try {
    const url = "https://www.ucsusa.org/sites/default/files/2022-01/UCS-Satellite-Database-1-1-2022.csv"
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      headers: { Accept: "text/csv" },
    })
    if (!res.ok) return enrichMap
    const text = await res.text()

    // Parse CSV - first line is headers
    const lines = text.split("\n")
    if (lines.length < 2) return enrichMap

    const headers = parseCSVLine(lines[0])
    const noradIdx = headers.findIndex((h) => h.toLowerCase().includes("norad"))
    const nameIdx = headers.findIndex((h) => h.toLowerCase().includes("name") && !h.toLowerCase().includes("alternate"))
    const countryIdx = headers.findIndex((h) => h.toLowerCase().includes("country"))
    const purposeIdx = headers.findIndex((h) => h.toLowerCase().includes("purpose"))
    const orbitIdx = headers.findIndex((h) => h.toLowerCase().includes("class of orbit"))
    const typeIdx = headers.findIndex((h) => h.toLowerCase().includes("type"))

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      const cols = parseCSVLine(lines[i])
      const noradStr = noradIdx >= 0 ? cols[noradIdx]?.trim() : ""
      if (!noradStr) continue

      enrichMap.set(noradStr, {
        name: nameIdx >= 0 ? cols[nameIdx]?.trim() || undefined : undefined,
        country: countryIdx >= 0 ? cols[countryIdx]?.trim() || null : null,
        objectType: purposeIdx >= 0 ? cols[purposeIdx]?.trim() || null : (typeIdx >= 0 ? cols[typeIdx]?.trim() || null : null),
        orbitType: orbitIdx >= 0 ? cols[orbitIdx]?.trim() || null : null,
      })
    }
  } catch {
    // Non-fatal — enrichment is best-effort
  }

  return enrichMap
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Classify orbit type from period (minutes) and inclination (degrees).
 */
function classifyOrbit(periodMin: number | null, inclDeg: number | null): string | null {
  if (periodMin == null) return null

  if (periodMin >= 1400 && periodMin <= 1500) return "GEO"
  if (periodMin < 128) return "LEO"
  if (periodMin >= 128 && periodMin < 720) return "MEO"
  if (periodMin >= 720 && periodMin < 1400) return "HEO"

  // Polar/SSO classification by inclination
  if (inclDeg != null) {
    if (inclDeg > 85 && inclDeg < 100) return "POLAR"
    if (inclDeg >= 96 && inclDeg <= 100) return "SSO"
  }

  return "UNKNOWN"
}

// =============================================================================
// NORMALISATION
// =============================================================================

/**
 * Best-effort normalisation for generic satellite objects (MINDEX cache).
 */
function normaliseGeneric(s: any, source: string): SatelliteRecord {
  const coords = s.location?.coordinates ?? s.geometry?.coordinates ?? s.estimatedPosition
  const props = s.properties ?? {}

  return {
    id: s.id ?? `${source}-${s.noradId ?? props.noradId ?? Date.now()}`,
    noradId: parseInt(s.noradId ?? props.noradId ?? 0),
    name: s.name ?? props.name ?? "Unknown",
    lat: coords
      ? (coords.latitude ?? coords[1] ?? 0)
      : parseFloat(s.lat ?? s.latitude ?? 0),
    lng: coords
      ? (coords.longitude ?? coords[0] ?? 0)
      : parseFloat(s.lng ?? s.longitude ?? 0),
    altitude: coords?.altitude ?? s.altitude ?? props.altitude ?? null,
    velocity: s.velocity ?? s.orbitalParams?.velocity ?? props.velocity ?? null,
    inclination: s.inclination ?? s.orbitalParams?.inclination ?? props.inclination ?? null,
    period: s.period ?? s.orbitalParams?.period ?? props.period ?? null,
    orbitType: s.orbitType ?? props.orbitType ?? null,
    objectType: s.objectType ?? props.objectType ?? null,
    country: s.country ?? props.owner ?? null,
    source,
    timestamp:
      s.lastSeen ??
      s.timestamp ??
      s.provenance?.collectedAt ??
      new Date().toISOString(),
    tleEpoch: s.tleEpoch ?? props.epoch ?? null,
    line1: s.line1 ?? props.line1 ?? undefined,
    line2: s.line2 ?? props.line2 ?? undefined,
    meanMotion: s.meanMotion ?? props.meanMotion ?? undefined,
    eccentricity: s.eccentricity ?? props.eccentricity ?? undefined,
    raAscNode: s.raAscNode ?? props.raAscNode ?? undefined,
    argPericenter: s.argPericenter ?? props.argPericenter ?? undefined,
    meanAnomaly: s.meanAnomaly ?? props.meanAnomaly ?? undefined,
    bstar: s.bstar ?? props.bstar ?? undefined,
  }
}

// =============================================================================
// DEDUPLICATION & MERGE
// =============================================================================

/**
 * Merge two SatelliteRecords, preferring more complete orbital data and
 * filling in null fields from secondary sources.
 */
function mergeSatellites(existing: SatelliteRecord, incoming: SatelliteRecord): SatelliteRecord {
  // Prefer the record with TLE data (line1/line2)
  const existingHasTLE = Boolean(existing.line1 && existing.line2)
  const incomingHasTLE = Boolean(incoming.line1 && incoming.line2)
  // Prefer the record with a real position (N2YO provides lat/lng)
  const existingHasPos = existing.lat !== 0 || existing.lng !== 0
  const incomingHasPos = incoming.lat !== 0 || incoming.lng !== 0

  return {
    id: existing.id,
    noradId: existing.noradId,
    name: existing.name !== "Unknown" ? existing.name : incoming.name,
    lat: incomingHasPos && !existingHasPos ? incoming.lat : existing.lat,
    lng: incomingHasPos && !existingHasPos ? incoming.lng : existing.lng,
    altitude: existing.altitude ?? incoming.altitude,
    velocity: existing.velocity ?? incoming.velocity,
    inclination: existing.inclination ?? incoming.inclination,
    period: existing.period ?? incoming.period,
    orbitType: existing.orbitType ?? incoming.orbitType,
    objectType: existing.objectType ?? incoming.objectType,
    country: existing.country ?? incoming.country,
    source: `${existing.source}+${incoming.source}`,
    timestamp: existing.timestamp,
    tleEpoch: existing.tleEpoch ?? incoming.tleEpoch,
    line1: existingHasTLE ? existing.line1 : incoming.line1,
    line2: existingHasTLE ? existing.line2 : incoming.line2,
    meanMotion: existing.meanMotion ?? incoming.meanMotion,
    eccentricity: existing.eccentricity ?? incoming.eccentricity,
    raAscNode: existing.raAscNode ?? incoming.raAscNode,
    argPericenter: existing.argPericenter ?? incoming.argPericenter,
    meanAnomaly: existing.meanAnomaly ?? incoming.meanAnomaly,
    bstar: existing.bstar ?? incoming.bstar,
  }
}

/**
 * Deduplicate satellites by NORAD catalog number and merge properties.
 */
function deduplicateByNORAD(allSatellites: SatelliteRecord[]): SatelliteRecord[] {
  const map = new Map<number, SatelliteRecord>()

  for (const s of allSatellites) {
    if (!s.noradId || s.noradId === 0) continue

    const existing = map.get(s.noradId)
    if (existing) {
      map.set(s.noradId, mergeSatellites(existing, s))
    } else {
      map.set(s.noradId, s)
    }
  }

  return Array.from(map.values())
}

/**
 * Apply UCS enrichment data to deduplicated records.
 */
function applyEnrichment(
  satellites: SatelliteRecord[],
  enrichMap: Map<string, Partial<SatelliteRecord>>
): SatelliteRecord[] {
  if (enrichMap.size === 0) return satellites

  return satellites.map((s) => {
    const enrich = enrichMap.get(String(s.noradId))
    if (!enrich) return s
    return {
      ...s,
      name: s.name !== "Unknown" ? s.name : (enrich.name ?? s.name),
      country: s.country ?? enrich.country ?? null,
      objectType: s.objectType ?? enrich.objectType ?? null,
      orbitType: s.orbitType ?? enrich.orbitType ?? null,
    }
  })
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface SatelliteRegistryResult {
  satellites: SatelliteRecord[]
  sources: Record<string, number>
  totalBeforeDedup: number
  enrichedFromUCS: boolean
  fetchedAt: string
}

/**
 * Fetch satellites from ALL available sources in parallel, deduplicate by
 * NORAD catalog number, enrich with UCS data, and return the combined set.
 */
export async function fetchAllSatellites(): Promise<SatelliteRecord[]> {
  const result = await fetchAllSatellitesWithMeta()
  return result.satellites
}

/**
 * Same as fetchAllSatellites but includes per-source counts and metadata.
 */
export async function fetchAllSatellitesWithMeta(): Promise<SatelliteRegistryResult> {
  const sourceFetchers: Array<{ name: string; fn: () => Promise<SatelliteRecord[]> }> = [
    { name: "celestrak", fn: fetchFromCelesTrak },
    { name: "mindex", fn: fetchFromMINDEX },
    { name: "tle-mirror", fn: fetchFromTLEMirror },
    { name: "spacetrack", fn: fetchFromSpaceTrack },
    { name: "n2yo", fn: fetchFromN2YO },
  ]

  // Fetch all position sources + UCS enrichment in parallel
  const [sourceResults, enrichMap] = await Promise.all([
    Promise.allSettled(
      sourceFetchers.map(async ({ name, fn }): Promise<SourceResult> => {
        const start = Date.now()
        try {
          const satellites = await fn()
          const dur = Date.now() - start
          if (satellites.length > 0) {
            console.log(`[SatelliteRegistry] ${name}: ${satellites.length} satellites (${dur}ms)`)
          }
          return { source: name, satellites, durationMs: dur }
        } catch (err) {
          const dur = Date.now() - start
          console.warn(`[SatelliteRegistry] ${name} failed (${dur}ms):`, (err as Error).message)
          return { source: name, satellites: [], error: (err as Error).message, durationMs: dur }
        }
      })
    ),
    fetchUCSEnrichment(),
  ])

  const allSatellites: SatelliteRecord[] = []
  const sourceCounts: Record<string, number> = {}

  for (const r of sourceResults) {
    if (r.status === "fulfilled") {
      allSatellites.push(...r.value.satellites)
      sourceCounts[r.value.source] = r.value.satellites.length
    }
  }

  const deduplicated = deduplicateByNORAD(allSatellites)
  const enriched = applyEnrichment(deduplicated, enrichMap)

  console.log(
    `[SatelliteRegistry] Combined: ${allSatellites.length} raw -> ${enriched.length} unique NORAD from ${Object.entries(sourceCounts)
      .filter(([, c]) => c > 0)
      .map(([s, c]) => `${s}(${c})`)
      .join(", ") || "no sources"}${enrichMap.size > 0 ? ` (+${enrichMap.size} UCS enrichment records)` : ""}`
  )

  return {
    satellites: enriched,
    sources: sourceCounts,
    totalBeforeDedup: allSatellites.length,
    enrichedFromUCS: enrichMap.size > 0,
    fetchedAt: new Date().toISOString(),
  }
}
