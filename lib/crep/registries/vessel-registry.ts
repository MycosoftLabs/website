/**
 * Vessel Registry — Multi-Source Maritime Entity Aggregator
 *
 * Queries ALL available free vessel/maritime data sources in parallel,
 * deduplicates by MMSI, and merges properties from multiple sources.
 *
 * Sources:
 *   1. AISstream WebSocket cache (primary — live AIS positions)
 *   2. MINDEX PostGIS cache (/api/mindex/proxy/vessels)
 *   3. MarineTraffic PS07 (if MARINETRAFFIC_API_KEY exists)
 *   4. VesselFinder free API (if VESSELFINDER_API_KEY exists)
 *   5. BarentsWatch (Norway) — free public AIS positions
 *   6. Danish Maritime Authority — free AIS data feed
 *
 * Each source has a 10 s timeout. Sources without required API keys are
 * skipped silently. All errors are caught per-source so one failure never
 * blocks others.
 */

import { getAISStreamClient } from "@/lib/oei/connectors/aisstream-ships"

// =============================================================================
// TYPES
// =============================================================================

export interface VesselRecord {
  id: string
  mmsi: string
  name: string
  lat: number
  lng: number
  sog: number | null
  cog: number | null
  heading: number | null
  shipType: number | null
  destination: string | null
  source: string
  timestamp: string
}

interface SourceResult {
  source: string
  vessels: VesselRecord[]
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

const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY || ""
const VESSELFINDER_API_KEY = process.env.VESSELFINDER_API_KEY || ""

const SOURCE_TIMEOUT_MS = 10_000

// =============================================================================
// SOURCE FETCHERS
// =============================================================================

/**
 * Source 1 — AISstream WebSocket cache (in-process singleton)
 */
async function fetchFromAISStream(): Promise<VesselRecord[]> {
  try {
    const client = getAISStreamClient()
    if (!client.hasApiKey()) return []

    const raw = client.getCachedVessels({})
    return (raw as any[]).map((v: any) => normaliseGeneric(v, "aisstream"))
  } catch {
    return []
  }
}

/**
 * Source 2 — MINDEX PostGIS earth layer
 */
async function fetchFromMINDEX(): Promise<VesselRecord[]> {
  const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=vessels&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=5000`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  const entities: any[] = data.features ?? data.entities ?? data.vessels ?? []
  return entities.map((v) => normaliseGeneric(v, "mindex"))
}

/**
 * Source 3 — MarineTraffic PS07 export (requires API key)
 */
async function fetchFromMarineTraffic(): Promise<VesselRecord[]> {
  if (!MARINETRAFFIC_API_KEY) return []

  const url = `https://services.marinetraffic.com/api/exportvessels/v:8/${MARINETRAFFIC_API_KEY}/timespan:60/protocol:jsono`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.map((v: any) => ({
    id: `mt-${v.MMSI || v.SHIPID || Date.now()}`,
    mmsi: String(v.MMSI ?? ""),
    name: v.SHIPNAME ?? "Unknown",
    lat: parseFloat(v.LAT) || 0,
    lng: parseFloat(v.LON) || 0,
    sog: v.SPEED != null ? parseFloat(v.SPEED) / 10 : null,
    cog: v.COURSE != null ? parseFloat(v.COURSE) / 10 : null,
    heading: v.HEADING != null ? parseFloat(v.HEADING) : null,
    shipType: v.SHIPTYPE != null ? parseInt(v.SHIPTYPE) : null,
    destination: v.DESTINATION || null,
    source: "marinetraffic" as const,
    timestamp: v.TIMESTAMP || new Date().toISOString(),
  }))
}

/**
 * Source 4 — VesselFinder free API (requires API key)
 */
async function fetchFromVesselFinder(): Promise<VesselRecord[]> {
  if (!VESSELFINDER_API_KEY) return []

  const url = `https://api.vesselfinder.com/vessels?userkey=${VESSELFINDER_API_KEY}`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const vessels: any[] = Array.isArray(data) ? data : data.vessels ?? data.data ?? []

  return vessels.map((v: any) => ({
    id: `vf-${v.MMSI || v.AIS?.MMSI || Date.now()}`,
    mmsi: String(v.MMSI ?? v.AIS?.MMSI ?? ""),
    name: v.NAME ?? v.AIS?.NAME ?? "Unknown",
    lat: parseFloat(v.AIS?.LATITUDE ?? v.LAT ?? v.latitude ?? 0),
    lng: parseFloat(v.AIS?.LONGITUDE ?? v.LON ?? v.longitude ?? 0),
    sog: v.AIS?.SPEED != null ? parseFloat(v.AIS.SPEED) : null,
    cog: v.AIS?.COURSE != null ? parseFloat(v.AIS.COURSE) : null,
    heading: v.AIS?.HEADING != null ? parseFloat(v.AIS.HEADING) : null,
    shipType: v.AIS?.SHIPTYPE != null ? parseInt(v.AIS.SHIPTYPE) : null,
    destination: v.AIS?.DESTINATION ?? null,
    source: "vesselfinder" as const,
    timestamp: v.AIS?.TIMESTAMP ?? new Date().toISOString(),
  }))
}

