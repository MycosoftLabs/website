"use client"

/**
 * MapCard - Feb 2026
 * 
 * Compact mobile card displaying location/observation map.
 */

import { useState, useEffect } from "react"
import { MapPin, Bookmark, ChevronDown, ExternalLink, Navigation, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MapCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

export function MapCard({ data, onSave }: MapCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [mapUrl, setMapUrl] = useState<string | null>(null)

  const name = (data.name || data.locationName || "Location") as string
  const lat = data.latitude as number | undefined
  const lng = data.longitude as number | undefined
  const country = data.country as string | undefined
  const region = data.region as string | undefined
  const observationDate = data.observationDate as string | undefined
  const observer = data.observer as string | undefined
  const species = data.species as string | undefined

  // Generate static map URL (using OpenStreetMap)
  useEffect(() => {
    if (lat && lng) {
      const zoom = 12
      const size = "300x150"
      setMapUrl(`https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${lng},${lat}&z=${zoom}&l=map&size=${size}`)
    }
  }, [lat, lng])

  const formatCoords = () => {
    if (lat === undefined || lng === undefined) return null
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
  }

  const openInMaps = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
    }
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 p-3">
        <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5 text-emerald-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {[region, country].filter(Boolean).join(", ") || "Unknown location"}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {species && (
              <Badge variant="outline" className="text-[10px] h-5 italic">
                {species}
              </Badge>
            )}
            {observationDate && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(observationDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t">
          {/* Mini map preview */}
          {lat && lng && (
            <div 
              className="relative h-24 rounded-lg overflow-hidden bg-muted mt-2 cursor-pointer"
              onClick={openInMaps}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                <div className="text-center">
                  <MapPin className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                  <span className="text-[10px] text-muted-foreground">Tap to open in Maps</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs pt-1">
            <span className="text-muted-foreground">Coordinates: </span>
            <span className="font-mono">{formatCoords() || "Unknown"}</span>
          </div>

          {observer && (
            <div className="text-xs">
              <span className="text-muted-foreground">Observed by: </span>
              <span>{observer}</span>
            </div>
          )}

          {lat && lng && (
            <button
              onClick={openInMaps}
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              <Navigation className="h-3 w-3" />
              Open in Google Maps
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
