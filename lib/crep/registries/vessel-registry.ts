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
 *   7. Global Fishing Watch — fishing events with vessel positions (last 24h)
 *   8. AISHub — community AIS data sharing (rate-limited: 1 req/min)
 *
 * Each source has a 10 s timeout. Sources without required API keys are
 * skipped silently. All errors are caught per-source so one failure never
 * blocks others.
 */

import { getAISStreamClient } from "@/lib/oei/connectors/aisstream-ships"
import { getSdrVesselsAsRecords } from "@/lib/crep/sdr-vessel-cache"
import { saveVesselsToDiskCache, readVesselsFromDiskCache } from "@/lib/crep/vessel-disk-cache"
import {
  CREP_OSINT_UA,
  VESSEL_MAX_FEATURES,
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

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""
const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

function mindexAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" }
  if (MINDEX_INTERNAL_TOKEN) h["X-Internal-Token"] = MINDEX_INTERNAL_TOKEN
  if (MINDEX_API_KEY) h["X-API-Key"] = MINDEX_API_KEY
  return h
}

const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY || ""
const VESSELFINDER_API_KEY = process.env.VESSELFINDER_API_KEY || ""
const GFW_TOKEN = process.env.GLOBAL_FISHING_WATCH_TOKEN || ""
const AISHUB_USERNAME = process.env.AISHUB_USERNAME || ""

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

// AISHub rate limit: max 1 request per minute
let lastAISHubFetch = 0
const AISHUB_MIN_INTERVAL = 61_000 // 61 seconds

// =============================================================================
// SOURCE FETCHERS
// =============================================================================

/**
 * Source 1 — AISstream WebSocket cache (in-process singleton)
 */
async function fetchFromAISStream(query?: MoverQuery): Promise<VesselRecord[]> {
  const client = getAISStreamClient()
  if (!client.hasApiKey()) throw new Error("AISSTREAM_API_KEY unset")
  const raw = client.getCachedVessels({})
  const vessels = (raw as any[])
    .map((v: any) => normaliseGeneric(v, "aisstream"))
    .filter((v) => inBbox(v.lat, v.lng, query?.bbox))
  if (vessels.length === 0) throw new Error("AISStream cache empty in bbox")
  return vessels
}

/**
 * Source 2 — MINDEX PostGIS earth layer
 */
