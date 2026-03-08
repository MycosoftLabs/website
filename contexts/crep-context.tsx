/**
 * CREP Dashboard Context
 *
 * Top-level context provider for the CREP dashboard. Replaces 30+ useState
 * hooks and 15+ prop-drilled handlers with structured context.
 *
 * Sub-contexts:
 * - CREPEntityContext: entity data (aircraft, vessels, satellites, etc.)
 * - CREPMapContext: map operations (flyTo, zoom, pan, view state)
 * - CREPLayerContext: layer visibility and filtering
 * - CREPMissionContext: mission state and objectives
 *
 * MYCA and MINDEX integration is handled through the existing MYCAProvider
 * and dedicated bridge hooks.
 */

"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema"
import { EntityStreamClient, type ConnectionState } from "@/lib/crep/streaming/entity-websocket-client"

// ============================================================================
// Entity Context
// ============================================================================

export interface CREPEntityState {
  aircraft: UnifiedEntity[]
  vessels: UnifiedEntity[]
  satellites: UnifiedEntity[]
  fungalObservations: UnifiedEntity[]
  globalEvents: UnifiedEntity[]
  devices: UnifiedEntity[]
  /** All entities in a flat list for deck.gl rendering */
  allEntities: UnifiedEntity[]
  /** Currently selected entity */
  selectedEntity: UnifiedEntity | null
  /** Loading state per entity type */
  loading: Record<string, boolean>
  /** Error state per entity type */
  errors: Record<string, string | null>
  /** Last data refresh timestamp */
  lastRefresh: Record<string, number>
}

type EntityAction =
  | { type: "SET_ENTITIES"; entityType: string; entities: UnifiedEntity[] }
  | { type: "ADD_ENTITY"; entity: UnifiedEntity }
  | { type: "UPDATE_ENTITY"; entity: UnifiedEntity }
  | { type: "SELECT_ENTITY"; entity: UnifiedEntity | null }
  | { type: "SET_LOADING"; entityType: string; loading: boolean }
  | { type: "SET_ERROR"; entityType: string; error: string | null }
  | { type: "CLEAR_ALL" }

function entityReducer(state: CREPEntityState, action: EntityAction): CREPEntityState {
  switch (action.type) {
    case "SET_ENTITIES": {
      const newState = { ...state }
      const key = action.entityType as keyof Pick<
        CREPEntityState,
        "aircraft" | "vessels" | "satellites" | "fungalObservations" | "globalEvents" | "devices"
      >
      if (key in newState && Array.isArray(newState[key])) {
        ;(newState as Record<string, unknown>)[key] = action.entities
      }
      newState.lastRefresh = {
        ...newState.lastRefresh,
        [action.entityType]: Date.now(),
      }
      // Rebuild allEntities
      newState.allEntities = [
        ...newState.aircraft,
        ...newState.vessels,
        ...newState.satellites,
        ...newState.fungalObservations,
        ...newState.globalEvents,
        ...newState.devices,
      ]
      return newState
    }
    case "ADD_ENTITY": {
      const e = action.entity
      const typeKey = getEntityTypeKey(e.type)
      if (!typeKey) return state
      const newState = { ...state }
      const existing = (newState as Record<string, unknown>)[typeKey] as UnifiedEntity[]
      const idx = existing.findIndex((x) => x.id === e.id)
      if (idx >= 0) {
        const updated = [...existing]
        updated[idx] = e
        ;(newState as Record<string, unknown>)[typeKey] = updated
      } else {
        ;(newState as Record<string, unknown>)[typeKey] = [...existing, e]
      }
      newState.allEntities = [
        ...newState.aircraft,
        ...newState.vessels,
        ...newState.satellites,
        ...newState.fungalObservations,
        ...newState.globalEvents,
        ...newState.devices,
      ]
      return newState
    }
    case "UPDATE_ENTITY": {
      const e = action.entity
      const typeKey = getEntityTypeKey(e.type)
      if (!typeKey) return state
      const newState = { ...state }
      const existing = (newState as Record<string, unknown>)[typeKey] as UnifiedEntity[]
      const idx = existing.findIndex((x) => x.id === e.id)
      if (idx >= 0) {
        const updated = [...existing]
        updated[idx] = e
        ;(newState as Record<string, unknown>)[typeKey] = updated
        newState.allEntities = [
          ...newState.aircraft,
          ...newState.vessels,
          ...newState.satellites,
          ...newState.fungalObservations,
          ...newState.globalEvents,
          ...newState.devices,
        ]
      }
      return newState
    }
    case "SELECT_ENTITY":
      return { ...state, selectedEntity: action.entity }
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.entityType]: action.loading },
      }
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.entityType]: action.error },
      }
    case "CLEAR_ALL":
      return createInitialEntityState()
    default:
      return state
  }
}

