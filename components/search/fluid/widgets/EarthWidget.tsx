"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, Loader2 } from "lucide-react"
import { classifyAndRoute } from "@/lib/search/search-intelligence-router"

const EarthSimulatorContainer = dynamic(
  () => import("@/components/earth-simulator/earth-simulator-container").then((mod) => mod.EarthSimulatorContainer),
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
  searchLocation?: { lat: number; lng: number; name?: string }
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
  const routeLocation = route?.intent.filters.location
  const simulatorLocation = searchLocation || (
    routeLocation?.lat && routeLocation?.lng
      ? {
          lat: routeLocation.lat,
          lng: routeLocation.lng,
          name: routeLocation.city || routeLocation.state || routeLocation.country || routeLocation.region,
        }
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
      const type = String(entity.type ?? entity.category ?? entity.entity_type ?? "").toLowerCase()
      if (enabledCategories.size === 0) return false
      if (type === "species") return enabledCategories.has("species")
      if (type === "event") return enabledCategories.has("event")
      if (type === "aircraft") return enabledCategories.has("aircraft")
      if (type === "vessel") return enabledCategories.has("vessel")
      if (type === "satellite") return enabledCategories.has("satellite")
      if (type === "device") return enabledCategories.has("device")
      return false
    }),
    [enabledCategories, normalizedLiveEntities]
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
  const focusTarget = simulatorLocation || entityFocus

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
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-xl border border-emerald-500/20 bg-black">
      <EarthSimulatorContainer
        variant="embedded"
        className="h-full min-h-[320px]"
        initialQuery={searchQuery}
        earthContextFilters={route?.earthContextFilters ?? null}
        hideSidePanels
        hideControls
        focusLocation={focusTarget ? { ...focusTarget, zoomMeters: isFocused ? 65000 : 110000 } : null}
        liveEntities={filteredEntities}
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