async function fetchFromMINDEX(): Promise<VesselRecord[]> {
  const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=vessels&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=5000`
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: mindexAuthHeaders(),
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
    headers: {
      Accept: "application/json",
      "User-Agent": "Mycosoft-CREP/1.0 (+https://mycosoft.com)",
    },
  })
  if (!res.ok) {
    logMovingRegistryDebug(`[VesselRegistry/BarentsWatch] status=${res.status}`)
    return []
  }
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
    headers: {
      Accept: "application/json",
      "User-Agent": "Mycosoft-CREP/1.0 (+https://mycosoft.com)",
    },
  })
  if (!res.ok) {
    logMovingRegistryDebug(`[VesselRegistry/DMA] status=${res.status}`)
    return []
  }
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

/**
 * Source 7 — Global Fishing Watch — fishing events with vessel positions (last 24h)
 * Uses the GFW Events API to retrieve fishing/encounter/port_visit events.
 * Each event includes lat/lng from event geometry and vessel identity info.
 */
async function fetchFromGFW(): Promise<VesselRecord[]> {
  if (!GFW_TOKEN) throw new Error("GLOBAL_FISHING_WATCH_TOKEN unset")

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const startDate = dayAgo.toISOString().split("T")[0]
  const endDate = now.toISOString().split("T")[0]

  const url =
    `https://gateway.api.globalfishingwatch.org/v3/events` +
    `?datasets[0]=public-global-fishing-events:latest` +
    `&start-date=${startDate}&end-date=${endDate}&limit=1000`

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${GFW_TOKEN}`,
    },
  })
  if (!res.ok) throw new Error(`GFW HTTP ${res.status}`)
  const data = await res.json()
  const events: any[] = Array.isArray(data) ? data : data.entries ?? data.events ?? []

  const mapped = events
    .filter((e: any) => {
      const coords = e.position ?? e.geometry?.coordinates
      return coords != null
    })
    .map((e: any) => {
      // position may be {lat, lon} or geometry may be GeoJSON Point
      const lat =
        e.position?.lat ??
        (e.geometry?.coordinates ? e.geometry.coordinates[1] : 0)
      const lng =
        e.position?.lon ??
        e.position?.lng ??
        (e.geometry?.coordinates ? e.geometry.coordinates[0] : 0)

      const vesselId = e.vessel?.id ?? e.vesselId ?? e.id ?? String(Date.now())
      const mmsi = e.vessel?.ssvid ?? e.vessel?.mmsi ?? ""
      const name = e.vessel?.name ?? e.vessel?.shipname ?? "Unknown"
      const flag = e.vessel?.flag ?? null
      const eventType = e.type ?? e.eventType ?? "fishing"

      return {
        id: `gfw_${vesselId}`,
        mmsi: String(mmsi),
        name: flag ? `${name} [${flag}]` : name,
        lat: parseFloat(String(lat)) || 0,
        lng: parseFloat(String(lng)) || 0,
        sog: null, // fishing events don't carry speed
        cog: null,
        heading: null,
        shipType: "fishing" as any,
        destination: eventType !== "fishing" ? eventType : null,
        source: "gfw" as const,
        timestamp:
          e.end ?? e.start ?? e.timestamp ?? new Date().toISOString(),
      }
    })
  if (mapped.length === 0) throw new Error("GFW returned no vessel positions")
  return mapped
}

/**
 * Finnish Transport Infrastructure Agency AIS (keyless, Baltic / Finland).
 * Requires Digitraffic-User. Does not cover San Diego / CONUS.
 */
async function fetchFromDigitraffic(): Promise<VesselRecord[]> {
  const url = "https://meri.digitraffic.fi/api/ais/v1/locations"
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/json",
      "Digitraffic-User": "Mycosoft-CREP/1.0",
      "User-Agent": CREP_OSINT_UA,
    },
  })
  if (!res.ok) throw new Error(`Digitraffic HTTP ${res.status}`)
  const data = await res.json()
  const features: any[] = Array.isArray(data) ? data : data.features ?? data.locations ?? []
  const vessels = features.map((v: any) => {
    const props = v.properties ?? v
    const coords = v.geometry?.coordinates
    return {
      id: `digitraffic-${props.mmsi ?? props.MMSI ?? Date.now()}`,
      mmsi: String(props.mmsi ?? props.MMSI ?? ""),
      name: props.name ?? props.shipName ?? "Unknown",
      lat: coords ? Number(coords[1]) : parseFloat(props.latitude ?? props.lat ?? 0),
      lng: coords ? Number(coords[0]) : parseFloat(props.longitude ?? props.lng ?? 0),
      sog: props.sog ?? props.speedOverGround ?? null,
      cog: props.cog ?? props.courseOverGround ?? null,
      heading: props.heading ?? props.trueHeading ?? null,
      shipType: props.shipType ?? null,
      destination: props.destination ?? null,
      source: "digitraffic" as const,
      timestamp: props.timestamp ?? props.time ?? new Date().toISOString(),
    }
  })
  if (vessels.length === 0) throw new Error("Digitraffic returned no vessels")
  return vessels
}

/**
 * Source 8 — AISHub — community AIS data sharing network
 * IMPORTANT: Rate limited to max 1 request per 60 seconds.
 * Returns empty if called within 61 s of last successful fetch.
 *
 * Response format (format=1, human-readable):
 *   MMSI, TIME, LONGITUDE, LATITUDE, COG (0.1 deg), SOG (0.1 kn),
 *   HEADING, ROT, NAVSTAT, IMO, NAME, CALLSIGN, TYPE, DRAUGHT, DEST, ETA
 */
async function fetchFromAISHub(): Promise<VesselRecord[]> {
  if (!AISHUB_USERNAME) throw new Error("AISHUB_USERNAME unset")

  // Enforce rate limit — max 1 request per minute
  const now = Date.now()
  if (now - lastAISHubFetch < AISHUB_MIN_INTERVAL) return []
  lastAISHubFetch = now

  const url =
    `https://data.aishub.net/ws.php` +
    `?username=${encodeURIComponent(AISHUB_USERNAME)}` +
    `&format=1&output=json&compress=0`

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()

  // AISHub returns [ metaObject, dataArray ] or { ERROR: ... }
  const vessels: any[] = Array.isArray(data)
    ? Array.isArray(data[1]) ? data[1] : data
    : data.data ?? data.vessels ?? []

  return vessels.map((v: any) => ({
    id: `aishub_${v.MMSI ?? v.mmsi ?? Date.now()}`,
    mmsi: String(v.MMSI ?? v.mmsi ?? ""),
    name: v.NAME ?? v.name ?? "Unknown",
    lat: parseFloat(v.LATITUDE ?? v.latitude ?? 0),
    lng: parseFloat(v.LONGITUDE ?? v.longitude ?? 0),
    sog: v.SOG != null ? parseFloat(v.SOG) / 10 : null,
    cog: v.COG != null ? parseFloat(v.COG) / 10 : null,
    heading: v.HEADING != null ? parseFloat(v.HEADING) : null,
    shipType: v.TYPE != null ? parseInt(v.TYPE) : null,
    destination: v.DEST ?? v.destination ?? null,
    source: "aishub" as const,
    timestamp: v.TIME ?? v.time ?? new Date().toISOString(),
  }))
}