function getEntityTypeKey(type: string): string | null {
  const map: Record<string, string> = {
    aircraft: "aircraft",
    vessel: "vessels",
    satellite: "satellites",
    fungal: "fungalObservations",
    weather: "globalEvents",
    earthquake: "globalEvents",
    device: "devices",
    elephant: "devices",
  }
  return map[type] || null
}

function createInitialEntityState(): CREPEntityState {
  return {
    aircraft: [],
    vessels: [],
    satellites: [],
    fungalObservations: [],
    globalEvents: [],
    devices: [],
    allEntities: [],
    selectedEntity: null,
    loading: {},
    errors: {},
    lastRefresh: {},
  }
}

interface CREPEntityContextValue {
  state: CREPEntityState
  dispatch: React.Dispatch<EntityAction>
  /** Convenience: set entities for a type */
  setEntities: (entityType: string, entities: UnifiedEntity[]) => void
  /** Convenience: select an entity */
  selectEntity: (entity: UnifiedEntity | null) => void
  /** Get entity counts */
  counts: Record<string, number>
}

export const CREPEntityContext = createContext<CREPEntityContextValue | null>(null)

// ============================================================================
// Map Context
// ============================================================================

export interface CREPMapState {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

export interface CREPMapOperations {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  setZoom: (zoom: number) => void
  zoomBy: (delta: number) => void
  panBy: (dx: number, dy: number) => void
  resetView: () => void
  geocodeAndFlyTo: (query: string) => Promise<void>
  /** Current map state */
  mapState: CREPMapState
  /** Update map state (called from map move events) */
  updateMapState: (state: Partial<CREPMapState>) => void
  /** Map ref for direct access */
  mapRef: React.MutableRefObject<unknown>
}

export const CREPMapContext = createContext<CREPMapOperations | null>(null)

// ============================================================================
// Layer Context
// ============================================================================

export interface LayerVisibility {
  aircraft: boolean
  vessels: boolean
  satellites: boolean
  fungalObservations: boolean
  globalEvents: boolean
  devices: boolean
  weather: boolean
  sporeDispersal: boolean
  wind: boolean
  precipitation: boolean
  clouds: boolean
  pressure: boolean
  humidity: boolean
  stormCells: boolean
  fire: boolean
  lightning: boolean
  smoke: boolean
  trajectories: boolean
  orbitPaths: boolean
}

interface CREPLayerContextValue {
  layers: LayerVisibility
  setLayerVisible: (layer: keyof LayerVisibility, visible: boolean) => void
  toggleLayer: (layer: keyof LayerVisibility) => void
  showAllLayers: () => void
  hideAllLayers: () => void
  /** Layer opacity per layer */
  opacity: Record<string, number>
  setOpacity: (layer: string, opacity: number) => void
}

const DEFAULT_LAYERS: LayerVisibility = {
  aircraft: false,
  vessels: false,
  satellites: false,
  fungalObservations: true,
  globalEvents: true,
  devices: true,
  weather: true,
  sporeDispersal: false,
  wind: false,
  precipitation: false,
  clouds: false,
  pressure: false,
  humidity: false,
  stormCells: false,
  fire: false,
  lightning: false,
  smoke: false,
  trajectories: true,
  orbitPaths: false,
}

export const CREPLayerContext = createContext<CREPLayerContextValue | null>(null)

// ============================================================================
// Mission Context
// ============================================================================

export interface MissionContext {
  id: string
  name: string
  type: "monitoring" | "research" | "alert" | "tracking" | "analysis"
  status: "active" | "paused" | "completed"
  objective: string
  progress: number
  targets: number
  alerts: number
  startTime: Date
}

interface CREPMissionContextValue {
  mission: MissionContext | null
  setMission: (mission: MissionContext | null) => void
  updateMission: (updates: Partial<MissionContext>) => void
}

export const CREPMissionContext = createContext<CREPMissionContextValue | null>(null)

// ============================================================================
// Stream Context
// ============================================================================

interface CREPStreamContextValue {
  connectionState: ConnectionState
  messageCount: number
  client: EntityStreamClient | null
}

export const CREPStreamContext = createContext<CREPStreamContextValue | null>(null)

// ============================================================================
// Combined Provider
// ============================================================================

export function CREPProvider({ children }: { children: React.ReactNode }) {
  // Entity state
  const [entityState, entityDispatch] = useReducer(entityReducer, createInitialEntityState())

  const setEntities = useCallback(
    (entityType: string, entities: UnifiedEntity[]) => {
      entityDispatch({ type: "SET_ENTITIES", entityType, entities })
    },
    []
  )

  const selectEntity = useCallback(
    (entity: UnifiedEntity | null) => {
      entityDispatch({ type: "SELECT_ENTITY", entity })
    },
    []
  )

  const counts = useMemo(
    () => ({
      aircraft: entityState.aircraft.length,
      vessels: entityState.vessels.length,
      satellites: entityState.satellites.length,
      fungalObservations: entityState.fungalObservations.length,
      globalEvents: entityState.globalEvents.length,
      devices: entityState.devices.length,
      total: entityState.allEntities.length,
    }),
    [entityState.aircraft.length, entityState.vessels.length, entityState.satellites.length, entityState.fungalObservations.length, entityState.globalEvents.length, entityState.devices.length, entityState.allEntities.length]
  )

  const entityContextValue = useMemo<CREPEntityContextValue>(
    () => ({
      state: entityState,
      dispatch: entityDispatch,
      setEntities,
      selectEntity,
      counts,
    }),
    [entityState, setEntities, selectEntity, counts]
  )

  // Map state
  const mapRef = useRef<unknown>(null)
  const [mapState, setMapState] = useState<CREPMapState>({
    center: [0, 20],
    zoom: 2.5,
    bearing: 0,
    pitch: 0,
  })

  const updateMapState = useCallback((partial: Partial<CREPMapState>) => {
    setMapState((prev) => ({ ...prev, ...partial }))
  }, [])

  const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
    const map = mapRef.current as { flyTo?: (opts: Record<string, unknown>) => void } | null
    if (map?.flyTo) {
      map.flyTo({ center: [lng, lat], zoom: zoom || 8, duration: 1500 })
    }
  }, [])

  const setZoom = useCallback((zoom: number) => {
    const map = mapRef.current as { setZoom?: (z: number) => void } | null
    map?.setZoom?.(zoom)
  }, [])

  const zoomBy = useCallback((delta: number) => {
    setMapState((prev) => {
      const newZoom = Math.max(1, Math.min(20, prev.zoom + delta))
      const map = mapRef.current as { setZoom?: (z: number) => void } | null
      map?.setZoom?.(newZoom)
      return { ...prev, zoom: newZoom }
    })
  }, [])

  const panBy = useCallback((dx: number, dy: number) => {
    const map = mapRef.current as { panBy?: (offset: [number, number]) => void } | null
    map?.panBy?.([dx, dy])
  }, [])

  const resetView = useCallback(() => {
    flyTo(0, 20, 2.5)
  }, [flyTo])

  const geocodeAndFlyTo = useCallback(
    async (query: string) => {
      try {
        const response = await fetch(
          `/api/search/location?q=${encodeURIComponent(query)}`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.lat && data.lng) {
            flyTo(data.lng, data.lat, 10)
          }
        }
      } catch (error) {
        console.warn("[CREP Map] Geocode failed:", error)
      }
    },
    [flyTo]
  )

  const mapContextValue = useMemo<CREPMapOperations>(
    () => ({
      flyTo,
      setZoom,
      zoomBy,
      panBy,
      resetView,
      geocodeAndFlyTo,
      mapState,
      updateMapState,
      mapRef,
    }),
    [flyTo, setZoom, zoomBy, panBy, resetView, geocodeAndFlyTo, mapState, updateMapState]
  )

  // Layer state
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS)
  const [opacity, setOpacityState] = useState<Record<string, number>>({})

  const setLayerVisible = useCallback(
    (layer: keyof LayerVisibility, visible: boolean) => {
      setLayers((prev) => ({ ...prev, [layer]: visible }))
    },
    []
  )

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }, [])

  const showAllLayers = useCallback(() => {
    setLayers((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next) as Array<keyof LayerVisibility>) {
        next[k] = true
      }
      return next
    })
  }, [])

  const hideAllLayers = useCallback(() => {
    setLayers((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next) as Array<keyof LayerVisibility>) {
        next[k] = false
      }
      return next
    })
  }, [])

  const setOpacity = useCallback((layer: string, value: number) => {
    setOpacityState((prev) => ({ ...prev, [layer]: value }))
  }, [])

  const layerContextValue = useMemo<CREPLayerContextValue>(
    () => ({
      layers,
      setLayerVisible,
      toggleLayer,
      showAllLayers,
      hideAllLayers,
      opacity,
      setOpacity,
    }),
    [layers, setLayerVisible, toggleLayer, showAllLayers, hideAllLayers, opacity, setOpacity]
  )

  // Mission state
  const [mission, setMission] = useState<MissionContext | null>(null)

  const updateMission = useCallback((updates: Partial<MissionContext>) => {
    setMission((prev) => (prev ? { ...prev, ...updates } : null))
  }, [])

  const missionContextValue = useMemo<CREPMissionContextValue>(
    () => ({ mission, setMission, updateMission }),
    [mission, updateMission]
  )

  // Streaming state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [messageCount, setMessageCount] = useState(0)
  const clientRef = useRef<EntityStreamClient | null>(null)

  useEffect(() => {
    const client = new EntityStreamClient()
    clientRef.current = client

    client.connect(
      (entity) => {
        entityDispatch({ type: "ADD_ENTITY", entity })
        setMessageCount((prev) => prev + 1)
      },
      {},
      {
        onConnectionStateChange: setConnectionState,
        onError: (error) => {
          console.error("[CREP Stream] Error:", error.message)
        },
      }
    )

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [])

  const streamContextValue = useMemo<CREPStreamContextValue>(
    () => ({
      connectionState,
      messageCount,
      client: clientRef.current,
    }),
    [connectionState, messageCount]
  )

  return (
    <CREPEntityContext.Provider value={entityContextValue}>
      <CREPMapContext.Provider value={mapContextValue}>
        <CREPLayerContext.Provider value={layerContextValue}>
          <CREPMissionContext.Provider value={missionContextValue}>
            <CREPStreamContext.Provider value={streamContextValue}>
              {children}
            </CREPStreamContext.Provider>
          </CREPMissionContext.Provider>
        </CREPLayerContext.Provider>
      </CREPMapContext.Provider>
    </CREPEntityContext.Provider>
  )
}

