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

// ============================================================================
// Aircraft Data
// ============================================================================

export async function getAircraft(options?: FetchOptions): Promise<Aircraft[]> {
  if (options?.forceRefresh) invalidateCache("aircraft")

  return getCachedData<Aircraft[]>("aircraft", async () => {
    const baseUrl = getBaseUrl()
    const url = new URL(`${baseUrl}/api/oei/flightradar24`)
    if (options?.limit) url.searchParams.set("limit", String(options.limit))

    const data = await safeFetch<{ aircraft?: Aircraft[] }>(
      url.toString(),
      { aircraft: [] },
      options?.timeout || 15000,
      options?.signal
    )
    return data.aircraft || []
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

  return getCachedData<Vessel[]>("vessels", async () => {
    const baseUrl = getBaseUrl()
    const data = await safeFetch<{ vessels?: Vessel[] }>(
      `${baseUrl}/api/oei/aisstream`,
      { vessels: [] },
      options?.timeout || 15000,
      options?.signal
    )
    return data.vessels || []
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

export async function getSatellites(options?: FetchOptions): Promise<Satellite[]> {
  if (options?.forceRefresh) invalidateCache("satellites")

  return getCachedData<Satellite[]>("satellites", async () => {
    const baseUrl = getBaseUrl()
    const allSatellites: Satellite[] = []

    // Fetch categories in parallel for faster load
    const results = await Promise.allSettled(
      SATELLITE_CATEGORIES.map((category) =>
        safeFetch<{ satellites?: Satellite[] }>(
          `${baseUrl}/api/oei/satellites?category=${category}`,
          { satellites: [] },
          options?.timeout || 20000,
          options?.signal
        )
      )
    )

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.satellites) {
        allSatellites.push(...result.value.satellites)
      }
    }

    return allSatellites
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

  return getCachedData<GlobalEvent[]>("globalEvents", async () => {
    const baseUrl = getBaseUrl()
    const data = await safeFetch<{ events?: GlobalEvent[] }>(
      `${baseUrl}/api/natureos/global-events`,
      { events: [] },
      options?.timeout || 15000,
      options?.signal
    )
    return data.events || []
  })
}

// ============================================================================
// Fungal Observations
// ============================================================================

export async function getFungalObservations(options?: FetchOptions): Promise<FungalObservation[]> {
  if (options?.forceRefresh) invalidateCache("fungalObservations")

  return getCachedData<FungalObservation[]>("fungalObservations", async () => {
    const baseUrl = getBaseUrl()
    const url = new URL(`${baseUrl}/api/crep/fungal`)
    if (options?.limit) url.searchParams.set("limit", String(options.limit))

    const data = await safeFetch<{ observations?: FungalObservation[] }>(
      url.toString(),
      { observations: [] },
      options?.timeout || 20000,
      options?.signal
    )
    return data.observations || []
  })
}

// ============================================================================
// MycoBrain Devices
// ============================================================================

export async function getDevices(options?: FetchOptions): Promise<Device[]> {
  if (options?.forceRefresh) invalidateCache("devices")

  return getCachedData<Device[]>("devices", async () => {
    const baseUrl = getBaseUrl()
    const data = await safeFetch<{ devices?: Device[] }>(
      `${baseUrl}/api/mycobrain/devices`,
      { devices: [] },
      options?.timeout || 10000,
      options?.signal
    )
    return data.devices || []
  })
}

// ============================================================================
// Aggregated Data
// ============================================================================

export async function getDataSummary(signal?: AbortSignal): Promise<CREPDataSummary> {
  const opts: FetchOptions = { signal }
  const [aircraft, vessels, satellites, fungalObservations, globalEvents, devices] =
    await Promise.all([
      getAircraft(opts).catch(() => []),
      getVessels(opts).catch(() => []),
      getSatellites(opts).catch(() => []),
      getFungalObservations(opts).catch(() => []),
      getGlobalEvents(opts).catch(() => []),
      getDevices(opts).catch(() => []),
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
  signal?: AbortSignal
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
      results.aircraft = await getAircraft(opts)
      onDataReady?.("aircraft", results.aircraft)
    },
    async () => {
      results.vessels = await getVessels(opts)
      onDataReady?.("vessels", results.vessels)
    },
    async () => {
      results.satellites = await getSatellites(opts)
      onDataReady?.("satellites", results.satellites)
    },
    async () => {
      results.fungalObservations = await getFungalObservations(opts)
      onDataReady?.("fungalObservations", results.fungalObservations)
    },
    async () => {
      results.globalEvents = await getGlobalEvents(opts)
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

  // Try MINDEX spatial endpoint first
  try {
    const params = new URLSearchParams({
      north: String(options.north),
      south: String(options.south),
      east: String(options.east),
      west: String(options.west),
    })
    if (options.layers?.length) {
      params.set("layers", options.layers.join(","))
    }
    if (options.limit) {
      params.set("limit", String(options.limit))
    }

    const mindexUrl = `${API_URLS.MINDEX}/api/earth/map/bbox?${params}`
    const data = await safeFetch<Record<string, unknown[]>>(
      mindexUrl,
      {},
      options.timeout || 8000,
      options.signal
    )

    if (data && Object.keys(data).length > 0) {
      return {
        aircraft: (data.aircraft as Aircraft[]) || [],
        vessels: (data.vessels as Vessel[]) || [],
        satellites: (data.satellites as Satellite[]) || [],
        globalEvents: (data.events as GlobalEvent[]) || (data.globalEvents as GlobalEvent[]) || [],
        fungalObservations: (data.observations as FungalObservation[]) || (data.fungalObservations as FungalObservation[]) || [],
        devices: (data.devices as Device[]) || [],
        weather: (data.weather as WeatherAlert[]) || [],
        emissions: (data.emissions as EmissionSource[]) || [],
        infrastructure: (data.infrastructure as InfrastructureItem[]) || [],
        spaceWeather: (data.space_weather as SpaceWeatherEvent[]) || (data.spaceWeather as SpaceWeatherEvent[]) || [],
      }
    }
  } catch {
    console.warn("[CREP Service] MINDEX earth/map/bbox unavailable, falling back to OEI")
  }

  // Fallback: use existing OEI-based fetchers
  const opts: FetchOptions = { signal: options.signal }
  const [aircraft, vessels, satellites, fungalObservations, globalEvents, devices] =
    await Promise.all([
      getAircraft(opts).catch(() => []),
      getVessels(opts).catch(() => []),
      getSatellites(opts).catch(() => []),
      getFungalObservations(opts).catch(() => []),
      getGlobalEvents(opts).catch(() => []),
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
  signal?: AbortSignal
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
  // Try MINDEX full earth sync first
  try {
    const data = await safeFetch<Record<string, unknown[]>>(
      `${API_URLS.MINDEX}/api/earth/crep/sync`,
      {},
      12000,
      signal
    )
    if (data && Object.keys(data).length > 0) {
      const result = {
        aircraft: (data.aircraft as Aircraft[]) || [],
        vessels: (data.vessels as Vessel[]) || [],
        satellites: (data.satellites as Satellite[]) || [],
        fungalObservations: (data.observations as FungalObservation[]) || [],
        globalEvents: (data.events as GlobalEvent[]) || [],
        devices: (data.devices as Device[]) || [],
        weather: (data.weather as WeatherAlert[]) || [],
        emissions: (data.emissions as EmissionSource[]) || [],
        infrastructure: (data.infrastructure as InfrastructureItem[]) || [],
        spaceWeather: (data.space_weather as SpaceWeatherEvent[]) || [],
      }
      // Fire progressive callbacks
      for (const [key, val] of Object.entries(result)) {
        if (Array.isArray(val) && val.length > 0) {
          onDataReady?.(key, val)
        }
      }
      return result
    }
  } catch {
    // Fall through to individual fetchers
  }

  // Fallback: use existing fetchAllData + empty new domains
  const base = await fetchAllData(onDataReady, signal)
  return {
    ...base,
    weather: [],
    emissions: [],
    infrastructure: [],
    spaceWeather: [],
  }
}
