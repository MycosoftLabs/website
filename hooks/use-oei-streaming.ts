"use client"

/**
 * React Hook for OEI Real-time Streaming
 * 
 * Provides easy integration of WebSocket and polling-based
 * real-time data streams for aircraft, vessels, and satellites.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import type { AircraftEntity, VesselEntity, SatelliteEntity } from "@/types/oei"

// =============================================================================
// TYPES
// =============================================================================

export interface StreamingConfig {
  enabled: boolean
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  pollIntervalMs?: number
}

export interface StreamingState {
  isConnected: boolean
  lastUpdate: string | null
  messageCount: number
  error: string | null
}

export interface AircraftStreamResult {
  aircraft: AircraftEntity[]
  state: StreamingState
  refresh: () => Promise<void>
}

export interface VesselStreamResult {
  vessels: VesselEntity[]
  state: StreamingState
  refresh: () => Promise<void>
}

export interface SatelliteStreamResult {
  satellites: SatelliteEntity[]
  state: StreamingState
  refresh: () => Promise<void>
}

// =============================================================================
// AIRCRAFT STREAMING HOOK
// =============================================================================

export function useAircraftStream(config: StreamingConfig): AircraftStreamResult {
  const [aircraft, setAircraft] = useState<AircraftEntity[]>([])
  const [state, setState] = useState<StreamingState>({
    isConnected: false,
    lastUpdate: null,
    messageCount: 0,
    error: null,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchAircraft = useCallback(async () => {
    if (!mountedRef.current) return
    
    try {
      const params = new URLSearchParams()
      if (config.bounds) {
        params.set("lamin", String(config.bounds.south))
        params.set("lamax", String(config.bounds.north))
        params.set("lomin", String(config.bounds.west))
        params.set("lomax", String(config.bounds.east))
      }
      params.set("limit", "200")

      const response = await fetch(`/api/oei/flightradar24?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      
      if (mountedRef.current) {
        setAircraft(data.aircraft || [])
        setState(prev => ({
          isConnected: true,
          lastUpdate: new Date().toISOString(),
          messageCount: prev.messageCount + 1,
          error: null,
        }))
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: String(error),
        }))
      }
    }
  }, [config.bounds])

  useEffect(() => {
    mountedRef.current = true

    if (config.enabled) {
      fetchAircraft()
      intervalRef.current = setInterval(
        fetchAircraft,
        config.pollIntervalMs || 10000
      )
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [config.enabled, config.pollIntervalMs, fetchAircraft])

  return {
    aircraft,
    state,
    refresh: fetchAircraft,
  }
}

// =============================================================================
// VESSEL STREAMING HOOK
// =============================================================================

export function useVesselStream(config: StreamingConfig): VesselStreamResult {
  const [vessels, setVessels] = useState<VesselEntity[]>([])
  const [state, setState] = useState<StreamingState>({
    isConnected: false,
    lastUpdate: null,
    messageCount: 0,
    error: null,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchVessels = useCallback(async () => {
    if (!mountedRef.current) return
    
    try {
      const params = new URLSearchParams()
      if (config.bounds) {
        params.set("lamin", String(config.bounds.south))
        params.set("lamax", String(config.bounds.north))
        params.set("lomin", String(config.bounds.west))
        params.set("lomax", String(config.bounds.east))
      }

      const response = await fetch(`/api/oei/aisstream?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      
      if (mountedRef.current) {
        setVessels(data.vessels || [])
        setState(prev => ({
          isConnected: true,
          lastUpdate: new Date().toISOString(),
          messageCount: prev.messageCount + 1,
          error: null,
        }))
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: String(error),
        }))
      }
    }
  }, [config.bounds])

  useEffect(() => {
    mountedRef.current = true

    if (config.enabled) {
      fetchVessels()
      intervalRef.current = setInterval(
        fetchVessels,
        config.pollIntervalMs || 30000 // Vessels update less frequently
      )
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [config.enabled, config.pollIntervalMs, fetchVessels])

  return {
    vessels,
    state,
    refresh: fetchVessels,
  }
}

// =============================================================================
// SATELLITE STREAMING HOOK
// =============================================================================

export function useSatelliteStream(
  config: StreamingConfig & { category?: string }
): SatelliteStreamResult {
  const [satellites, setSatellites] = useState<SatelliteEntity[]>([])
  const [state, setState] = useState<StreamingState>({
    isConnected: false,
    lastUpdate: null,
    messageCount: 0,
    error: null,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchSatellites = useCallback(async () => {
    if (!mountedRef.current) return
    
    try {
      const params = new URLSearchParams()
      params.set("category", config.category || "stations")

      const response = await fetch(`/api/oei/satellites?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      
      if (mountedRef.current) {
        setSatellites(data.satellites || [])
        setState(prev => ({
          isConnected: true,
          lastUpdate: new Date().toISOString(),
          messageCount: prev.messageCount + 1,
          error: null,
        }))
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: String(error),
        }))
      }
    }
  }, [config.category])

  useEffect(() => {
    mountedRef.current = true

    if (config.enabled) {
      fetchSatellites()
      intervalRef.current = setInterval(
        fetchSatellites,
        config.pollIntervalMs || 60000 // Satellites update slowly
      )
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [config.enabled, config.pollIntervalMs, fetchSatellites])

  return {
    satellites,
    state,
    refresh: fetchSatellites,
  }
}

// =============================================================================
// COMBINED STREAMING HOOK
// =============================================================================

export interface CombinedStreamResult {
  aircraft: AircraftEntity[]
  vessels: VesselEntity[]
  satellites: SatelliteEntity[]
  statuses: {
    aircraft: StreamingState
    vessels: StreamingState
    satellites: StreamingState
  }
  isStreaming: boolean
  toggleStreaming: () => void
  refreshAll: () => Promise<void>
}

export function useOEIStreaming(config: {
  enabled: boolean
  bounds?: StreamingConfig["bounds"]
  aircraftInterval?: number
  vesselInterval?: number
  satelliteInterval?: number
  satelliteCategory?: string
}): CombinedStreamResult {
  const [isStreaming, setIsStreaming] = useState(config.enabled)

  const aircraftStream = useAircraftStream({
    enabled: isStreaming,
    bounds: config.bounds,
    pollIntervalMs: config.aircraftInterval || 10000,
  })

  const vesselStream = useVesselStream({
    enabled: isStreaming,
    bounds: config.bounds,
    pollIntervalMs: config.vesselInterval || 30000,
  })

  const satelliteStream = useSatelliteStream({
    enabled: isStreaming,
    category: config.satelliteCategory || "stations",
    pollIntervalMs: config.satelliteInterval || 60000,
  })

  const toggleStreaming = useCallback(() => {
    setIsStreaming(prev => !prev)
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      aircraftStream.refresh(),
      vesselStream.refresh(),
      satelliteStream.refresh(),
    ])
  }, [aircraftStream, vesselStream, satelliteStream])

  return {
    aircraft: aircraftStream.aircraft,
    vessels: vesselStream.vessels,
    satellites: satelliteStream.satellites,
    statuses: {
      aircraft: aircraftStream.state,
      vessels: vesselStream.state,
      satellites: satelliteStream.state,
    },
    isStreaming,
    toggleStreaming,
    refreshAll,
  }
}