// ============================================================================
// Hooks
// ============================================================================

export function useCREPEntities(): CREPEntityContextValue {
  const ctx = useContext(CREPEntityContext)
  if (!ctx) throw new Error("useCREPEntities must be used within CREPProvider")
  return ctx
}

export function useCREPMap(): CREPMapOperations {
  const ctx = useContext(CREPMapContext)
  if (!ctx) throw new Error("useCREPMap must be used within CREPProvider")
  return ctx
}

export function useCREPLayers(): CREPLayerContextValue {
  const ctx = useContext(CREPLayerContext)
  if (!ctx) throw new Error("useCREPLayers must be used within CREPProvider")
  return ctx
}

export function useCREPMission(): CREPMissionContextValue {
  const ctx = useContext(CREPMissionContext)
  if (!ctx) throw new Error("useCREPMission must be used within CREPProvider")
  return ctx
}

export function useCREPStream(): CREPStreamContextValue {
  const ctx = useContext(CREPStreamContext)
  if (!ctx) throw new Error("useCREPStream must be used within CREPProvider")
  return ctx
}

/** Optional access — returns null if not within CREPProvider */
export function useOptionalCREPEntities(): CREPEntityContextValue | null {
  return useContext(CREPEntityContext)
}

export function useOptionalCREPMap(): CREPMapOperations | null {
  return useContext(CREPMapContext)
}
