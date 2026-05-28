"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Map as SearchMap, MapControls } from "@/components/ui/map"
import { classifyAndRoute } from "@/lib/search/search-intelligence-router"
import { resolveEarthSearchRule } from "@/lib/search/earth-search-rules"

export interface MapObservation {
  id: string
  species: string
  scientificName?: string
  commonName?: string
  lat: number
  lng: number
  timestamp?: string
  imageUrl?: string
  isToxic?: boolean
  observer?: string
}

export interface WeatherCondition {
  temperature: number
  humidity: number
  precipitation: number
  windSpeed: number
  cloudCover: number
  uvIndex: number
}

export interface Earth2Data {
  currentConditions?: WeatherCondition
  sporeZones?: any[]
  growthPrediction?: { score: number; factors: string[]; recommendation: string }
}

export interface EventObservation {
  id: string
  title: string
  type: string
  severity?: string
  lat: number
  lng: number
  timestamp?: string
  magnitude?: number
}

interface EarthWidgetProps {
  data: MapObservation[]
  eventsData?: EventObservation[]
  earth2Data?: Earth2Data | null
  searchLocation?: { lat: number; lng: number; name?: string; zoom?: number }
  userLocation?: { lat: number; lng: number }
  searchQuery?: string
  liveEntities?: Array<Record<string, unknown>>
  isFocused?: boolean
  focusedId?: string | null
  error?: string
  isLoading?: boolean
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
}

function readNumber(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (!acc || typeof acc !== "object") return undefined
      return (acc as Record<string, unknown>)[part]
    }, item)
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return null
}

function readEntityId(item: Record<string, unknown>, fallback: string) {
  return String(
    item.id ??
      item.uuid ??
      item.icao24 ??
      item.mmsi ??
      item.noradId ??
      item.satelliteId ??
      item.callsign ??
      item.registration ??
      item.name ??
      item.title ??
      fallback,
  )
}

const SEARCH_EARTH_SOURCE_ID = "search-earth-widget-results"
const SEARCH_EARTH_GLOW_LAYER_ID = "search-earth-widget-results-glow"
const SEARCH_EARTH_DOT_LAYER_ID = "search-earth-widget-results-dot"
const SEARCH_EARTH_HIT_LAYER_ID = "search-earth-widget-results-hit"

type SearchEarthFeatureProperties = {
  id: string
  kind: string
  title: string
  detail: string
  magnitude?: number
  timestamp?: string
  source?: string
}

function makeFeature(
  row: Record<string, unknown>,
  fallbackKind: string,
  titleKeys: string[],
): GeoJSON.Feature<GeoJSON.Point, SearchEarthFeatureProperties> | null {
  const lat = readNumber(row, ["lat", "latitude", "location.lat", "location.latitude", "location.coordinates.1"])
  const lng = readNumber(row, ["lng", "lon", "longitude", "location.lng", "location.lon", "location.longitude", "location.coordinates.0"])
  if (lat == null || lng == null) return null
  const kind = String(row.type ?? row.category ?? row.entity_type ?? fallbackKind).toLowerCase() || fallbackKind
  const title = titleKeys
    .map((key) => String(row[key] ?? "").trim())
    .find(Boolean) || kind
  const detail = String(
    row.locationName ??
      row.place ??
      row.description ??
      row.scientificName ??
      row.commonName ??
      row.species ??
      row.deviceType ??
      row.status ??
      row.source ??
      "",
  ).trim()
  const magnitude = Number(row.magnitude)
  const id = readEntityId(row, `${kind}:${lat.toFixed(4)},${lng.toFixed(4)}`)
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id,
      kind,
      title,
      detail,
      magnitude: Number.isFinite(magnitude) ? magnitude : undefined,
      timestamp: row.timestamp ? String(row.timestamp) : undefined,
      source: row.source ? String(row.source) : undefined,
    },
  }
}

function toFeatureCollection(features: GeoJSON.Feature<GeoJSON.Point, SearchEarthFeatureProperties>[]) {
  return {
    type: "FeatureCollection" as const,
    features,
  }
}

