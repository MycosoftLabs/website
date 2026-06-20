/**
 * CREP Data Service
 *
 * Unified service for all CREP data fetching with:
 * - Centralized caching (memory + Redis multi-layer)
 * - Rate limiting and request deduplication
 * - Error handling with typed error responses
 * - Background refresh (stale-while-revalidate)
 * - Pagination support for large datasets
 * - Abort signal support for cleanup on unmount
 *
 * Uses centralized API_URLS config — no hard-coded IPs.
 */

import { getCachedData, getCacheStats, invalidateCache } from "./data-cache"
import { API_URLS } from "@/lib/config/api-urls"

// ============================================================================
// Types
// ============================================================================

export interface CREPDataSummary {
  aircraft: number
  vessels: number
  satellites: number
  fungalObservations: number
  globalEvents: number
  devices: number
  lastUpdated: string
}

export interface FetchOptions {
  forceRefresh?: boolean
  timeout?: number
  limit?: number
  offset?: number
  signal?: AbortSignal
}

/** Default caps for /api/crep/unified global bundle (Jun 20 2026). */
export const UNIFIED_DEFAULT_LIMITS = {
  aircraft: 1500,
  vessels: 2500,
  satellites: 1200,
  fungal: 800,
  events: 500,
} as const

export type UnifiedLimits = typeof UNIFIED_DEFAULT_LIMITS

export interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Data types — canonical flat format for crep-data-service consumers
export interface Aircraft {
  id: string
  callsign: string
  lat: number
  lng: number
  altitude: number
  speed: number
  heading: number
  type?: string
  origin?: string
  destination?: string
}

export interface Vessel {
  id: string
  mmsi: string
  name: string
  lat: number
  lng: number
  heading: number
  speed: number
  type?: string
  destination?: string
}

export interface Satellite {
  id: string
  name: string
  noradId: string
  lat: number
  lng: number
  altitude: number
  velocity: number
  category?: string
}

export interface SpaceWeatherData {
  solarFlares: unknown[]
  geomagneticStorms: unknown[]
  solarWind: unknown
  alerts: unknown[]
}

export interface GlobalEvent {
  id: string
  type: string
  title: string
  lat: number
  lng: number
  severity?: string
  timestamp?: string
}

export interface FungalObservation {
  id: string
  species: string
  lat: number
  lng: number
  observedOn?: string
  location?: string
}

export interface Device {
  id: string
  name: string
  type: string
  lat?: number
  lng?: number
  status: string
  lastSeen?: string
}

// ============================================================================
// URL Configuration
// ============================================================================

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""
  return API_URLS.LOCAL_BASE
}