// =============================================================================
// NORMALISATION
// =============================================================================

/**
 * Best-effort normalisation for generic vessel objects (MINDEX / AISstream cache).
 * Handles GeoJSON Point locations, flat lat/lng fields, and nested properties.
 */
function normaliseGeneric(v: any, source: string): VesselRecord {
  // AISstream cache entities use `location: { latitude, longitude, source }`
  // MINDEX entities may use GeoJSON `location.coordinates: [lng, lat]`
  // Some providers use flat `v.lat` / `v.lng`, others wrap in `v.properties`.
  // Try ALL known shapes in order of specificity.
  const props = v.properties ?? {}

  // Try explicit latitude/longitude first (AISstream VesselEntity shape)
  let lat: number = parseFloat(
    v.location?.latitude ??
      v.latitude ??
      v.lat ??
      props.latitude ??
      props.lat ??
      0
  )
  let lng: number = parseFloat(
    v.location?.longitude ??
      v.longitude ??
      v.lng ??
      props.longitude ??
      props.lng ??
      0
  )

  // Fallback: GeoJSON-style [lng, lat] coordinates array
  if ((!lat || !lng) && (v.location?.coordinates || v.geometry?.coordinates)) {
    const coords = v.location?.coordinates ?? v.geometry?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      lng = Number(coords[0]) || lng
      lat = Number(coords[1]) || lat
    }
  }

  return {
    id: v.id ?? `${source}-${v.mmsi ?? v.UserID ?? props.mmsi ?? Date.now()}`,
    mmsi: String(v.mmsi ?? v.UserID ?? props.mmsi ?? ""),
    name: v.name ?? v.shipName ?? props.shipName ?? props.name ?? "Unknown",
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    sog: v.sog ?? v.speed ?? props.sog ?? null,
    cog: v.cog ?? v.course ?? props.cog ?? null,
    heading: v.heading ?? v.trueHeading ?? props.heading ?? null,
    shipType: v.shipType ?? props.shipType ?? props.shipTypeNum ?? null,
    destination: v.destination ?? props.destination ?? null,
    source,
    timestamp:
      v.lastSeen ??
      v.lastSeenAt ??
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
  const incomingHasCoords = incoming.lat !== 0 || incoming.lng !== 0
  const existingHasCoords = existing.lat !== 0 || existing.lng !== 0
  const useIncomingPos = incomingHasCoords && (!existingHasCoords || incomingTs >= existingTs)

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
  usedSource: string | null
  failedUpstreams: string[]
  attempts: UpstreamAttempt[]
  stale?: boolean
}

/**
 * Fetch vessels from ALL available sources in parallel, deduplicate by MMSI,
 * and return the combined set.
 */
export async function fetchAllVessels(query?: MoverQuery): Promise<VesselRecord[]> {
  const result = await fetchAllVesselsWithMeta(query)
  return result.vessels
}

/**
 * Sequential AIS failover (AISStream → GFW → Digitrafffic → AISHub → SDR → disk).
 * Disk is last-known real AIS, not invented. Empty + failedUpstreams if all fail.
 */
