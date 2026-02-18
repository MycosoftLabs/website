/**
 * CREP Data Service
 * 
 * Unified service for all CREP data fetching with:
 * - Centralized caching
 * - Rate limiting
 * - Error handling
 * - Background refresh
 * 
 * This prevents the dev server from being overwhelmed by
 * managing all external API calls through a single service.
 */

import { getCachedData, getCacheStats, invalidateCache } from "./data-cache"

// Data types
export interface CREPDataSummary {
  aircraft: number
  vessels: number
  satellites: number
  fungalObservations: number
  globalEvents: number
  devices: number
  lastUpdated: string
}

interface FetchOptions {
  forceRefresh?: boolean
  timeout?: number
}

// Base URL for internal API calls
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return ""
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
}

/**
 * Fetch with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

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

/**
 * Safe JSON fetch with error handling
 */
async function safeFetch<T>(
  url: string,
  defaultValue: T,
  timeoutMs: number = 10000
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, {}, timeoutMs)
    if (!response.ok) {
      console.warn(`[CREP Service] ${url} returned ${response.status}`)
      return defaultValue
    }
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[CREP Service] ${url} timed out`)
    } else {
      console.warn(`[CREP Service] ${url} failed:`, error)
    }
    return defaultValue
  }
}

// ============================================================================
// Aircraft Data
// ============================================================================

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

export async function getAircraft(options?: FetchOptions): Promise<Aircraft[]> {
  if (options?.forceRefresh) {
    invalidateCache("aircraft")
  }

  return getCachedData<Aircraft[]>(
    "aircraft",
    async () => {
      const baseUrl = getBaseUrl()
      const data = await safeFetch<{ aircraft?: Aircraft[] }>(
        `${baseUrl}/api/oei/flightradar24`,
        { aircraft: [] },
        options?.timeout || 15000
      )
      return data.aircraft || []
    }
  )
}

// ============================================================================
// Vessel Data
// ============================================================================

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

export async function getVessels(options?: FetchOptions): Promise<Vessel[]> {
  if (options?.forceRefresh) {
    invalidateCache("vessels")
  }

  return getCachedData<Vessel[]>(
    "vessels",
    async () => {
      const baseUrl = getBaseUrl()
      const data = await safeFetch<{ vessels?: Vessel[] }>(
        `${baseUrl}/api/oei/aisstream`,
        { vessels: [] },
        options?.timeout || 15000
      )
      return data.vessels || []
    }
  )
}

// ============================================================================
// Satellite Data
// ============================================================================

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

const SATELLITE_CATEGORIES = ["weather", "science", "gps-ops", "active"]

export async function getSatellites(options?: FetchOptions): Promise<Satellite[]> {
  if (options?.forceRefresh) {
    invalidateCache("satellites")
  }

  return getCachedData<Satellite[]>(
    "satellites",
    async () => {
      const baseUrl = getBaseUrl()
      const allSatellites: Satellite[] = []

      // Fetch categories sequentially to avoid overwhelming external APIs
      for (const category of SATELLITE_CATEGORIES) {
        try {
          const data = await safeFetch<{ satellites?: Satellite[] }>(
            `${baseUrl}/api/oei/satellites?category=${category}`,
            { satellites: [] },
            options?.timeout || 20000
          )
          if (data.satellites) {
            allSatellites.push(...data.satellites)
          }
        } catch (error) {
          console.warn(`[CREP Service] Satellite category ${category} failed`)
        }
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return allSatellites
    }
  )
}

// ============================================================================
// Space Weather Data
// ============================================================================

export interface SpaceWeatherData {
  solarFlares: unknown[]
  geomagneticStorms: unknown[]
  solarWind: unknown
  alerts: unknown[]
}

export async function getSpaceWeather(options?: FetchOptions): Promise<SpaceWeatherData> {
  if (options?.forceRefresh) {
    invalidateCache("spaceWeather")
  }

  return getCachedData<SpaceWeatherData>(
    "spaceWeather",
    async () => {
      const baseUrl = getBaseUrl()
      return safeFetch<SpaceWeatherData>(
        `${baseUrl}/api/oei/space-weather`,
        { solarFlares: [], geomagneticStorms: [], solarWind: null, alerts: [] },
        options?.timeout || 15000
      )
    }
  )
}

// ============================================================================
// Global Events
// ============================================================================

export interface GlobalEvent {
  id: string
  type: string
  title: string
  lat: number
  lng: number
  severity?: string
  timestamp?: string
}

export async function getGlobalEvents(options?: FetchOptions): Promise<GlobalEvent[]> {
  if (options?.forceRefresh) {
    invalidateCache("globalEvents")
  }

  return getCachedData<GlobalEvent[]>(
    "globalEvents",
    async () => {
      const baseUrl = getBaseUrl()
      const data = await safeFetch<{ events?: GlobalEvent[] }>(
        `${baseUrl}/api/natureos/global-events`,
        { events: [] },
        options?.timeout || 15000
      )
      return data.events || []
    }
  )
}

// ============================================================================
// Fungal Observations
// ============================================================================

export interface FungalObservation {
  id: string
  species: string
  lat: number
  lng: number
  observedOn?: string
  location?: string
}

export async function getFungalObservations(options?: FetchOptions): Promise<FungalObservation[]> {
  if (options?.forceRefresh) {
    invalidateCache("fungalObservations")
  }

  return getCachedData<FungalObservation[]>(
    "fungalObservations",
    async () => {
      const baseUrl = getBaseUrl()
      const data = await safeFetch<{ observations?: FungalObservation[] }>(
        `${baseUrl}/api/crep/fungal`,
        { observations: [] },
        options?.timeout || 20000
      )
      return data.observations || []
    }
  )
}

// ============================================================================
// MycoBrain Devices
// ============================================================================

export interface Device {
  id: string
  name: string
  type: string
  lat?: number
  lng?: number
  status: string
  lastSeen?: string
}

export async function getDevices(options?: FetchOptions): Promise<Device[]> {
  if (options?.forceRefresh) {
    invalidateCache("devices")
  }

  return getCachedData<Device[]>(
    "devices",
    async () => {
      const baseUrl = getBaseUrl()
      const data = await safeFetch<{ devices?: Device[] }>(
        `${baseUrl}/api/mycobrain/devices`,
        { devices: [] },
        options?.timeout || 10000
      )
      return data.devices || []
    }
  )
}

// ============================================================================
// Aggregated Data
// ============================================================================

/**
 * Get summary of all CREP data counts
 */
export async function getDataSummary(): Promise<CREPDataSummary> {
  const [aircraft, vessels, satellites, fungalObservations, globalEvents, devices] = 
    await Promise.all([
      getAircraft().catch(() => []),
      getVessels().catch(() => []),
      getSatellites().catch(() => []),
      getFungalObservations().catch(() => []),
      getGlobalEvents().catch(() => []),
      getDevices().catch(() => []),
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
 * Fetch all data sources (for initial load)
 * Returns data as it becomes available via the callback
 */
export async function fetchAllData(
  onDataReady?: (type: string, data: unknown[]) => void
): Promise<{
  aircraft: Aircraft[]
  vessels: Vessel[]
  satellites: Satellite[]
  fungalObservations: FungalObservation[]
  globalEvents: GlobalEvent[]
  devices: Device[]
}> {
  const results = {
    aircraft: [] as Aircraft[],
    vessels: [] as Vessel[],
    satellites: [] as Satellite[],
    fungalObservations: [] as FungalObservation[],
    globalEvents: [] as GlobalEvent[],
    devices: [] as Device[],
  }

  // Fetch in parallel but with controlled concurrency
  const fetchers = [
    async () => {
      results.aircraft = await getAircraft()
      onDataReady?.("aircraft", results.aircraft)
    },
    async () => {
      results.vessels = await getVessels()
      onDataReady?.("vessels", results.vessels)
    },
    async () => {
      results.satellites = await getSatellites()
      onDataReady?.("satellites", results.satellites)
    },
    async () => {
      results.fungalObservations = await getFungalObservations()
      onDataReady?.("fungalObservations", results.fungalObservations)
    },
    async () => {
      results.globalEvents = await getGlobalEvents()
      onDataReady?.("globalEvents", results.globalEvents)
    },
    async () => {
      results.devices = await getDevices()
      onDataReady?.("devices", results.devices)
    },
  ]

  await Promise.allSettled(fetchers.map(f => f()))

  return results
}

/**
 * Get cache statistics
 */
export function getServiceStats() {
  return {
    cache: getCacheStats(),
    timestamp: new Date().toISOString(),
  }
}
