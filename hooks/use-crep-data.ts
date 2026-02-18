/**
 * CREP Data Hook
 * 
 * Custom hook for fetching and managing CREP data with:
 * - Single unified API call instead of 13+ separate calls
 * - Automatic caching (data persists across re-renders)
 * - Stale-while-revalidate pattern
 * - Background refresh without blocking UI
 * - Error handling with graceful degradation
 * 
 * This dramatically reduces load on the dev server by:
 * 1. Using a single cached endpoint
 * 2. Rate-limiting refresh attempts
 * 3. Returning cached data immediately while refreshing in background
 */

import { useState, useEffect, useCallback, useRef } from "react"

// Data interfaces
export interface CREPDataState {
  globalEvents: GlobalEvent[]
  devices: Device[]
  aircraft: Aircraft[]
  vessels: Vessel[]
  satellites: Satellite[]
  fungalObservations: FungalObservation[]
  spaceWeather: SpaceWeatherData | null
  elephants: Elephant[]
  fenceSegments: FenceSegment[]
  presenceReadings: PresenceReading[]
}

export interface GlobalEvent {
  id: string
  type: string
  title: string
  description?: string
  severity?: string
  lat: number
  lng: number
  timestamp?: string
  link?: string
  source?: string
  sourceUrl?: string
  magnitude?: number
  locationName?: string
  depth?: number
  windSpeed?: number
  containment?: number
  affectedArea?: number
  affectedPopulation?: number
}

export interface Device {
  id: string
  name: string
  lat: number
  lng: number
  status: "online" | "offline"
  type?: string
  port?: string
  firmware?: string
  protocol?: string
  sensorData?: {
    temperature?: number
    humidity?: number
    pressure?: number
    gasResistance?: number
    iaq?: number
    iaqAccuracy?: number
    co2Equivalent?: number
    vocEquivalent?: number
    uptime?: number
  }
  lastUpdate?: string
}

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
  airline?: string
  registration?: string
  model?: string
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
  flag?: string
  imo?: string
  callsign?: string
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
  inclination?: number
  period?: number
  apogee?: number
  perigee?: number
}

export interface FungalObservation {
  id: string
  observed_on?: string
  latitude: number
  longitude: number
  species: string
  taxon_id?: number
  taxon?: {
    id: number
    name: string
    preferred_common_name?: string
    rank?: string
  }
  photos?: { id: number; url: string; license?: string }[]
  quality_grade?: string
  user?: string
  source?: string
  location?: string
  habitat?: string
  notes?: string
  sourceUrl?: string
  externalId?: string
}

export interface SpaceWeatherData {
  scales?: {
    radio?: { current: number }
    solar?: { current: number }
    geomagnetic?: { current: number }
  }
  solarFlares?: unknown[]
  geomagneticStorms?: unknown[]
  solarWind?: unknown
  alerts?: unknown[]
}

export interface Elephant {
  id: string
  name: string
  lat: number
  lng: number
  age?: number
  status?: string
}

export interface FenceSegment {
  id: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  status?: string
}

export interface PresenceReading {
  monitorId: string
  monitorName: string
  zone: string
  lat: number
  lng: number
  presenceDetected: boolean
  lastMovement: string
  motionIntensity: number
  smellDetected?: boolean
}

// Hook options
export interface UseCREPDataOptions {
  refreshInterval?: number // Auto-refresh interval in ms (0 = disabled)
  initialFetch?: boolean // Fetch on mount
  enabledDataTypes?: string[] // Which data types to fetch (empty = all)
}

// Module-level cache to persist across component re-mounts
let globalCache: CREPDataState | null = null
let lastFetchTime = 0
const MIN_REFETCH_INTERVAL = 30000 // Minimum 30 seconds between full refetches

const DEFAULT_STATE: CREPDataState = {
  globalEvents: [],
  devices: [],
  aircraft: [],
  vessels: [],
  satellites: [],
  fungalObservations: [],
  spaceWeather: null,
  elephants: [],
  fenceSegments: [],
  presenceReadings: [],
}

