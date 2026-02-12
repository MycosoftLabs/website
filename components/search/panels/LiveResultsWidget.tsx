/**
 * LiveResultsWidget - Feb 2026
 *
 * Top-right panel: Shows live, rotating data based on current search focus.
 * - Uses liveObservations from context (populated by FluidSearchCanvas)
 * - Auto-cycles between observations
 * - Uses browser geolocation for location services
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
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
} from "lucide-react"
import { useSearchContext } from "../SearchContextProvider"

const CYCLE_INTERVAL = 10000 // 10 seconds

export function LiveResultsWidget() {
  const { liveObservations, query, userLocation, setUserLocation } = useSearchContext()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [locationError, setLocationError] = useState<string | null>(null)

  const observations = liveObservations || []

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
    if (!userLocation) {
      requestLocation()
    }
  }, [userLocation, requestLocation])

  // Reset index when observations change
  useEffect(() => {
    setCurrentIndex(0)
  }, [observations.length])

  // Auto-cycle
  useEffect(() => {
    if (observations.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % observations.length)
    }, CYCLE_INTERVAL)
    return () => clearInterval(timer)
  }, [observations.length])

  const current = observations[currentIndex]
  const hasSearched = query && query.length > 0

  return (
    <div className="flex flex-col h-full max-h-[250px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Live Results</span>
        </div>
        {observations.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {observations.length} sightings
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        {!hasSearched && observations.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Leaf className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-[10px]">Search for a species to see live observations</p>
          </div>
        )}

        {hasSearched && observations.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <p>No recent observations found</p>
            {locationError && <p className="mt-1 text-[10px] text-amber-500">{locationError}</p>}
            {!userLocation && (
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={requestLocation}>
                <Locate className="h-3 w-3 mr-1" />
                Enable location for nearby results
              </Button>
            )}
          </div>
        )}

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
                <div className="relative w-full h-24 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={current.photoUrl}
                    alt={current.species}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-medium truncate">{current.species}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />
                  <span className="truncate">{current.location}</span>
                </div>
                {current.date && (
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {current.date}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {observations.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1 border-t">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurrentIndex((i) => (i - 1 + observations.length) % observations.length)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {currentIndex + 1}/{observations.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurrentIndex((i) => (i + 1) % observations.length)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
