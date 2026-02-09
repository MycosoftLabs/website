/**
 * LiveResultsWidget - Feb 2026
 *
 * Top-right panel: Shows live, rotating data based on current search focus.
 * - iNaturalist observations near user
 * - Auto-cycles between data types
 * - Uses browser geolocation
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Locate,
  Loader2,
  Globe,
  Leaf,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchContext } from "../SearchContextProvider"

interface Observation {
  id: string
  species: string
  location: string
  date: string
  photoUrl?: string
  quality: string
}

const CYCLE_INTERVAL = 10000 // 10 seconds

export function LiveResultsWidget() {
  const { species, focusedSpeciesId, userLocation, setUserLocation } = useSearchContext()
  const [observations, setObservations] = useState<Observation[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Get the focused species or first species
  const focusedSpecies = focusedSpeciesId
    ? species.find((s) => s.id === focusedSpeciesId)
    : species[0]

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

  // Fetch observations when species or location changes
  useEffect(() => {
    if (!focusedSpecies) {
      setObservations([])
      return
    }

    const fetchObservations = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          taxon_name: focusedSpecies.scientificName || focusedSpecies.commonName,
          per_page: "10",
          order: "desc",
          order_by: "observed_on",
          quality_grade: "research,needs_id",
          photos: "true",
        })
        if (userLocation) {
          params.set("lat", String(userLocation.lat))
          params.set("lng", String(userLocation.lng))
          params.set("radius", "200") // 200km radius
        }

        const res = await fetch(
          `https://api.inaturalist.org/v1/observations?${params}`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (res.ok) {
          const data = await res.json()
          setObservations(
            (data.results || []).map((obs: any) => ({
              id: String(obs.id),
              species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
              location: obs.place_guess || "Unknown location",
              date: obs.observed_on || obs.created_at?.split("T")[0] || "",
              photoUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
              quality: obs.quality_grade || "needs_id",
            }))
          )
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchObservations()
    const interval = setInterval(fetchObservations, 60000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [focusedSpecies?.id, userLocation?.lat, userLocation?.lng])

  // Auto-cycle
  useEffect(() => {
    if (observations.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % observations.length)
    }, CYCLE_INTERVAL)
    return () => clearInterval(timer)
  }, [observations.length])

  const current = observations[currentIndex]

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
        {!focusedSpecies && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            <Leaf className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-[10px]">Search for a species to see live observations</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && focusedSpecies && observations.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <p>No recent observations found</p>
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
                  <img
                    src={current.photoUrl}
                    alt={current.species}
                    className="w-full h-full object-cover"
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