export async function fetchAllVesselsWithMeta(query?: MoverQuery): Promise<VesselRegistryResult> {
  const limit = query?.limit && query.limit > 0 ? Math.min(query.limit, VESSEL_MAX_FEATURES) : VESSEL_MAX_FEATURES

  const inQueryBbox = (rows: VesselRecord[]) => rows.filter((v) => inBbox(v.lat, v.lng, query?.bbox))

  const live = await firstNonEmpty<VesselRecord>([
    { name: "aisstream", fn: () => fetchFromAISStream(query) },
    { name: "gfw", fn: async () => {
      const rows = inQueryBbox(await fetchFromGFW())
      if (!rows.length) throw new Error("GFW empty in bbox")
      return rows
    } },
    { name: "digitraffic", fn: async () => {
      const rows = inQueryBbox(await fetchFromDigitraffic())
      if (!rows.length) throw new Error("Digitraffic empty in bbox (Baltic feed)")
      return rows
    } },
    { name: "aishub", fn: async () => {
      const rows = inQueryBbox(await fetchFromAISHub())
      if (!rows.length) throw new Error("AISHub empty in bbox")
      return rows
    } },
    { name: "sdr", fn: async () => {
      const rows = inQueryBbox(getSdrVesselsAsRecords())
      if (!rows.length) throw new Error("SDR cache empty in bbox")
      return rows
    } },
    { name: "mindex", fn: async () => {
      const rows = inQueryBbox(await fetchFromMINDEX())
      if (!rows.length) throw new Error("MINDEX empty in bbox")
      return rows
    } },
    { name: "disk", fn: async () => {
      const rows = inQueryBbox(readVesselsFromDiskCache())
      if (!rows.length) throw new Error("vessel disk cache empty in bbox")
      return rows
    } },
  ])

  const inView = live.rows.filter((v) => inBbox(v.lat, v.lng, query?.bbox))
  const deduplicated = capRows(deduplicateByMMSI(inView), limit)
  const sourceCounts: Record<string, number> = {}
  for (const attempt of live.attempts) sourceCounts[attempt.name] = attempt.count

  console.log(
    `[VesselRegistry] failover used=${live.used || "none"} raw=${live.rows.length} unique=${deduplicated.length} failed=${failedUpstreamNames(live.attempts).join(",") || "none"}`
  )

  // Apr 22, 2026 — persist any live-source vessels to disk so they
  // survive AIS WebSocket drops. Only cache vessels that came from a
  // live source (not our own disk cache re-read).
  const freshVessels = deduplicated.filter((v) => v.source !== "disk")
  if (freshVessels.length > 0) {
    saveVesselsToDiskCache(freshVessels)
  }

  if (ENABLE_WEBSITE_MINDEX_WRITEBACK) {
    try {
      const { ingestToMindex } = await import("@/lib/crep/mindex-ingest")
      const ingestables = deduplicated
        .filter((v) => v.source !== "mindex")
        .map((v: any) => ({
          source: v.source,
          source_id: String(v.mmsi || v.imo || v.id),
          name: v.name || null,
          entity_type: "vessel",
          lat: v.lat,
          lng: v.lng,
          occurred_at: v.timestamp || new Date().toISOString(),
          properties: {
            mmsi: v.mmsi,
            imo: v.imo,
            callsign: v.callsign,
            type: v.type,
            flag: v.flag,
            operator: v.operator,
            destination: v.destination,
            speed: v.speed,
            heading: v.heading,
            length_m: v.length_m,
            width_m: v.width_m,
            draught_m: v.draught_m,
          },
        }))
      void ingestToMindex({ layer: "vessel_live", entities: ingestables, logPrefix: "[VesselRegistry]" })
        .catch(() => { /* swallow */ })
    } catch { /* dynamic import failed; non-fatal */ }
  }

  return {
    vessels: deduplicated,
    sources: sourceCounts,
    totalBeforeDedup: live.rows.length,
    fetchedAt: new Date().toISOString(),
    usedSource: live.used,
    failedUpstreams: failedUpstreamNames(live.attempts),
    attempts: live.attempts,
    stale: live.used === "disk",
  }
}
