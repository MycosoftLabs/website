/**
 * MapWidget - Interactive map with observation locations
 * 
 * Displays fungi observations on a Leaflet map with:
 * - Cluster markers for dense areas
 * - Color-coded markers (toxic vs safe)
 * - Click to view observation details
 * - Integration with search results
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Map, MapPin, AlertTriangle, Maximize2, Minimize2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)
// Marker clustering for dense observation areas
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster").then((mod) => mod.default),
  { ssr: false }
)

export interface MapObservation {
  id: string
  speciesName: string
  commonName?: string
  lat: number
  lng: number
  observedAt?: string
  imageUrl?: string
  isToxic?: boolean
  observer?: string
}

interface MapWidgetProps {
  data: MapObservation[]
  searchLocation?: { lat: number; lng: number; name?: string }
  isFocused?: boolean
  error?: string
  isLoading?: boolean
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
}

export function MapWidget({
  data,
  searchLocation,
  isFocused = false,
  error,
  isLoading = false,
  onAddToNotepad,
}: MapWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedObservation, setSelectedObservation] = useState<MapObservation | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate map center and bounds
  const mapCenter = useMemo(() => {
    if (searchLocation) {
      return [searchLocation.lat, searchLocation.lng] as [number, number]
    }
    if (data.length > 0) {
      const avgLat = data.reduce((sum, obs) => sum + obs.lat, 0) / data.length
      const avgLng = data.reduce((sum, obs) => sum + obs.lng, 0) / data.length
      return [avgLat, avgLng] as [number, number]
    }
    return [40.7128, -74.0060] as [number, number] // Default: NYC
  }, [data, searchLocation])

  // Stats
  const toxicCount = data.filter((o) => o.isToxic).length
  const safeCount = data.length - toxicCount

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">Map Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Loading map data...</p>
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <Map className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-60" />
        <p className="text-sm text-muted-foreground">
          No location data available
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Search for species to see observation locations
        </p>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const mapHeight = isFocused || isExpanded ? "h-[400px]" : "h-[200px]"

  return (
    <div className={cn("space-y-3", isFocused && "")}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <MapPin className="h-3.5 w-3.5" />
            {safeCount} observations
          </span>
          {toxicCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {toxicCount} toxic
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Map container */}
      <motion.div
        className={cn(
          "rounded-xl overflow-hidden border border-emerald-500/20 bg-black/20",
          mapHeight,
          "transition-all duration-300"
        )}
        layout
      >
        <MapContainer
          center={mapCenter}
          zoom={8}
          className="h-full w-full"
          scrollWheelZoom={isFocused || isExpanded}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup
            chunkedLoading
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            maxClusterRadius={50}
            disableClusteringAtZoom={15}
          >
            {data.map((observation) => (
              <Marker
                key={observation.id}
                position={[observation.lat, observation.lng]}
                eventHandlers={{
                  click: () => setSelectedObservation(observation),
                }}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <p className="font-semibold text-sm">
                      {observation.commonName || observation.speciesName}
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      {observation.speciesName}
                    </p>
                    {observation.isToxic && (
                      <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                        ⚠️ Toxic
                      </span>
                    )}
                    {observation.observedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Observed: {new Date(observation.observedAt).toLocaleDateString()}
                      </p>
                    )}
                    {onAddToNotepad && (
                      <button
                        onClick={() => onAddToNotepad({
                          type: "map",
                          title: observation.commonName || observation.speciesName,
                          content: `Location: ${observation.lat.toFixed(4)}, ${observation.lng.toFixed(4)}`,
                          source: "Map",
                        })}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        + Add to notepad
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </motion.div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          Safe species
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Toxic species
        </span>
      </div>
    </div>
  )
}

export default MapWidget
