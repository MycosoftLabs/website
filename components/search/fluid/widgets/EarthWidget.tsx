"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, Loader2 } from "lucide-react"
import { classifyAndRoute } from "@/lib/search/search-intelligence-router"
import { resolveEarthSearchRule } from "@/lib/search/earth-search-rules"

const SearchEarthDashboard = dynamic(
  () => import("@/app/dashboard/crep/CREPDashboardEmbedded"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[460px] items-center justify-center bg-black text-white">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-400" />
        Loading Earth Simulator...
      </div>
    ),
  }
)

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

export function EarthWidget({
  data = [],
  eventsData = [],
  searchLocation,
  userLocation,
  searchQuery = "",
  liveEntities = [],
  isFocused = false,
  error,
  isLoading = false,
}: EarthWidgetProps) {
  const [mounted, setMounted] = useState(false)

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
    <div className="search-earth-dashboard-embed relative h-full min-h-[320px] overflow-hidden rounded-xl border border-emerald-500/20 bg-black">
      <SearchEarthDashboard
        embedded
        initialQuery={searchQuery}
        enabledLayerIds={enabledLayerIds}
        focusLocation={embeddedFocusTarget}
        focusAsset={trackedFocusAsset}
      />
      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
        <div className="font-semibold">Earth Simulator</div>
        <div className="text-white/70">
          {enabledLabels.length > 0 ? enabledLabels.join(" + ") : "Search-controlled Earth layers"}
          {focusTarget?.name ? ` over ${focusTarget.name}` : ""}
        </div>
      </div>
    </div>
  )
}

export default EarthWidget