export function EarthWidget({
  data = [],
  eventsData = [],
  searchLocation,
  userLocation,
  searchQuery = "",
  liveEntities = [],
  isFocused = false,
  focusedId = null,
  error,
  isLoading = false,
}: EarthWidgetProps) {
  const [mounted, setMounted] = useState(false)
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<SearchEarthFeatureProperties | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const route = useMemo(
    () => (searchQuery.trim().length >= 2 ? classifyAndRoute(searchQuery) : null),
    [searchQuery]
  )
  const isEarthquakeQuery = /\b(active\s+)?earthquakes?\b|\bseismic\b|\bquake\b|\btremor\b/i.test(searchQuery)
  const routeLocation = route?.intent.filters.location
  const routeViewport = route?.searchPlan?.earth?.viewportTarget
  const routeZoom = routeViewport?.zoomIntent === "city"
    ? 7.5
    : routeViewport?.zoomIntent === "county"
      ? 6
      : routeViewport?.zoomIntent === "region"
        ? 2.5
        : routeViewport?.zoomIntent === "asset"
          ? 9
          : undefined
  const simulatorLocation = searchLocation || (
    routeViewport
      ? {
          lat: routeViewport.lat,
          lng: routeViewport.lng,
          name: routeLocation?.city || routeLocation?.state || routeLocation?.country || routeLocation?.region,
          zoom: routeZoom,
        }
      : routeLocation?.lat && routeLocation?.lng
      ? {
          lat: routeLocation.lat,
          lng: routeLocation.lng,
          name: routeLocation.city || routeLocation.state || routeLocation.country || routeLocation.region,
          zoom: routeLocation.city ? 7.5 : routeLocation.region || routeLocation.country || routeLocation.state ? 2.5 : undefined,
        }
      : isEarthquakeQuery && userLocation
        ? { ...userLocation, name: "your location" }
        : null
  )
  const enabledFilters = useMemo(
    () => route?.earthContextFilters.enabledFilters ?? [],
    [route]
  )
  const enabledLabels = useMemo(
    () => enabledFilters.map((filter) => filter.label),
    [enabledFilters]
  )
  const enabledCategories = useMemo(
    () => new Set(enabledFilters.map((filter) => filter.category)),
    [enabledFilters]
  )
  const earthRule = useMemo(
    () => resolveEarthSearchRule(searchQuery, enabledCategories),
    [enabledCategories, searchQuery]
  )
  const enabledLayerIds = useMemo(() => {
    return route?.searchPlan?.earth?.enabledLayers ?? earthRule.enabledLayerIds
  }, [earthRule, route])
  const enabledEntityTypes = useMemo(
    () => new Set(route?.searchPlan?.earth?.entityTypes ?? earthRule.entityTypes),
    [earthRule.entityTypes, route]
  )
  const normalizedLiveEntities = useMemo(
    () => [
      ...liveEntities,
      ...eventsData.map((event) => ({
        id: event.id,
        type: event.type?.toLowerCase().includes("vessel") ? "vessel" : "event",
        name: event.title || event.type,
        lat: event.lat,
        lng: event.lng,
        severity: event.severity,
        magnitude: event.magnitude,
        timestamp: event.timestamp,
      })),
      ...data.map((observation) => ({
        id: observation.id,
        type: "species",
        name: observation.commonName || observation.scientificName || observation.species,
        lat: observation.lat,
        lng: observation.lng,
        timestamp: observation.timestamp,
      })),
    ],
    [data, eventsData, liveEntities]
  )
  const filteredEntities = useMemo(
    () => normalizedLiveEntities.filter((entity) => {
      const row = entity as Record<string, unknown>
      const type = String(row.type ?? row.category ?? row.entity_type ?? "").toLowerCase()
      const entityText = `${type} ${String(row.name ?? row.title ?? row.label ?? "")}`.toLowerCase()
      const hasPlanEntityTypes = enabledEntityTypes.size > 0
      if (enabledCategories.size === 0 && !hasPlanEntityTypes) return false
      if (type === "species") return enabledCategories.has("species") || enabledEntityTypes.has("species") || enabledEntityTypes.has("fungal")
      if (type === "event") {
        if (enabledCategories.has("event")) return true
        return [...enabledEntityTypes].some((entityType) => entityText.includes(entityType.replace("_", " ")))
      }
      if (type === "aircraft") return enabledCategories.has("aircraft") || enabledEntityTypes.has("aircraft")
      if (type === "vessel") return enabledCategories.has("vessel") || enabledEntityTypes.has("vessel")
      if (type === "satellite") return enabledCategories.has("satellite") || enabledEntityTypes.has("satellite")
      if (type === "device") return enabledCategories.has("device") || enabledEntityTypes.has("device") || enabledEntityTypes.has("camera")
      return false
    }),
    [enabledCategories, enabledEntityTypes, normalizedLiveEntities]
  )
  const entityFocus = useMemo(() => {
    const coords = filteredEntities
      .map((entity) => {
        const lat = readNumber(entity, ["lat", "latitude", "location.lat", "location.latitude", "location.coordinates.1"])
        const lng = readNumber(entity, ["lng", "lon", "longitude", "location.lng", "location.lon", "location.longitude", "location.coordinates.0"])
        return lat == null || lng == null ? null : { lat, lng }
      })
      .filter((coord): coord is { lat: number; lng: number } => Boolean(coord))
    if (coords.length === 0) return null
    return {
      lat: coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length,
      lng: coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length,
      name: enabledLabels[0] || "Search results",
    }
  }, [enabledLabels, filteredEntities])
  const trackedFocusAsset = useMemo(() => {
    const mover = filteredEntities.find((entity) => {
      const type = String((entity as Record<string, unknown>).type ?? "").toLowerCase()
      return type === "aircraft" || type === "vessel" || type === "satellite"
    }) as Record<string, unknown> | undefined
    if (!mover) return null
    const type = String(mover.type).toLowerCase() as "aircraft" | "vessel" | "satellite"
    const lat = readNumber(mover, ["lat", "latitude", "location.lat", "location.latitude", "location.coordinates.1"])
    const lng = readNumber(mover, ["lng", "lon", "longitude", "location.lng", "location.lon", "location.longitude", "location.coordinates.0"])
    return {
      type,
      id: String(mover.id ?? mover.icao24 ?? mover.mmsi ?? mover.noradId ?? mover.name ?? ""),
      name: String(mover.callsign ?? mover.flightNumber ?? mover.name ?? mover.registration ?? mover.mmsi ?? mover.noradId ?? type),
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      zoom: type === "satellite" ? 5 : 9,
    }
  }, [filteredEntities])
  const focusTarget: { lat: number; lng: number; name?: string; zoom?: number } | null =
    simulatorLocation || (trackedFocusAsset?.lat != null && trackedFocusAsset.lng != null
      ? { lat: trackedFocusAsset.lat, lng: trackedFocusAsset.lng, name: trackedFocusAsset.name, zoom: trackedFocusAsset.zoom }
      : isEarthquakeQuery ? null : entityFocus)
  const embeddedFocusTarget = focusTarget
    ? { ...focusTarget, zoom: focusTarget.zoom ?? (isEarthquakeQuery ? 2.2 : isFocused ? 8 : 6) }
    : { lat: 20, lng: 0, name: "global view", zoom: 1.35 }

  const searchFeatures = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.Point, SearchEarthFeatureProperties>[] = []
    for (const event of eventsData.slice(0, 5000)) {
      const feature = makeFeature(event as unknown as Record<string, unknown>, "event", ["title", "name", "type"])
      if (feature) features.push(feature)
    }
    for (const observation of data.slice(0, 2500)) {
      const feature = makeFeature(observation as unknown as Record<string, unknown>, "species", ["commonName", "scientificName", "species"])
      if (feature) features.push(feature)
    }
    for (const entity of liveEntities.slice(0, 2500)) {
      const feature = makeFeature(entity, "entity", ["name", "title", "callsign", "registration", "mmsi", "noradId"])
      if (feature) features.push(feature)
    }
    return features
  }, [data, eventsData, liveEntities])

  const featureCollection = useMemo(() => toFeatureCollection(searchFeatures), [searchFeatures])

  const mountSearchLayers = useCallback((map: MapLibreMap) => {
    if (!map.getSource(SEARCH_EARTH_SOURCE_ID)) {
      map.addSource(SEARCH_EARTH_SOURCE_ID, {
        type: "geojson",
        data: featureCollection,
      })
    }
    if (!map.getLayer(SEARCH_EARTH_GLOW_LAYER_ID)) {
      map.addLayer({
        id: SEARCH_EARTH_GLOW_LAYER_ID,
        type: "circle",
        source: SEARCH_EARTH_SOURCE_ID,
        paint: {
          "circle-color": [
            "match",
            ["get", "kind"],
            "earthquake", "#fb7185",
            "species", "#22c55e",
            "aircraft", "#38bdf8",
            "vessel", "#22d3ee",
            "satellite", "#a78bfa",
            "device", "#facc15",
            "camera", "#facc15",
            "#f97316",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 4, 8, 8, 16],
          "circle-opacity": 0.24,
          "circle-blur": 0.8,
        },
      })
    }
    if (!map.getLayer(SEARCH_EARTH_DOT_LAYER_ID)) {
      map.addLayer({
        id: SEARCH_EARTH_DOT_LAYER_ID,
        type: "circle",
        source: SEARCH_EARTH_SOURCE_ID,
        paint: {
          "circle-color": [
            "match",
            ["get", "kind"],
            "earthquake", "#f43f5e",
            "species", "#34d399",
            "aircraft", "#0ea5e9",
            "vessel", "#06b6d4",
            "satellite", "#8b5cf6",
            "device", "#eab308",
            "camera", "#f59e0b",
            "#f97316",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            ["case", ["==", ["get", "kind"], "earthquake"], 2.6, 2.2],
            5,
            ["case", ["==", ["get", "kind"], "earthquake"], 5.2, 4.4],
            10,
            ["case", ["==", ["get", "kind"], "earthquake"], 8, 6.5],
          ],
          "circle-opacity": 0.92,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 0.8,
        },
      })
    }
    if (!map.getLayer(SEARCH_EARTH_HIT_LAYER_ID)) {
      map.addLayer({
        id: SEARCH_EARTH_HIT_LAYER_ID,
        type: "circle",
        source: SEARCH_EARTH_SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 16, 5, 22, 10, 30],
          "circle-color": "#ffffff",
          "circle-opacity": 0,
        },
      })
    }
  }, [featureCollection])

  const handleMapLoad = useCallback((map: MapLibreMap) => {
    mapRef.current = map
    setMapInstance(map)
    if (typeof window !== "undefined") {
      ;(window as any).__search_earth_map = map
      ;(window as any).__search_earth_feature_count = searchFeatures.length
    }
    try {
      mountSearchLayers(map)
      map.resize()
    } catch {
      /* MapLibre style may still be settling during HMR. */
    }
  }, [mountSearchLayers, searchFeatures.length])

  useEffect(() => {
    const map = mapInstance
    if (!map) return
    if (typeof window !== "undefined") {
      ;(window as any).__search_earth_map = map
      ;(window as any).__search_earth_feature_count = searchFeatures.length
    }
    const update = () => {
      try {
        mountSearchLayers(map)
        ;(map.getSource(SEARCH_EARTH_SOURCE_ID) as GeoJSONSource | undefined)?.setData(featureCollection)
      } catch {
        /* Keep search usable if a dev-server style reload races the map. */
      }
    }
    if (map.isStyleLoaded()) update()
    else map.once("load", update)
  }, [featureCollection, mapInstance, mountSearchLayers])

  useEffect(() => {
    const map = mapInstance
    if (!map) return
    const selectFeature = (feature: any, lngLat?: { lng: number; lat: number }) => {
      if (!feature?.properties) {
        setSelectedFeature(null)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("search:earth-feature-selected", { detail: null }))
        }
        return
      }
      const properties = feature.properties as SearchEarthFeatureProperties
      setSelectedFeature(properties)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("search:earth-feature-selected", { detail: properties }))
      }
      if (lngLat) map.easeTo({ center: lngLat, duration: 350 })
    }
    const onLayerClick = (event: any) => {
      selectFeature(event.features?.[0], event.lngLat)
    }
    const onMapClick = (event: any) => {
      try {
        const layers = [SEARCH_EARTH_HIT_LAYER_ID, SEARCH_EARTH_DOT_LAYER_ID, SEARCH_EARTH_GLOW_LAYER_ID]
          .filter((id) => map.getLayer(id))
        const features = map.queryRenderedFeatures(event.point, { layers })
        selectFeature(features[0], event.lngLat)
      } catch {
        selectFeature(null)
      }
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer"
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ""
    }
    try {
      map.on("click", SEARCH_EARTH_HIT_LAYER_ID, onLayerClick)
      map.on("click", onMapClick)
      map.on("mouseenter", SEARCH_EARTH_HIT_LAYER_ID, onEnter)
      map.on("mouseleave", SEARCH_EARTH_HIT_LAYER_ID, onLeave)
    } catch {}
    return () => {
      try {
        map.off("click", SEARCH_EARTH_HIT_LAYER_ID, onLayerClick)
        map.off("click", onMapClick)
        map.off("mouseenter", SEARCH_EARTH_HIT_LAYER_ID, onEnter)
        map.off("mouseleave", SEARCH_EARTH_HIT_LAYER_ID, onLeave)
      } catch {}
    }
  }, [mapInstance])

  useEffect(() => {
    if (!focusedId) {
      setSelectedFeature(null)
      return
    }
    const feature = searchFeatures.find((candidate) => String(candidate.properties?.id ?? "") === focusedId)
    if (!feature?.properties) return
    setSelectedFeature(feature.properties)
    const [lng, lat] = feature.geometry.coordinates
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      mapInstance?.easeTo({ center: [lng, lat], zoom: Math.max(mapInstance.getZoom(), 8), duration: 350 })
    }
  }, [focusedId, mapInstance, searchFeatures])

  useEffect(() => {
    const map = mapInstance
    if (!map) return
    map.easeTo({
      center: [embeddedFocusTarget.lng, embeddedFocusTarget.lat],
      zoom: embeddedFocusTarget.zoom,
      duration: 650,
    })
  }, [embeddedFocusTarget.lat, embeddedFocusTarget.lng, embeddedFocusTarget.zoom, mapInstance])

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">Earth Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  if (isLoading || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Loading Earth Simulator...</p>
      </div>
    )
  }

  return (
    <div className="search-earth-dashboard-embed relative h-full min-h-[240px] overflow-hidden rounded-xl border border-emerald-500/20 bg-black">
      <SearchMap
        center={[embeddedFocusTarget.lng, embeddedFocusTarget.lat]}
        zoom={embeddedFocusTarget.zoom}
        projection={{ type: "globe" }}
        onLoad={handleMapLoad}
        onCreate={(map) => {
          mapRef.current = map
          setMapInstance(map)
        }}
        cooperativeGestures={false}
        dragRotate={false}
        pitchWithRotate={false}
        scrollZoom
        doubleClickZoom
      >
        <MapControls position="bottom-right" showCompass showZoom />
      </SearchMap>
      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
        <div className="font-semibold">Earth Simulator</div>
        <div className="text-white/70">
          {enabledLabels.length > 0 ? enabledLabels.join(" + ") : "Search-controlled Earth layers"}
          {focusTarget?.name ? ` over ${focusTarget.name}` : ""}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/80">
        <span className="rounded-full border border-white/10 bg-black/60 px-2 py-1 backdrop-blur">
          {searchFeatures.length.toLocaleString()} mapped
        </span>
        {enabledLayerIds.slice(0, 4).map((layerId) => (
          <span key={layerId} className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-emerald-100 backdrop-blur">
            {layerId}
          </span>
        ))}
      </div>
      {selectedFeature && (
        <div className="absolute right-3 top-3 z-30 w-[min(19rem,calc(100%-1.5rem))] rounded-xl border border-white/15 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200">{selectedFeature.kind}</div>
              <div className="mt-1 text-sm font-semibold leading-tight">{selectedFeature.title}</div>
            </div>
            <button
              type="button"
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              onClick={() => {
                setSelectedFeature(null)
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("search:earth-feature-selected", { detail: null }))
                }
              }}
            >
              Close
            </button>
          </div>
          {selectedFeature.detail && <p className="mt-2 text-xs leading-relaxed text-white/70">{selectedFeature.detail}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            {selectedFeature.magnitude != null && (
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-white/40">Magnitude</div>
                <div className="font-mono text-rose-200">M{Number(selectedFeature.magnitude).toFixed(1)}</div>
              </div>
            )}
            {selectedFeature.timestamp && (
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-white/40">Time</div>
                <div className="font-mono text-white/80">{new Date(selectedFeature.timestamp).toLocaleString()}</div>
              </div>
            )}
            {selectedFeature.source && (
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-white/40">Source</div>
                <div className="font-mono text-white/80">{selectedFeature.source}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {mounted && searchFeatures.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30 text-sm text-white/70">
          Waiting for search-matched Earth data...
        </div>
      )}
    </div>
  )
}

export default EarthWidget
