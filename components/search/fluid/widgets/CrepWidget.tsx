/**
 * CrepWidget - CREP Fungal Observations
 * 
 * Displays real-time fungal observations from CREP data layer:
 * - MINDEX primary data
 * - iNaturalist fallback
 * - GBIF fallback
 * 
 * Shows observation count, recent sightings, and links to sources.
 */

"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
  Radar, 
  Eye, 
  MapPin, 
  Camera, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Loader2 
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CrepObservation {
  id: string
  species: string
  scientificName: string
  commonName?: string
  latitude: number
  longitude: number
  timestamp: string
  source: "MINDEX" | "iNaturalist" | "GBIF"
  verified: boolean
  observer?: string
  imageUrl?: string
  thumbnailUrl?: string
  location?: string
  sourceUrl?: string
  isToxic?: boolean
}

interface CrepWidgetProps {
  data: CrepObservation[]
  isLoading?: boolean
  isFocused?: boolean
  error?: string
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  onViewOnMap?: (observation: CrepObservation) => void
}

export function CrepWidget({
  data,
  isLoading = false,
  isFocused = false,
  error,
  onAddToNotepad,
  onViewOnMap,
}: CrepWidgetProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  // Group by source
  const sourceStats = useMemo(() => {
    const stats = {
      MINDEX: data.filter((o) => o.source === "MINDEX").length,
      iNaturalist: data.filter((o) => o.source === "iNaturalist").length,
      GBIF: data.filter((o) => o.source === "GBIF").length,
    }
    return stats
  }, [data])

  // Filter by selected source
  const filteredData = useMemo(() => {
    if (!selectedSource) return data
    return data.filter((o) => o.source === selectedSource)
  }, [data, selectedSource])

  // Recent observations (last 24h)
  const recentCount = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return data.filter((o) => new Date(o.timestamp).getTime() > oneDayAgo).length
  }, [data])

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">CREP Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  // Empty state
  if (!isLoading && (!data || data.length === 0)) {
    return (
      <div className="text-center py-8">
        <Radar className="h-12 w-12 mx-auto mb-3 text-cyan-500 opacity-60" />
        <p className="text-sm text-muted-foreground">
          No CREP observations available
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Search for species to see global sightings
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[150px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="text-sm text-muted-foreground">Loading CREP data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-hidden flex-1">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium">{data.length} observations</span>
          {recentCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
              {recentCount} recent
            </span>
          )}
        </div>
      </div>

      {/* Source filters */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs",
            !selectedSource && "bg-cyan-500/20 text-cyan-300"
          )}
          onClick={() => setSelectedSource(null)}
        >
          All
        </Button>
        {Object.entries(sourceStats).map(([source, count]) => (
          <Button
            key={source}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs",
              selectedSource === source && "bg-cyan-500/20 text-cyan-300"
            )}
            onClick={() => setSelectedSource(source)}
            disabled={count === 0}
          >
            {source} ({count})
          </Button>
        ))}
      </div>

      {/* Observations list */}
      <div className="space-y-2">
        {filteredData.slice(0, isFocused ? 15 : 4).map((obs, index) => (
          <motion.div
            key={obs.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              "bg-gradient-to-r from-cyan-500/10 to-blue-500/10",
              "border border-cyan-500/20 hover:border-cyan-500/40",
              "transition-all duration-300"
            )}
          >
            {/* Image */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
              {obs.imageUrl || obs.thumbnailUrl ? (
                <img
                  src={obs.thumbnailUrl || obs.imageUrl}
                  alt={obs.species}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {obs.commonName || obs.species}
                </span>
                {obs.verified && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{obs.location || "Unknown location"}</span>
                <span>•</span>
                <span>{new Date(obs.timestamp).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Source badge */}
            <div className={cn(
              "text-[10px] px-2 py-1 rounded-full shrink-0",
              obs.source === "MINDEX" && "bg-purple-500/20 text-purple-300",
              obs.source === "iNaturalist" && "bg-green-500/20 text-green-300",
              obs.source === "GBIF" && "bg-orange-500/20 text-orange-300"
            )}>
              {obs.source}
            </div>

            {/* Actions */}
            <div className="flex gap-1 shrink-0">
              {obs.sourceUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  asChild
                >
                  <a href={obs.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              {onViewOnMap && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onViewOnMap(obs)}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </Button>
              )}
              {onAddToNotepad && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAddToNotepad({
                    type: "crep",
                    title: obs.commonName || obs.species,
                    content: `${obs.scientificName} observed at ${obs.location || "Unknown"} on ${new Date(obs.timestamp).toLocaleDateString()}`,
                    source: `CREP/${obs.source}`,
                  })}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Show more indicator */}
      {!isFocused && filteredData.length > 4 && (
        <div className="flex items-center justify-center text-xs text-muted-foreground gap-1">
          <span>+{filteredData.length - 4} more observations</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  )
}

export default CrepWidget
