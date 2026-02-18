/**
 * LocationWidget - Feb 2026
 *
 * Shows fungal observations with exact coordinates.
 * "View on Earth" opens the ObservationEarthPortal — a 3D globe zoomed to
 * the exact location with cross-widget links back to species/chemistry/genetics.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MapPin, Navigation, AlertTriangle, Globe, Loader2, Bookmark, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"

// Dynamically import the Earth portal (Cesium — client only, large bundle). Use default export to avoid ChunkLoadError.
const ObservationEarthPortal = dynamic(
  () => import("./ObservationEarthPortal"),
  { ssr: false }
)

const ITEMS_PER_PAGE = 5

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
  distance?: number
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
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [earthObs, setEarthObs] = useState<LocationResult | null>(null)

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
        onRequestLocation?.()
      },
      () => setLocationLoading(false)
    )
  }, [onRequestLocation])

  if (isLoading) return <LocationLoadingSkeleton />

  const displayLocation = searchLocation || userLocation
  const toxicSpecies = data.filter((s) => s.isToxic)
  const visibleItems = data.slice(0, visibleCount)
  const hasMore = data.length > visibleCount

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">Location Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  if (!displayLocation && (!data || data.length === 0)) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 mx-auto mb-3 text-teal-500 opacity-60" />
        <p className="text-sm text-muted-foreground mb-3">Enable location to find fungi near you</p>
        <Button
          onClick={handleGetLocation}
          disabled={locationLoading}
          className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30"
        >
          {locationLoading
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Navigation className="h-4 w-4 mr-2" />
          }
          Use My Location
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 overflow-hidden flex-1">
        {/* Location header */}
        {displayLocation && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <MapPin className="h-4 w-4 text-teal-400 shrink-0" />
            <span className="text-sm text-teal-300 truncate">
              {searchLocation?.name || `${displayLocation.lat.toFixed(3)}, ${displayLocation.lng.toFixed(3)}`}
            </span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {data.length} found
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
                {toxicSpecies.length} potentially toxic species in this area
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {toxicSpecies.slice(0, 4).map((s) => (
                  <span key={s.id} className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                    {s.commonName || s.speciesName}
                  </span>
                ))}
                {toxicSpecies.length > 4 && (
                  <span className="text-xs text-red-300/70">+{toxicSpecies.length - 4}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Observations list */}
        <div className="space-y-2">
          {visibleItems.map((obs, index) => (
            <motion.div
              key={obs.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                obs.isToxic
                  ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20 hover:border-red-500/40"
                  : "bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/20 hover:border-teal-500/40"
              )}
            >
              {/* Thumbnail */}
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                {obs.imageUrl ? (
                  <img src={obs.imageUrl} alt={obs.speciesName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">🍄</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {obs.commonName || obs.speciesName}
                  </span>
                  {obs.isToxic && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/30 text-red-300 shrink-0">⚠️</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground italic truncate">{obs.speciesName}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  {obs.distance !== undefined && <span>{obs.distance.toFixed(1)} km</span>}
                  {obs.observedAt && <span>{new Date(obs.observedAt).toLocaleDateString()}</span>}
                  {obs.observer && <span>by {obs.observer}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* View on Earth — the primary CTA */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 gap-1"
                  onClick={() => setEarthObs(obs)}
                  title="View on Earth"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Earth</span>
                </Button>
                {/* Save to notepad */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAddToNotepad?.({
                    type: "location",
                    title: obs.commonName || obs.speciesName,
                    content: `Observed at ${obs.lat.toFixed(4)}, ${obs.lng.toFixed(4)}${obs.isToxic ? " (TOXIC)" : ""}`,
                    source: "Location Search",
                  })}
                  title="Save"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Show {Math.min(ITEMS_PER_PAGE, data.length - visibleCount)} more ({data.length - visibleCount} remaining)
          </Button>
        )}
      </div>

      {/* Earth portal — pass all observations with clicked one first so map shows all pins, centered on clicked */}
      {earthObs && (
        <ObservationEarthPortal
          observation={earthObs}
          observations={[earthObs, ...data.filter((d) => d.id !== earthObs.id)]}
          onClose={() => setEarthObs(null)}
        />
      )}
    </>
  )
}

export default LocationWidget
