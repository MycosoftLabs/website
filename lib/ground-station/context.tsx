"use client"

/**
 * Ground Station Context
 *
 * React context provider for ground-station state management within CREP and NatureOS.
 * Manages satellite data, tracking state, hardware status, observations,
 * and bridges data to mindex + worldview API.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import * as satellite from "satellite.js"
import { pushPositionsToMindex, pushTrackingToWorldview } from "./mindex-bridge"
import type {
  GSSatellite,
  GSGroup,
  GSTrackingState,
  GSSDR,
  GSRotator,
  GSRig,
  GSSatellitePass,
  GSSatellitePosition,
  GSScheduledObservation,
  GSMonitoredSatellite,
  GSLocation,
  GSSystemInfo,
  GSConnectionConfig,
} from "./types"

// ============================================================================
// State
// ============================================================================

export interface GroundStationState {
  connected: boolean
  connectionError: string | null

  // Satellites
  satellites: GSSatellite[]
  groups: GSGroup[]
  selectedGroupId: string | null
  selectedSatelliteNoradId: number | null
  passes: GSSatellitePass[]
  positions: Record<number, GSSatellitePosition>

  // Tracking
  trackingState: GSTrackingState | null

  // Hardware
  sdrs: GSSDR[]
  rotators: GSRotator[]
  rigs: GSRig[]

  // Observations
  observations: GSScheduledObservation[]
  monitoredSatellites: GSMonitoredSatellite[]

  // Location
  locations: GSLocation[]
  activeLocation: GSLocation | null

  // System
  systemInfo: GSSystemInfo | null

  // Loading states
  loading: Record<string, boolean>
}

const initialState: GroundStationState = {
  connected: false,
  connectionError: null,
  satellites: [],
  groups: [],
  selectedGroupId: null,
  selectedSatelliteNoradId: null,
  passes: [],
  positions: {},
  trackingState: null,
  sdrs: [],
  rotators: [],
  rigs: [],
  observations: [],
  monitoredSatellites: [],
  locations: [],
  activeLocation: null,
  systemInfo: null,
  loading: {},
}

// ============================================================================
// Actions
// ============================================================================

type GSAction =
  | { type: "SET_CONNECTED"; connected: boolean; error?: string }
  | { type: "SET_SATELLITES"; satellites: GSSatellite[] }
  | { type: "SET_GROUPS"; groups: GSGroup[] }
  | { type: "SELECT_GROUP"; groupId: string | null }
  | { type: "SELECT_SATELLITE"; noradId: number | null }
  | { type: "SET_PASSES"; passes: GSSatellitePass[] }
  | { type: "SET_POSITIONS"; positions: Record<number, GSSatellitePosition> }
  | { type: "SET_TRACKING_STATE"; state: GSTrackingState }
  | { type: "SET_HARDWARE"; sdrs?: GSSDR[]; rotators?: GSRotator[]; rigs?: GSRig[] }
  | { type: "SET_OBSERVATIONS"; observations: GSScheduledObservation[] }
  | { type: "SET_MONITORED"; monitored: GSMonitoredSatellite[] }
  | { type: "SET_LOCATIONS"; locations: GSLocation[]; active?: GSLocation }
  | { type: "SET_SYSTEM_INFO"; info: GSSystemInfo }
  | { type: "SET_LOADING"; key: string; loading: boolean }

function gsReducer(state: GroundStationState, action: GSAction): GroundStationState {
  switch (action.type) {
    case "SET_CONNECTED":
      return { ...state, connected: action.connected, connectionError: action.error || null }
    case "SET_SATELLITES":
      return { ...state, satellites: action.satellites }
    case "SET_GROUPS":
      return { ...state, groups: action.groups }
    case "SELECT_GROUP":
      return { ...state, selectedGroupId: action.groupId }
    case "SELECT_SATELLITE":
      return { ...state, selectedSatelliteNoradId: action.noradId }
    case "SET_PASSES":
      return { ...state, passes: action.passes }
    case "SET_POSITIONS":
      return { ...state, positions: action.positions }
    case "SET_TRACKING_STATE":
      return { ...state, trackingState: action.state }
    case "SET_HARDWARE":
      return {
        ...state,
        ...(action.sdrs !== undefined && { sdrs: action.sdrs }),
        ...(action.rotators !== undefined && { rotators: action.rotators }),
        ...(action.rigs !== undefined && { rigs: action.rigs }),
      }
    case "SET_OBSERVATIONS":
      return { ...state, observations: action.observations }
    case "SET_MONITORED":
      return { ...state, monitoredSatellites: action.monitored }
    case "SET_LOCATIONS":
      return {
        ...state,
        locations: action.locations,
        activeLocation: action.active || state.activeLocation,
      }
    case "SET_SYSTEM_INFO":
      return { ...state, systemInfo: action.info }
    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, [action.key]: action.loading } }
    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================

interface GroundStationContextValue {
  state: GroundStationState
  dispatch: React.Dispatch<GSAction>
  // Actions
  selectGroup: (groupId: string | null) => void
  selectSatellite: (noradId: number | null) => void
  trackSatellite: (noradId: number) => void
  stopTracking: () => void
  refreshSatellites: () => Promise<void>
  refreshPasses: () => Promise<void>
  refreshHardware: () => Promise<void>
  refreshObservations: () => Promise<void>
  checkConnection: () => Promise<void>
}

const GroundStationContext = createContext<GroundStationContextValue | null>(null)

export function useGroundStation() {
  const ctx = useContext(GroundStationContext)
  if (!ctx) {
    throw new Error("useGroundStation must be used within a GroundStationProvider")
  }
  return ctx
}

// ============================================================================
// Provider
// ============================================================================

export function GroundStationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gsReducer, initialState)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/ground-station/system?action=health")
      const data = await res.json()
      dispatch({
        type: "SET_CONNECTED",
        connected: data.status === "connected",
        error: data.status !== "connected" ? "Ground station offline" : undefined,
      })
    } catch {
      dispatch({ type: "SET_CONNECTED", connected: false, error: "Cannot reach ground station" })
    }
  }, [])

  const refreshSatellites = useCallback(async () => {
    dispatch({ type: "SET_LOADING", key: "satellites", loading: true })
    try {
      const groupParam = state.selectedGroupId ? `?group_id=${state.selectedGroupId}` : ""
      const res = await fetch(`/api/ground-station/satellites${groupParam}`)
      if (res.ok) {
        const data = await res.json()
        dispatch({ type: "SET_SATELLITES", satellites: Array.isArray(data) ? data : data.satellites || [] })
      }
    } catch {
      // silent
    }
    dispatch({ type: "SET_LOADING", key: "satellites", loading: false })
  }, [state.selectedGroupId])

  const refreshPasses = useCallback(async () => {
    if (!state.selectedGroupId) return
    dispatch({ type: "SET_LOADING", key: "passes", loading: true })
    try {
      const res = await fetch(
        `/api/ground-station/satellites?action=passes&group_id=${state.selectedGroupId}&hours=24`
      )
      if (res.ok) {
        const data = await res.json()
        dispatch({ type: "SET_PASSES", passes: Array.isArray(data) ? data : data.passes || [] })
      }
    } catch {
      // silent
    }
    dispatch({ type: "SET_LOADING", key: "passes", loading: false })
  }, [state.selectedGroupId])

  const refreshHardware = useCallback(async () => {
    dispatch({ type: "SET_LOADING", key: "hardware", loading: true })
    try {
      const res = await fetch("/api/ground-station/hardware?type=all")
      if (res.ok) {
        const data = await res.json()
        dispatch({
          type: "SET_HARDWARE",
          sdrs: data.sdrs || [],
          rotators: data.rotators || [],
          rigs: data.rigs || [],
        })
      }
    } catch {
      // silent
    }
    dispatch({ type: "SET_LOADING", key: "hardware", loading: false })
  }, [])

  const refreshObservations = useCallback(async () => {
    dispatch({ type: "SET_LOADING", key: "observations", loading: true })
    try {
      const res = await fetch("/api/ground-station/observations")
      if (res.ok) {
        const data = await res.json()
        dispatch({
          type: "SET_OBSERVATIONS",
          observations: Array.isArray(data) ? data : data.observations || [],
        })
      }
    } catch {
      // silent
    }
    dispatch({ type: "SET_LOADING", key: "observations", loading: false })
  }, [])

  const selectGroup = useCallback((groupId: string | null) => {
    dispatch({ type: "SELECT_GROUP", groupId })
  }, [])

  const selectSatellite = useCallback((noradId: number | null) => {
    dispatch({ type: "SELECT_SATELLITE", noradId })
  }, [])

  const trackSatellite = useCallback(async (noradId: number) => {
    try {
      await fetch("/api/ground-station/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ norad_id: noradId }),
      })
      dispatch({
        type: "SET_TRACKING_STATE",
        state: {
          norad_id: noradId,
          rotator_state: "tracking",
          rig_state: "tracking",
        },
      })
    } catch {
      // silent
    }
  }, [])

  const stopTracking = useCallback(async () => {
    try {
      await fetch("/api/ground-station/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ norad_id: null, rotator_state: "idle", rig_state: "idle" }),
      })
      dispatch({
        type: "SET_TRACKING_STATE",
        state: { rotator_state: "idle", rig_state: "idle" },
      })
    } catch {
      // silent
    }
  }, [])

  // Initial data load
  useEffect(() => {
    checkConnection()
    const loadGroups = async () => {
      try {
        const res = await fetch("/api/ground-station/groups")
        if (res.ok) {
          const data = await res.json()
          dispatch({ type: "SET_GROUPS", groups: Array.isArray(data) ? data : data.groups || [] })
        }
      } catch {
        // silent
      }
    }
    loadGroups()
    refreshHardware()
  }, [checkConnection, refreshHardware])

  // Refresh satellites when group changes
  useEffect(() => {
    if (state.selectedGroupId) {
      refreshSatellites()
      refreshPasses()
    }
  }, [state.selectedGroupId, refreshSatellites, refreshPasses])

  // Periodic health check
  useEffect(() => {
    pollRef.current = setInterval(checkConnection, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [checkConnection])

  const positionsRef = useRef<Record<number, GSSatellitePosition>>({})

  // Orbit Propagation & MINDEX Sync Loop
  useEffect(() => {
    if (state.satellites.length === 0) return

    let lastSyncTime = Date.now()
    const MINDEX_SYNC_INTERVAL = 10000 // 10 seconds

    const propInterval = setInterval(() => {
      const now = new Date()
      const newPositions: Record<number, GSSatellitePosition> = {}

      const observerLat = state.activeLocation?.lat || 0
      const observerLon = state.activeLocation?.lon || 0
      const observerAlt = state.activeLocation?.alt || 0 // meters
      
      const observerGd = {
        longitude: satellite.degreesToRadians(observerLon),
        latitude: satellite.degreesToRadians(observerLat),
        height: observerAlt / 1000 // km
      }

      for (const sat of state.satellites) {
        if (!sat.tle1 || !sat.tle2) continue

        try {
          const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2)
          const positionAndVelocity = satellite.propagate(satrec, now)
          const positionEci = positionAndVelocity.position
          const velocityEci = positionAndVelocity.velocity

          if (typeof positionEci !== 'boolean' && positionEci !== undefined && typeof velocityEci !== 'boolean') {
            const gmst = satellite.gcostheta(satellite.jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()))
            const positionGd = satellite.eciToGeodetic(positionEci, gmst)
            const lookAngles = satellite.ecfToLookAngles(observerGd, satellite.eciToEcf(positionEci, gmst))

            const lat = satellite.radiansToDegrees(positionGd.latitude)
            const lon = satellite.radiansToDegrees(positionGd.longitude)
            const alt = positionGd.height
            
            const velocityKmS = Math.sqrt(
              velocityEci.x * velocityEci.x + 
              velocityEci.y * velocityEci.y + 
              velocityEci.z * velocityEci.z
            )

            const az = satellite.radiansToDegrees(lookAngles.azimuth)
            const el = satellite.radiansToDegrees(lookAngles.elevation)
            const range = lookAngles.rangeSat

            const is_visible = el > 0

            const oldPos = positionsRef.current[sat.norad_id]
            let trend: "rising" | "falling" | "stable" | "peak" = "stable"
            let el_rate = 0
            if (oldPos) {
              const dt = 1 // 1 second approx
              el_rate = (el - oldPos.el) / dt
              if (Math.abs(el_rate) < 0.001) trend = "peak"
              else if (el_rate > 0) trend = "rising"
              else trend = "falling"
            }

            newPositions[sat.norad_id] = {
              norad_id: sat.norad_id,
              lat, lon, alt,
              velocity: velocityKmS,
              az, el, range,
              trend,
              el_rate,
              is_visible,
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      positionsRef.current = newPositions
      dispatch({ type: "SET_POSITIONS", positions: newPositions })

      const msSinceEpoch = now.getTime()
      if (msSinceEpoch - lastSyncTime >= MINDEX_SYNC_INTERVAL) {
        lastSyncTime = msSinceEpoch
        pushPositionsToMindex(state.satellites, newPositions).catch(() => {})
        pushTrackingToWorldview(state.satellites, newPositions, state.trackingState?.norad_id).catch(() => {})
      }

    }, 1000)

    return () => clearInterval(propInterval)
  }, [state.satellites, state.activeLocation, state.trackingState?.norad_id])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      selectGroup,
      selectSatellite,
      trackSatellite,
      stopTracking,
      refreshSatellites,
      refreshPasses,
      refreshHardware,
      refreshObservations,
      checkConnection,
    }),
    [
      state,
      selectGroup,
      selectSatellite,
      trackSatellite,
      stopTracking,
      refreshSatellites,
      refreshPasses,
      refreshHardware,
      refreshObservations,
      checkConnection,
    ]
  )

  return (
    <GroundStationContext.Provider value={value}>
      {children}
    </GroundStationContext.Provider>
  )
}