export function useCREPData(options: UseCREPDataOptions = {}) {
  const {
    refreshInterval = 60000, // Default: refresh every 60 seconds
    initialFetch = true,
  } = options

  // Initialize from global cache if available
  const [data, setData] = useState<CREPDataState>(globalCache || DEFAULT_STATE)
  const [isLoading, setIsLoading] = useState(!globalCache)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  const isMounted = useRef(true)
  const fetchInProgress = useRef(false)

  // Fetch data from unified endpoint
  const fetchData = useCallback(async (force = false) => {
    // Skip if already fetching
    if (fetchInProgress.current) {
      console.log("[useCREPData] Fetch already in progress, skipping")
      return
    }

    // Check minimum refetch interval (unless forcing)
    const now = Date.now()
    if (!force && lastFetchTime && now - lastFetchTime < MIN_REFETCH_INTERVAL) {
      console.log("[useCREPData] Too soon to refetch, using cache")
      return
    }

    fetchInProgress.current = true
    setIsLoading(true)
    setError(null)

    try {
      console.log("[useCREPData] Fetching from unified CREP API...")
      const response = await fetch("/api/crep/unified", {
        cache: "no-store", // Don't use browser cache, we have our own
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || "Unknown error")
      }

      // Transform unified data to component state format
      const newData: CREPDataState = {
        globalEvents: transformGlobalEvents(result.data.globalEvents || []),
        devices: transformDevices(result.data.devices || []),
        aircraft: result.data.aircraft || [],
        vessels: result.data.vessels || [],
        satellites: result.data.satellites || [],
        fungalObservations: transformFungalObservations(result.data.fungalObservations || []),
        spaceWeather: null, // Fetched separately if needed
        elephants: [],
        fenceSegments: [],
        presenceReadings: [],
      }

      // Update global cache
      globalCache = newData
      lastFetchTime = now

      if (isMounted.current) {
        setData(newData)
        setLastUpdated(result.timestamp)
        console.log(`[useCREPData] Loaded data - Aircraft: ${newData.aircraft.length}, Vessels: ${newData.vessels.length}, Satellites: ${newData.satellites.length}`)
      }

      // Fetch additional data sources that aren't in unified endpoint
      await fetchAdditionalData(newData)

    } catch (err) {
      console.error("[useCREPData] Fetch error:", err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      }
    } finally {
      fetchInProgress.current = false
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Fetch additional data not in unified endpoint
  const fetchAdditionalData = async (currentData: CREPDataState) => {
    try {
      // Fetch elephant conservation demo (separate because it has unique structure)
      const conservationRes = await fetch("/api/crep/demo/elephant-conservation")
      if (conservationRes.ok) {
        const conservationData = await conservationRes.json()
        if (conservationData.ok && isMounted.current) {
          setData(prev => ({
            ...prev,
            elephants: conservationData.elephants || [],
            fenceSegments: conservationData.fenceSegments || [],
            presenceReadings: transformPresenceReadings(conservationData.environmentMonitors || []),
          }))
        }
      }

      // Fetch space weather scales
      const spaceWxRes = await fetch("/api/oei/space-weather")
      if (spaceWxRes.ok) {
        const spaceWxData = await spaceWxRes.json()
        if (isMounted.current) {
          setData(prev => ({
            ...prev,
            spaceWeather: spaceWxData,
          }))
        }
      }
    } catch (e) {
      console.warn("[useCREPData] Additional data fetch failed:", e)
    }
  }

  // Transform functions
  function transformGlobalEvents(events: any[]): GlobalEvent[] {
    return events
      .filter((e: any) => e.location?.latitude && e.location?.longitude)
      .map((e: any) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        severity: e.severity,
        lat: e.location.latitude,
        lng: e.location.longitude,
        timestamp: e.timestamp,
        link: e.link,
        source: e.source,
        sourceUrl: e.sourceUrl,
        magnitude: e.magnitude,
        locationName: e.location?.name,
        depth: e.location?.depth,
        windSpeed: e.type === "storm" ? e.magnitude : undefined,
        containment: e.description?.match(/Containment: (\d+)%/)?.[1] 
          ? parseInt(e.description.match(/Containment: (\d+)%/)[1]) 
          : undefined,
        affectedArea: e.affected?.area_km2,
        affectedPopulation: e.affected?.population,
      }))
  }

  function transformDevices(devices: any[]): Device[] {
    const SAN_DIEGO_91910 = { lat: 32.6189, lng: -117.0769 }
    
    return devices.map((d: any, index: number) => {
      const hasValidLocation = d.location?.lat && d.location?.lng && 
        Math.abs(d.location.lat) > 0.1 && Math.abs(d.location.lng) > 0.1 &&
        !(Math.abs(d.location.lat - 49) < 1 && Math.abs(d.location.lng + 123) < 1)
      
      return {
        id: d.device_id || d.id || `device-${index}`,
        name: d.info?.board || d.name || `MycoBrain Device ${index + 1}`,
        lat: hasValidLocation ? d.location.lat : SAN_DIEGO_91910.lat,
        lng: hasValidLocation ? d.location.lng : SAN_DIEGO_91910.lng,
        status: d.connected ? "online" : "offline",
        port: d.port,
        firmware: d.sensor_data?.firmware_version || d.info?.firmware,
        protocol: d.protocol || "MDP",
        sensorData: d.sensor_data ? {
          temperature: d.sensor_data.temperature,
          humidity: d.sensor_data.humidity,
          pressure: d.sensor_data.pressure,
          gasResistance: d.sensor_data.gas_resistance,
          iaq: d.sensor_data.iaq,
          iaqAccuracy: d.sensor_data.iaq_accuracy,
          co2Equivalent: d.sensor_data.co2_equivalent,
          vocEquivalent: d.sensor_data.voc_equivalent,
          uptime: d.sensor_data.uptime_seconds || d.sensor_data.uptime_s,
        } : undefined,
        lastUpdate: d.sensor_data?.last_update || new Date().toISOString(),
      }
    })
  }

  function transformFungalObservations(observations: any[]): FungalObservation[] {
    return observations.map((obs: any) => ({
      id: obs.id,
      observed_on: obs.timestamp || obs.observed_on,
      latitude: obs.latitude || obs.lat,
      longitude: obs.longitude || obs.lng,
      species: obs.commonName || obs.species || obs.scientificName || "Unknown",
      taxon_id: obs.taxon_id,
      taxon: {
        id: obs.taxon_id || 0,
        name: obs.scientificName || obs.species || "Unknown",
        preferred_common_name: obs.commonName || obs.species,
        rank: "species",
      },
      photos: obs.imageUrl || obs.thumbnailUrl ? [{ 
        id: 1, 
        url: obs.imageUrl || obs.thumbnailUrl,
        license: "CC-BY-NC"
      }] : [],
      quality_grade: obs.verified ? "research" : "needs_id",
      user: obs.observer,
      source: obs.source,
      location: obs.location,
      habitat: obs.habitat,
      notes: obs.notes,
      sourceUrl: obs.sourceUrl,
      externalId: obs.externalId,
    }))
  }

  function transformPresenceReadings(monitors: any[]): PresenceReading[] {
    const seenMonitors = new Set<string>()
    return monitors
      .map((m: any) => ({
        monitorId: m.id,
        monitorName: m.name,
        zone: m.zone,
        lat: m.lat,
        lng: m.lng,
        presenceDetected: m.readings?.presenceDetected || false,
        lastMovement: m.readings?.lastMovement || new Date().toISOString(),
        motionIntensity: m.readings?.presenceDetected ? 75 : 0,
        smellDetected: m.readings?.smellDetected,
      }))
      .filter((r: PresenceReading) => {
        if (seenMonitors.has(r.monitorId)) return false
        seenMonitors.add(r.monitorId)
        return true
      })
  }

  // Force refresh (bypasses cache and interval checks)
  const refresh = useCallback(() => {
    console.log("[useCREPData] Manual refresh triggered")
    return fetchData(true)
  }, [fetchData])

  // Initial fetch on mount
  useEffect(() => {
    isMounted.current = true
    
    if (initialFetch) {
      fetchData()
    }

    return () => {
      isMounted.current = false
    }
  }, [fetchData, initialFetch])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return

    const intervalId = setInterval(() => {
      console.log("[useCREPData] Auto-refresh triggered")
      fetchData()
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [fetchData, refreshInterval])

  return {
    ...data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    // Convenience counts
    counts: {
      globalEvents: data.globalEvents.length,
      devices: data.devices.length,
      aircraft: data.aircraft.length,
      vessels: data.vessels.length,
      satellites: data.satellites.length,
      fungalObservations: data.fungalObservations.length,
      elephants: data.elephants.length,
    },
  }
}

export default useCREPData