/**
 * Source 5 — BarentsWatch (Norway) — free public AIS open positions
 */
async function fetchFromBarentsWatch(): Promise<VesselRecord[]> {
  const url = "https://www.barentswatch.no/bwapi/v2/geodata/ais/openpositions"
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const vessels: any[] = Array.isArray(data) ? data : data.features ?? data.data ?? []

  return vessels.map((v: any) => {
    // BarentsWatch may return GeoJSON features or flat objects
    const props = v.properties ?? v
    const coords = v.geometry?.coordinates
    return {
      id: `bw-${props.mmsi ?? props.MMSI ?? Date.now()}`,
      mmsi: String(props.mmsi ?? props.MMSI ?? ""),
      name: props.name ?? props.shipName ?? "Unknown",
      lat: coords ? coords[1] : parseFloat(props.latitude ?? props.lat ?? 0),
      lng: coords ? coords[0] : parseFloat(props.longitude ?? props.lng ?? 0),
      sog: props.speedOverGround ?? props.sog ?? null,
      cog: props.courseOverGround ?? props.cog ?? null,
      heading: props.trueHeading ?? props.heading ?? null,
      shipType: props.shipType ?? null,
      destination: props.destination ?? null,
      source: "barentswatch" as const,
      timestamp: props.msgtime ?? props.timestamp ?? new Date().toISOString(),
    }
  })
}

/**
 * Source 6 — Danish Maritime Authority — free AIS positions feed
 */
async function fetchFromDMA(): Promise<VesselRecord[]> {
  const url = "https://ais.dma.dk/ais-ab/ais-positions"
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const vessels: any[] = Array.isArray(data) ? data : data.features ?? data.aisPositions ?? []

  return vessels.map((v: any) => {
    const props = v.properties ?? v
    const coords = v.geometry?.coordinates
    return {
      id: `dma-${props.mmsi ?? props.MMSI ?? Date.now()}`,
      mmsi: String(props.mmsi ?? props.MMSI ?? ""),
      name: props.name ?? props.shipName ?? "Unknown",
      lat: coords ? coords[1] : parseFloat(props.latitude ?? props.lat ?? 0),
      lng: coords ? coords[0] : parseFloat(props.longitude ?? props.lng ?? 0),
      sog: props.sog ?? props.speedOverGround ?? null,
      cog: props.cog ?? props.courseOverGround ?? null,
      heading: props.heading ?? props.trueHeading ?? null,
      shipType: props.shipType ?? null,
      destination: props.destination ?? null,
      source: "dma" as const,
      timestamp: props.timestamp ?? props.msgtime ?? new Date().toISOString(),
    }
  })
}

// =============================================================================
// NORMALISATION
// =============================================================================

/**
 * Best-effort normalisation for generic vessel objects (MINDEX / AISstream cache).
 * Handles GeoJSON Point locations, flat lat/lng fields, and nested properties.
 */
function normaliseGeneric(v: any, source: string): VesselRecord {
  const coords = v.location?.coordinates ?? v.geometry?.coordinates
  const props = v.properties ?? {}

  return {
    id: v.id ?? `${source}-${v.mmsi ?? v.UserID ?? Date.now()}`,
    mmsi: String(v.mmsi ?? v.UserID ?? props.mmsi ?? ""),
    name: v.name ?? v.shipName ?? props.shipName ?? "Unknown",
    lat: coords ? coords[1] : parseFloat(v.lat ?? v.latitude ?? 0),
    lng: coords ? coords[0] : parseFloat(v.lng ?? v.longitude ?? 0),
    sog: v.sog ?? v.speed ?? props.sog ?? null,
    cog: v.cog ?? v.course ?? props.cog ?? null,
    heading: v.heading ?? v.trueHeading ?? props.heading ?? null,
    shipType: v.shipType ?? props.shipType ?? null,
    destination: v.destination ?? props.destination ?? null,
    source,
    timestamp:
      v.lastSeen ??
      v.timestamp ??
      v.provenance?.collectedAt ??
      new Date().toISOString(),
  }
}

