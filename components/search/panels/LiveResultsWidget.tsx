/**
 * LiveResultsWidget — Updated Mar 19, 2026
 *
 * Right panel: Shows live results across ALL domains:
 * - Species observations (all species via iNaturalist, not just fungi)
 * - Events (earthquakes, storms, volcanoes)
 * - Aircraft, vessels
 * - News with images and links
 * - Research
 *
 * Results prioritize: photo-attached first, newest first.
 * Auto-cycles between results with type-specific icons and styling.
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Locate,
  Globe,
  Leaf,
  Plane,
  Ship,
  Zap,
  Newspaper,
  CloudLightning,
  ExternalLink,
  List,
  Layers,
} from "lucide-react"
import { useSearchContext } from "../SearchContextProvider"

const CYCLE_INTERVAL = 8000 // 8 seconds

/** Unified result shape for the live panel */
interface LivePanelResult {
  id: string
  type: "observation" | "event" | "aircraft" | "vessel" | "news" | "research" | "weather"
  title: string
  subtitle?: string
  location?: string
  date: string
  photoUrl?: string
  url?: string
  source: string
}

function ResultTypeIcon({ type }: { type: LivePanelResult["type"] }) {
  switch (type) {
    case "observation": return <Leaf className="h-3 w-3 text-green-500" />
    case "event": return <Zap className="h-3 w-3 text-red-500" />
    case "aircraft": return <Plane className="h-3 w-3 text-sky-500" />
    case "vessel": return <Ship className="h-3 w-3 text-blue-500" />
    case "news": return <Newspaper className="h-3 w-3 text-amber-500" />
    case "research": return <Newspaper className="h-3 w-3 text-orange-500" />
    case "weather": return <CloudLightning className="h-3 w-3 text-cyan-500" />
    default: return <Globe className="h-3 w-3 text-muted-foreground" />
  }
}

