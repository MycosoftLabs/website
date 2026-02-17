/**
 * LocationWidget - Displays location-based search results
 * 
 * Shows:
 * - Map with nearby observations
 * - Species found in the area
 * - Toxicity warnings for the region
 * - iNaturalist recent sightings
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MapPin, Navigation, AlertTriangle, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export interface LocationResult {
  id: string
  speciesName: string
  commonName?: string
  lat: number
  lng: number
  observedAt?: string
  imageUrl?: string
  isToxic?: boolean
  observer?: string
  distance?: number // km from search location
}

interface LocationWidgetProps {
  data: LocationResult[]
  searchLocation?: { lat: number; lng: number; name?: string }
  isFocused?: boolean
  isLoading?: boolean
  error?: string
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  onRequestLocation?: () => void
}

function LocationLoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Location header skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Observation cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-2 border border-border/40 rounded-lg">
          <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LocationWidget({
  data,
  searchLocation,
  isFocused = false,
  isLoading = false,
  error,
  onAddToNotepad,
  onRequestLocation,
}: LocationWidgetProps) {
  if (isLoading) {
    return <LocationLoadingSkeleton />
  }
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported")
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationLoading(false)
        onRequestLocation?.()
      },
      (error) => {
        console.error("Location error:", error)
        setLocationLoading(false)
      }
    )
  }

  const displayLocation = searchLocation || userLocation

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">Location Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  // Empty state - request location
  if (!displayLocation && (!data || data.length === 0)) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 mx-auto mb-3 text-teal-500 opacity-60" />
        <p className="text-sm text-muted-foreground mb-3">
          Enable location to find fungi near you
        </p>
        <Button
          onClick={handleGetLocation}
          disabled={locationLoading}
          className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30"
        >
          {locationLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          Use My Location
        </Button>
      </div>
    )
  }

  // Separate toxic and safe species
  const toxicSpecies = data.filter((s) => s.isToxic)
  const safeSpecies = data.filter((s) => !s.isToxic)

  return (
    <div className="space-y-4 overflow-hidden flex-1">
      {/* Location header */}
      {displayLocation && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <MapPin className="h-4 w-4 text-teal-400" />
          <span className="text-sm text-teal-300">
            {searchLocation?.name || `${displayLocation.lat.toFixed(3)}, ${displayLocation.lng.toFixed(3)}`}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {data.length} observations nearby
          </span>
        </div>
      )}

      {/* Toxicity warning */}
      {toxicSpecies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
        >
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Toxic Species Alert</p>
            <p className="text-xs text-red-300/70 mt-1">
              {toxicSpecies.length} potentially toxic species found in this area:
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {toxicSpecies.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300"
                >
                  {s.commonName || s.speciesName}
                </span>
              ))}
              {toxicSpecies.length > 5 && (
                <span className="text-xs text-red-300/70">
                  +{toxicSpecies.length - 5} more
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Observations list */}
      <div className="space-y-2">
        {data.slice(0, isFocused ? 20 : 5).map((observation, index) => (
          <motion.div
            key={observation.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              "bg-gradient-to-r",
              observation.isToxic
                ? "from-red-500/10 to-orange-500/10 border-red-500/20"
                : "from-teal-500/10 to-cyan-500/10 border-teal-500/20",
              "border hover:border-teal-500/40 transition-all duration-300"
            )}
          >
            {/* Image */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
              {observation.imageUrl ? (
                <img
                  src={observation.imageUrl}
                  alt={observation.speciesName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">
                  🍄
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {observation.commonName || observation.speciesName}
                </span>
                {observation.isToxic && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300">
                    ⚠️ Toxic
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground italic truncate">
                {observation.speciesName}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {observation.distance !== undefined && (
                  <span>{observation.distance.toFixed(1)} km away</span>
                )}
                {observation.observedAt && (
                  <span>{new Date(observation.observedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onAddToNotepad?.({
                type: "location",
                title: observation.commonName || observation.speciesName,
                content: `Observed at ${observation.lat.toFixed(4)}, ${observation.lng.toFixed(4)}${observation.isToxic ? " (TOXIC)" : ""}`,
                source: "Location Search",
              })}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Load more indicator */}
      {!isFocused && data.length > 5 && (
        <p className="text-center text-xs text-muted-foreground">
          +{data.length - 5} more observations nearby
        </p>
      )}
    </div>
  )
}

export default LocationWidget