// =============================================================================
// DEDUPLICATION & MERGE
// =============================================================================

/**
 * Merge two VesselRecords, preferring non-null values from `incoming` for
 * nullable fields but keeping the existing record's core position if newer.
 */
function mergeVessels(existing: VesselRecord, incoming: VesselRecord): VesselRecord {
  const existingTs = new Date(existing.timestamp).getTime()
  const incomingTs = new Date(incoming.timestamp).getTime()
  const useIncomingPos = incomingTs >= existingTs

  return {
    id: existing.id,
    mmsi: existing.mmsi,
    name: existing.name !== "Unknown" ? existing.name : incoming.name,
    lat: useIncomingPos ? incoming.lat : existing.lat,
    lng: useIncomingPos ? incoming.lng : existing.lng,
    sog: (useIncomingPos ? incoming.sog : existing.sog) ?? existing.sog ?? incoming.sog,
    cog: (useIncomingPos ? incoming.cog : existing.cog) ?? existing.cog ?? incoming.cog,
    heading: existing.heading ?? incoming.heading,
    shipType: existing.shipType ?? incoming.shipType,
    destination: existing.destination ?? incoming.destination,
    source: `${existing.source}+${incoming.source}`,
    timestamp: useIncomingPos ? incoming.timestamp : existing.timestamp,
  }
}

/**
 * Deduplicate vessels by MMSI and merge properties from all sources.
 */
function deduplicateByMMSI(allVessels: VesselRecord[]): VesselRecord[] {
  const map = new Map<string, VesselRecord>()

  for (const v of allVessels) {
    if (!v.mmsi || v.mmsi === "0" || v.mmsi === "") continue
    // Filter out invalid coordinates
    if (v.lat === 0 && v.lng === 0) continue

    const existing = map.get(v.mmsi)
    if (existing) {
      map.set(v.mmsi, mergeVessels(existing, v))
    } else {
      map.set(v.mmsi, v)
    }
  }

  return Array.from(map.values())
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface VesselRegistryResult {
  vessels: VesselRecord[]
  sources: Record<string, number>
  totalBeforeDedup: number
  fetchedAt: string
}

/**
 * Fetch vessels from ALL available sources in parallel, deduplicate by MMSI,
 * and return the combined set.
 */
export async function fetchAllVessels(): Promise<VesselRecord[]> {
  const result = await fetchAllVesselsWithMeta()
  return result.vessels
}

/**
 * Same as fetchAllVessels but includes per-source counts and metadata.
 */
export async function fetchAllVesselsWithMeta(): Promise<VesselRegistryResult> {
  const sourceFetchers: Array<{ name: string; fn: () => Promise<VesselRecord[]> }> = [
    { name: "aisstream", fn: fetchFromAISStream },
    { name: "mindex", fn: fetchFromMINDEX },
    { name: "marinetraffic", fn: fetchFromMarineTraffic },
    { name: "vesselfinder", fn: fetchFromVesselFinder },
    { name: "barentswatch", fn: fetchFromBarentsWatch },
    { name: "dma", fn: fetchFromDMA },
  ]

  const results = await Promise.allSettled(
    sourceFetchers.map(async ({ name, fn }): Promise<SourceResult> => {
      const start = Date.now()
      try {
        const vessels = await fn()
        const dur = Date.now() - start
        if (vessels.length > 0) {
          console.log(`[VesselRegistry] ${name}: ${vessels.length} vessels (${dur}ms)`)
        }
        return { source: name, vessels, durationMs: dur }
      } catch (err) {
        const dur = Date.now() - start
        console.warn(`[VesselRegistry] ${name} failed (${dur}ms):`, (err as Error).message)
        return { source: name, vessels: [], error: (err as Error).message, durationMs: dur }
      }
    })
  )

  const allVessels: VesselRecord[] = []
  const sourceCounts: Record<string, number> = {}

  for (const r of results) {
    if (r.status === "fulfilled") {
      allVessels.push(...r.value.vessels)
      sourceCounts[r.value.source] = r.value.vessels.length
    }
  }

  const deduplicated = deduplicateByMMSI(allVessels)

  console.log(
    `[VesselRegistry] Combined: ${allVessels.length} raw -> ${deduplicated.length} unique MMSI from ${Object.entries(sourceCounts)
      .filter(([, c]) => c > 0)
      .map(([s, c]) => `${s}(${c})`)
      .join(", ") || "no sources"}`
  )

  return {
    vessels: deduplicated,
    sources: sourceCounts,
    totalBeforeDedup: allVessels.length,
    fetchedAt: new Date().toISOString(),
  }
}