function ResultTypeBadge({ type }: { type: LivePanelResult["type"] }) {
  const colors: Record<string, string> = {
    observation: "bg-green-500/20 text-green-400 border-green-500/30",
    event: "bg-red-500/20 text-red-400 border-red-500/30",
    aircraft: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    vessel: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    news: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    research: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    weather: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border ${colors[type] || "bg-muted"}`}>
      <ResultTypeIcon type={type} />
      {type}
    </span>
  )
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const days = Math.floor(hr / 24)
  if (sec < 60) return "Just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export function LiveResultsWidget() {
  const { liveObservations, query, userLocation, setUserLocation } = useSearchContext()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"carousel" | "list">("carousel")

  // Convert liveObservations to unified format (backwards compatible)
  const results: LivePanelResult[] = useMemo(() => {
    if (!liveObservations || liveObservations.length === 0) return []

    return liveObservations.map((obs) => {
      // Check if this is already a unified result (has type field from new engine)
      const meta = obs as Record<string, unknown>
      const type = (meta.type as LivePanelResult["type"]) || "observation"

      return {
        id: obs.id,
        type,
        title: (meta.title as string) || obs.species || "Unknown",
        subtitle: (meta.subtitle as string) || undefined,
        location: obs.location,
        date: obs.date || "",
        photoUrl: obs.photoUrl || (meta.photoUrl as string) || undefined,
        url: (meta.url as string) || undefined,
        source: (meta.source as string) || "iNaturalist",
      }
    }).sort((a, b) => {
      // Photo-attached first, then newest
      const aPhoto = a.photoUrl ? 1 : 0
      const bPhoto = b.photoUrl ? 1 : 0
      if (aPhoto !== bPhoto) return bPhoto - aPhoto
      const aDate = new Date(a.date || 0).getTime()
      const bDate = new Date(b.date || 0).getTime()
      return bDate - aDate
    })
  }, [liveObservations])

  // Type distribution for header badge
  const typeCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of results) {
      counts[r.type] = (counts[r.type] || 0) + 1
    }
    return counts
  }, [results])

  // Request geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationError(null)
      },
      () => {
        setLocationError("Location access denied")
      },
      { timeout: 10000 }
    )
  }, [setUserLocation])

  // Auto-request location on mount
  useEffect(() => {
    if (!userLocation) requestLocation()
  }, [userLocation, requestLocation])

  // Reset index when results change
  useEffect(() => {
    setCurrentIndex(0)
  }, [results.length])

  // Auto-cycle in carousel mode
  useEffect(() => {
    if (viewMode !== "carousel" || results.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % results.length)
    }, CYCLE_INTERVAL)
    return () => clearInterval(timer)
  }, [results.length, viewMode])

  const current = results[currentIndex]
  const hasSearched = query && query.length > 0

  return (
    <div className="flex flex-col h-full max-h-[350px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Live Results</span>
        </div>
        <div className="flex items-center gap-1">
          {results.length > 0 && (
            <>
              <Badge variant="outline" className="text-[10px]">
                {results.length} results
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setViewMode(viewMode === "carousel" ? "list" : "carousel")}
                title={viewMode === "carousel" ? "List view" : "Carousel view"}
              >
                {viewMode === "carousel" ? <List className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Type filter badges */}
      {results.length > 0 && Object.keys(typeCount).length > 1 && (
        <div className="flex gap-1 px-3 py-1 border-b border-white/5 overflow-x-auto scrollbar-hide">
          {Object.entries(typeCount).map(([type, count]) => (
            <span key={type} className="flex items-center gap-0.5 text-[9px] text-muted-foreground whitespace-nowrap">
              <ResultTypeIcon type={type as LivePanelResult["type"]} />
              {count}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!hasSearched && results.length === 0 && (
          <div className="text-center py-4 text-muted-foreground px-3">
            <Globe className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-[10px]">Search to see live observations, events, news & more</p>
          </div>
        )}

        {hasSearched && results.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs px-3">
            <p>No live results found</p>
            {locationError && <p className="mt-1 text-[10px] text-amber-500">{locationError}</p>}
            {!userLocation && (
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={requestLocation}>
                <Locate className="h-3 w-3 mr-1" />
                Enable location for nearby results
              </Button>
            )}
          </div>
        )}

        {/* Carousel View */}
        {viewMode === "carousel" && (
          <div className="px-3 py-2">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-2"
                >
                  {current.photoUrl && (
                    <div className="relative w-full h-28 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={current.photoUrl}
                        alt={current.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 360px"
                        className="object-cover"
                        unoptimized={current.photoUrl.includes("inaturalist")}
                      />
                      <div className="absolute top-1 left-1">
                        <ResultTypeBadge type={current.type} />
                      </div>
                    </div>
                  )}
                  {!current.photoUrl && (
                    <div className="flex items-center gap-1 mb-1">
                      <ResultTypeBadge type={current.type} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium truncate">{current.title}</p>
                    {current.subtitle && (
                      <p className="text-[10px] text-muted-foreground truncate">{current.subtitle}</p>
                    )}
                    {current.location && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{current.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-0.5">
                      {current.date && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          {formatTimeAgo(current.date)}
                        </div>
                      )}
                      {current.url && (
                        <a
                          href={current.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </a>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">{current.source}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && results.length > 0 && (
          <ScrollArea className="h-full">
            <div className="px-2 py-1 space-y-1">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-2 p-1.5 rounded-md bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
                  onClick={() => {
                    if (item.url) window.open(item.url, "_blank")
                  }}
                >
                  {item.photoUrl ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                      <Image
                        src={item.photoUrl}
                        alt={item.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized={item.photoUrl.includes("inaturalist")}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
                      <ResultTypeIcon type={item.type} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{item.title}</p>
                    {item.location && (
                      <p className="text-[9px] text-muted-foreground truncate">{item.location}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <ResultTypeBadge type={item.type} />
                      <span className="text-[9px] text-muted-foreground">{formatTimeAgo(item.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Navigation (carousel mode only) */}
      {viewMode === "carousel" && results.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1 border-t border-white/5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurrentIndex((i) => (i - 1 + results.length) % results.length)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {currentIndex + 1}/{results.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurrentIndex((i) => (i + 1) % results.length)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