// ============================================================================
// Fetch Utilities
// ============================================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // Merge with external signal if provided
  const externalSignal = options.signal
  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function safeFetch<T>(
  url: string,
  defaultValue: T,
  timeoutMs = 10000,
  signal?: AbortSignal
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, signal ? { signal } : {}, timeoutMs)
    if (!response.ok) {
      console.warn(`[CREP Service] ${url} returned ${response.status}`)
      return defaultValue
    }
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[CREP Service] ${url} timed out or aborted`)
    } else {
      console.warn(`[CREP Service] ${url} failed:`, error)
    }
    return defaultValue
  }
}

function slimAircraftRecord(raw: Record<string, unknown>): Aircraft {
  return {
    id: String(raw.id ?? raw.icao ?? ""),
    callsign: String(raw.callsign ?? raw.flight ?? ""),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? raw.lon ?? 0),
    altitude: Number(raw.altitude ?? raw.alt ?? 0),
    speed: Number(raw.speed ?? raw.velocity ?? 0),
    heading: Number(raw.heading ?? raw.track ?? 0),
    type: raw.type ? String(raw.type) : undefined,
    origin: raw.origin ? String(raw.origin) : undefined,
    destination: raw.destination ? String(raw.destination) : undefined,
  }
}

function slimVesselRecord(raw: Record<string, unknown>): Vessel {
  return {
    id: String(raw.id ?? raw.mmsi ?? ""),
    mmsi: String(raw.mmsi ?? raw.id ?? ""),
    name: String(raw.name ?? "Vessel"),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? raw.lon ?? 0),
    heading: Number(raw.heading ?? 0),
    speed: Number(raw.speed ?? 0),
    type: raw.type ? String(raw.type) : undefined,
    destination: raw.destination ? String(raw.destination) : undefined,
  }
}

function slimFungalRecord(raw: Record<string, unknown>): FungalObservation {
  return {
    id: String(raw.id ?? ""),
    species: String(raw.species ?? raw.name ?? "Species"),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? raw.lon ?? 0),
    observedOn: raw.observedOn ? String(raw.observedOn) : raw.observed_on ? String(raw.observed_on) : undefined,
    location: raw.location ? String(raw.location) : undefined,
  }
}

function slimGlobalEventRecord(raw: Record<string, unknown>): GlobalEvent {
  return {
    id: String(raw.id ?? ""),
    type: String(raw.type ?? "event"),
    title: String(raw.title ?? raw.name ?? "Event"),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? raw.lon ?? 0),
    severity: raw.severity ? String(raw.severity) : undefined,
    timestamp: raw.timestamp ? String(raw.timestamp) : undefined,
  }
}

function slimDeviceRecord(raw: Record<string, unknown>): Device {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Device"),
    type: String(raw.type ?? "device"),
    lat: raw.lat != null ? Number(raw.lat) : undefined,
    lng: raw.lng != null ? Number(raw.lng) : raw.lon != null ? Number(raw.lon) : undefined,
    status: String(raw.status ?? "unknown"),
    lastSeen: raw.lastSeen ? String(raw.lastSeen) : raw.last_seen ? String(raw.last_seen) : undefined,
  }
}

// ============================================================================
// Aircraft Data
// ============================================================================

export async function getAircraft(options?: FetchOptions): Promise<Aircraft[]> {
  if (options?.forceRefresh) invalidateCache("aircraft")

  const cacheKey = options?.limit ? `aircraft:limit:${options.limit}` : "aircraft"

  return getCachedData<Aircraft[]>(cacheKey, async () => {
    const baseUrl = getBaseUrl()
    const url = new URL(`${baseUrl}/api/oei/flightradar24`)
    if (options?.limit) url.searchParams.set("limit", String(options.limit))

    const data = await safeFetch<{ aircraft?: Record<string, unknown>[] }>(
      url.toString(),
      { aircraft: [] },
      options?.timeout || 15000,
      options?.signal
    )
    const aircraft = (data.aircraft || []).map((a) => slimAircraftRecord(a))
    return options?.limit ? aircraft.slice(0, options.limit) : aircraft
  })
}

export async function getAircraftPaginated(
  options?: FetchOptions
): Promise<PaginatedResult<Aircraft>> {
  const all = await getAircraft(options)
  const offset = options?.offset || 0
  const limit = options?.limit || 100
  const sliced = all.slice(offset, offset + limit)

  return {
    data: sliced,
    total: all.length,
    limit,
    offset,
    hasMore: offset + limit < all.length,
  }
}

// ============================================================================
// Vessel Data
// ============================================================================

export async function getVessels(options?: FetchOptions): Promise<Vessel[]> {
  if (options?.forceRefresh) invalidateCache("vessels")

  const cacheKey = options?.limit ? `vessels:limit:${options.limit}` : "vessels"

  return getCachedData<Vessel[]>(cacheKey, async () => {
    const baseUrl = getBaseUrl()
    const url = new URL(`${baseUrl}/api/oei/aisstream`)
    if (options?.limit) url.searchParams.set("limit", String(options.limit))

    const data = await safeFetch<{ vessels?: Record<string, unknown>[] }>(
      url.toString(),
      { vessels: [] },
      options?.timeout || 15000,
      options?.signal
    )
    const vessels = (data.vessels || []).map((v) => slimVesselRecord(v))
    return options?.limit ? vessels.slice(0, options.limit) : vessels
  })
}

export async function getVesselsPaginated(
  options?: FetchOptions
): Promise<PaginatedResult<Vessel>> {
  const all = await getVessels(options)
  const offset = options?.offset || 0
  const limit = options?.limit || 100
  const sliced = all.slice(offset, offset + limit)

  return {
    data: sliced,
    total: all.length,
    limit,
    offset,
    hasMore: offset + limit < all.length,
  }
}

// ============================================================================
// Satellite Data
// ============================================================================

const SATELLITE_CATEGORIES = ["weather", "science", "gps-ops", "active"]

function slimSatelliteRecord(raw: Record<string, unknown>): Satellite {
  return {
    id: String(raw.id ?? raw.noradId ?? raw.norad_id ?? ""),
    name: String(raw.name ?? "Unknown"),
    noradId: String(raw.noradId ?? raw.norad_id ?? raw.id ?? ""),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? raw.lon ?? 0),
    altitude: Number(raw.altitude ?? raw.alt ?? 0),
    velocity: Number(raw.velocity ?? raw.speed ?? 0),
    category: raw.category ? String(raw.category) : undefined,
  }
}

function dedupeSatellites(satellites: Satellite[]): Satellite[] {
  const seen = new Set<string>()
  const out: Satellite[] = []
  for (const sat of satellites) {
    const key = sat.noradId || sat.id
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(sat)
  }
  return out
}

export async function getSatellites(options?: FetchOptions): Promise<Satellite[]> {
  if (options?.forceRefresh) invalidateCache("satellites")

  const cacheKey = options?.limit ? `satellites:limit:${options.limit}` : "satellites"

  return getCachedData<Satellite[]>(cacheKey, async () => {
    const baseUrl = getBaseUrl()
    const limit = options?.limit

    if (limit) {
      const data = await safeFetch<{ satellites?: Record<string, unknown>[] }>(
        `${baseUrl}/api/oei/satellites?category=active&mode=registry&limit=${limit}`,
        { satellites: [] },
        options?.timeout || 20000,
        options?.signal
      )
      const raw = data.satellites || []
      return dedupeSatellites(raw.map((s) => slimSatelliteRecord(s))).slice(0, limit)
    }

    const results = await Promise.allSettled(
      SATELLITE_CATEGORIES.map((category) =>
        safeFetch<{ satellites?: Record<string, unknown>[] }>(
          `${baseUrl}/api/oei/satellites?category=${category}`,
          { satellites: [] },
          options?.timeout || 20000,
          options?.signal
        )
      )
    )

    const allSatellites: Satellite[] = []
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.satellites) {
        allSatellites.push(...result.value.satellites.map((s) => slimSatelliteRecord(s)))
      }
    }

    return dedupeSatellites(allSatellites)
  })
}

// ============================================================================
// Space Weather Data
// ============================================================================

export async function getSpaceWeather(options?: FetchOptions): Promise<SpaceWeatherData> {
  if (options?.forceRefresh) invalidateCache("spaceWeather")

  return getCachedData<SpaceWeatherData>("spaceWeather", async () => {
    const baseUrl = getBaseUrl()
    return safeFetch<SpaceWeatherData>(
      `${baseUrl}/api/oei/space-weather`,
      { solarFlares: [], geomagneticStorms: [], solarWind: null, alerts: [] },
      options?.timeout || 15000,
      options?.signal
    )
  })
}

// ============================================================================
// Global Events
// ============================================================================

export async function getGlobalEvents(options?: FetchOptions): Promise<GlobalEvent[]> {
  if (options?.forceRefresh) invalidateCache("globalEvents")

  const cacheKey = options?.limit ? `globalEvents:limit:${options.limit}` : "globalEvents"

  return getCachedData<GlobalEvent[]>(cacheKey, async () => {
    const baseUrl = getBaseUrl()
    const url = new URL(`${baseUrl}/api/natureos/global-events`)
    if (options?.limit) url.searchParams.set("limit", String(options.limit))

    const data = await safeFetch<{ events?: Record<string, unknown>[] }>(
      url.toString(),
      { events: [] },
      options?.timeout || 15000,
      options?.signal
    )
    const events = (data.events || []).map((e) => slimGlobalEventRecord(e))
    return options?.limit ? events.slice(0, options.limit) : events
  })
}

// ============================================================================
// Fungal Observations
// ============================================================================

export async function getFungalObservations(options?: FetchOptions): Promise<FungalObservation[]> {
  if (options?.forceRefresh) invalidateCache("fungalObservations")

  const cacheKey = options?.limit ? `fungalObservations:limit:${options.limit}` : "fungalObservations"

  return getCachedData<FungalObservation[]>(cacheKey, async () => {
    const baseUrl = getBaseUrl()
    const url = new URL(`${baseUrl}/api/crep/fungal`)
    if (options?.limit) url.searchParams.set("limit", String(options.limit))

    const data = await safeFetch<{ observations?: Record<string, unknown>[] }>(
      url.toString(),
      { observations: [] },
      options?.timeout || 20000,
      options?.signal
    )
    const observations = (data.observations || []).map((o) => slimFungalRecord(o))
    return options?.limit ? observations.slice(0, options.limit) : observations
  })
}

// ============================================================================
// MycoBrain Devices
// ============================================================================

export async function getDevices(options?: FetchOptions): Promise<Device[]> {
  if (options?.forceRefresh) invalidateCache("devices")

  return getCachedData<Device[]>("devices", async () => {
    const baseUrl = getBaseUrl()
    const data = await safeFetch<{ devices?: Record<string, unknown>[] }>(
      `${baseUrl}/api/mycobrain/devices`,
      { devices: [] },
      options?.timeout || 10000,
      options?.signal
    )
    return (data.devices || []).map((d) => slimDeviceRecord(d))
  })
}

// ============================================================================
// Aggregated Data
// ============================================================================

export async function getDataSummary(
  signal?: AbortSignal,
  limits: UnifiedLimits = UNIFIED_DEFAULT_LIMITS
): Promise<CREPDataSummary> {
  const opts: FetchOptions = {
    signal,
    limit: limits.aircraft,
  }
  const [aircraft, vessels, satellites, fungalObservations, globalEvents, devices] =
    await Promise.all([
      getAircraft({ ...opts, limit: limits.aircraft }).catch(() => []),
      getVessels({ signal, limit: limits.vessels }).catch(() => []),
      getSatellites({ signal, limit: limits.satellites }).catch(() => []),
      getFungalObservations({ signal, limit: limits.fungal }).catch(() => []),
      getGlobalEvents({ signal, limit: limits.events }).catch(() => []),
      getDevices({ signal }).catch(() => []),
    ])

  return {
    aircraft: aircraft.length,
    vessels: vessels.length,
    satellites: satellites.length,
    fungalObservations: fungalObservations.length,
    globalEvents: globalEvents.length,
    devices: devices.length,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Fetch all data sources with progressive loading callback.
 * Supports abort signal for cleanup on component unmount.
 */
export async function fetchAllData(
  onDataReady?: (type: string, data: unknown[]) => void,
  signal?: AbortSignal,
  limits: UnifiedLimits = UNIFIED_DEFAULT_LIMITS
): Promise<{
  aircraft: Aircraft[]
  vessels: Vessel[]
  satellites: Satellite[]
  fungalObservations: FungalObservation[]
  globalEvents: GlobalEvent[]
  devices: Device[]
}> {
  const opts: FetchOptions = { signal }
  const results = {
    aircraft: [] as Aircraft[],
    vessels: [] as Vessel[],
    satellites: [] as Satellite[],
    fungalObservations: [] as FungalObservation[],
    globalEvents: [] as GlobalEvent[],
    devices: [] as Device[],
  }

  const fetchers = [
    async () => {
      results.aircraft = await getAircraft({ ...opts, limit: limits.aircraft })
      onDataReady?.("aircraft", results.aircraft)
    },
    async () => {
      results.vessels = await getVessels({ ...opts, limit: limits.vessels })
      onDataReady?.("vessels", results.vessels)
    },
    async () => {
      results.satellites = await getSatellites({ ...opts, limit: limits.satellites })
      onDataReady?.("satellites", results.satellites)
    },
    async () => {
      results.fungalObservations = await getFungalObservations({ ...opts, limit: limits.fungal })
      onDataReady?.("fungalObservations", results.fungalObservations)
    },
    async () => {
      results.globalEvents = await getGlobalEvents({ ...opts, limit: limits.events })
      onDataReady?.("globalEvents", results.globalEvents)
    },
    async () => {
      results.devices = await getDevices(opts)
      onDataReady?.("devices", results.devices)
    },
  ]

  await Promise.allSettled(fetchers.map((f) => f()))

  return results
}

export function getServiceStats() {
  return {
    cache: getCacheStats(),
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// MINDEX Earth Intelligence — Spatial Queries (bbox)
// ============================================================================

export interface EarthBboxOptions extends FetchOptions {
  north: number
  south: number
  east: number
  west: number
  layers?: string[]
}

export interface WeatherAlert {
  id: string
  type: string
  title: string
  severity: string
  lat: number
  lng: number
  timestamp: string
}

export interface EmissionSource {
  id: string
  type: string
  name: string
  lat: number
  lng: number
  value?: number
  unit?: string
}

export interface InfrastructureItem {
  id: string
  type: string
  name: string
  lat: number
  lng: number
  status?: string
}

export interface SpaceWeatherEvent {
  id: string
  type: string
  title: string
  severity: string
  timestamp: string
}

/**
 * Fetch all earth data within a bounding box from MINDEX.
 * Uses the new /api/earth/map/bbox endpoint for spatial queries.
 * Falls back to individual OEI endpoints if MINDEX is unreachable.
 */
export async function getEarthDataByBbox(options: EarthBboxOptions): Promise<{
  aircraft: Aircraft[]
  vessels: Vessel[]
  satellites: Satellite[]
  globalEvents: GlobalEvent[]
  fungalObservations: FungalObservation[]
  devices: Device[]
  weather: WeatherAlert[]
  emissions: EmissionSource[]
  infrastructure: InfrastructureItem[]
  spaceWeather: SpaceWeatherEvent[]
}> {
  const emptyResult = {
    aircraft: [] as Aircraft[],
    vessels: [] as Vessel[],
    satellites: [] as Satellite[],
    globalEvents: [] as GlobalEvent[],
    fungalObservations: [] as FungalObservation[],
    devices: [] as Device[],
    weather: [] as WeatherAlert[],
    emissions: [] as EmissionSource[],
    infrastructure: [] as InfrastructureItem[],
    spaceWeather: [] as SpaceWeatherEvent[],
  }

  // Try MINDEX spatial endpoint — one layer per request (API requires layer=)
  const perLayerLimit = options.limit
    ? Math.max(50, Math.ceil(options.limit / 4))
    : 500

  const layerMap: Array<{ key: keyof typeof emptyResult; layer: string; field: string }> = [
    { key: "aircraft", layer: "aircraft", field: "aircraft" },
    { key: "vessels", layer: "vessels", field: "vessels" },
    { key: "satellites", layer: "satellites", field: "satellites" },
    { key: "fungalObservations", layer: "species", field: "fungalObservations" },
    { key: "globalEvents", layer: "earthquakes", field: "globalEvents" },
    { key: "devices", layer: "facilities", field: "devices" },
  ]

  try {
    const baseParams = new URLSearchParams({
      lat_min: String(options.south),
      lat_max: String(options.north),
      lng_min: String(options.west),
      lng_max: String(options.east),
      limit: String(perLayerLimit),
    })

    const layerResults = await Promise.allSettled(
      layerMap.map(async ({ layer }) => {
        const params = new URLSearchParams(baseParams)
        params.set("layer", layer)
        const mindexUrl = `${API_URLS.MINDEX}/api/earth/map/bbox?${params}`
        return safeFetch<{ entities?: Record<string, unknown>[] }>(
          mindexUrl,
          { entities: [] },
          options.timeout || 8000,
          options.signal
        )
      })
    )

    const merged = { ...emptyResult }
    let anyData = false

    for (let i = 0; i < layerMap.length; i++) {
      const result = layerResults[i]
      const { key } = layerMap[i]
      if (result.status !== "fulfilled" || !result.value.entities?.length) continue
      anyData = true
      const entities = result.value.entities
      if (key === "aircraft") {
        merged.aircraft = entities.map((e) => ({
          id: String(e.id ?? ""),
          callsign: String((e.properties as Record<string, unknown>)?.callsign ?? e.name ?? ""),
          lat: Number(e.lat ?? 0),
          lng: Number(e.lng ?? 0),
          altitude: Number((e.properties as Record<string, unknown>)?.altitude ?? 0),
          speed: Number((e.properties as Record<string, unknown>)?.speed ?? 0),
          heading: Number((e.properties as Record<string, unknown>)?.heading ?? 0),
        }))
      } else if (key === "vessels") {
        merged.vessels = entities.map((e) => ({
          id: String(e.id ?? ""),
          mmsi: String((e.properties as Record<string, unknown>)?.mmsi ?? e.id ?? ""),
          name: String(e.name ?? "Vessel"),
          lat: Number(e.lat ?? 0),
          lng: Number(e.lng ?? 0),
          heading: Number((e.properties as Record<string, unknown>)?.heading ?? 0),
          speed: Number((e.properties as Record<string, unknown>)?.speed ?? 0),
        }))
      } else if (key === "satellites") {
        merged.satellites = entities.map((e) =>
          slimSatelliteRecord({
            id: e.id,
            name: e.name,
            lat: e.lat,
            lng: e.lng,
            altitude: (e.properties as Record<string, unknown>)?.altitude,
          })
        )
      } else if (key === "fungalObservations") {
        merged.fungalObservations = entities.map((e) => ({
          id: String(e.id ?? ""),
          species: String(e.name ?? "Species"),
          lat: Number(e.lat ?? 0),
          lng: Number(e.lng ?? 0),
          observedOn: String(e.occurred_at ?? ""),
        }))
      } else if (key === "globalEvents") {
        merged.globalEvents = entities.map((e) => ({
          id: String(e.id ?? ""),
          type: String(e.entity_type ?? "event"),
          title: String(e.name ?? "Event"),
          lat: Number(e.lat ?? 0),
          lng: Number(e.lng ?? 0),
          timestamp: String(e.occurred_at ?? ""),
        }))
      } else if (key === "devices") {
        merged.devices = entities.map((e) => ({
          id: String(e.id ?? ""),
          name: String(e.name ?? "Device"),
          type: String(e.entity_type ?? "facility"),
          lat: Number(e.lat ?? 0),
          lng: Number(e.lng ?? 0),
          status: "online",
        }))
      }
    }

    if (anyData) {
      return merged
    }
  } catch {
    console.warn("[CREP Service] MINDEX earth/map/bbox unavailable, falling back to OEI")
  }

  // Fallback: use existing OEI-based fetchers with limits
  const perLimit = options.limit || UNIFIED_DEFAULT_LIMITS.aircraft
  const opts: FetchOptions = {
    signal: options.signal,
    limit: perLimit,
  }
  const [aircraft, vessels, satellites, fungalObservations, globalEvents, devices] =
    await Promise.all([
      getAircraft({ ...opts, limit: UNIFIED_DEFAULT_LIMITS.aircraft }).catch(() => []),
      getVessels({ ...opts, limit: UNIFIED_DEFAULT_LIMITS.vessels }).catch(() => []),
      getSatellites({ ...opts, limit: UNIFIED_DEFAULT_LIMITS.satellites }).catch(() => []),
      getFungalObservations({ ...opts, limit: UNIFIED_DEFAULT_LIMITS.fungal }).catch(() => []),
      getGlobalEvents({ ...opts, limit: UNIFIED_DEFAULT_LIMITS.events }).catch(() => []),
      getDevices(opts).catch(() => []),
    ])

  return {
    ...emptyResult,
    aircraft,
    vessels,
    satellites,
    fungalObservations,
    globalEvents,
    devices,
  }
}

/**
 * Get MINDEX earth domain statistics.
 */
export async function getEarthStats(signal?: AbortSignal): Promise<Record<string, number>> {
  try {
    const data = await safeFetch<Record<string, number>>(
      `${API_URLS.MINDEX}/api/earth/stats`,
      {},
      5000,
      signal
    )
    return data
  } catch {
    // Fallback: build stats from existing data
    const summary = await getDataSummary(signal)
    return {
      aircraft: summary.aircraft,
      vessels: summary.vessels,
      satellites: summary.satellites,
      fungalObservations: summary.fungalObservations,
      globalEvents: summary.globalEvents,
      devices: summary.devices,
    }
  }
}

/**
 * Fetch all data including new earth domains with progressive loading.
 */
export async function fetchAllEarthData(
  onDataReady?: (type: string, data: unknown[]) => void,
  signal?: AbortSignal,
  limits: UnifiedLimits = UNIFIED_DEFAULT_LIMITS
): Promise<{
  aircraft: Aircraft[]
  vessels: Vessel[]
  satellites: Satellite[]
  fungalObservations: FungalObservation[]
  globalEvents: GlobalEvent[]
  devices: Device[]
  weather: WeatherAlert[]
  emissions: EmissionSource[]
  infrastructure: InfrastructureItem[]
  spaceWeather: SpaceWeatherEvent[]
}> {
  const base = await fetchAllData(onDataReady, signal, limits)
  return {
    ...base,
    weather: [],
    emissions: [],
    infrastructure: [],
    spaceWeather: [],
  }
}
