/**
 * useSpeciesObservations - Feb 2026
 *
 * Fetches real field observation locations for any fungal species.
 *
 * Priority:
 *   1. MINDEX taxa-by-location (may be empty — data not yet populated)
 *   2. iNaturalist observations API (always has data for known species)
 *   3. Cache in module-level map so repeated calls for same species are instant
 *
 * Returns: { observations, loading, error }
 * Each observation matches the LocationResult interface used by ObservationEarthPortal.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import type { LocationResult } from "@/components/search/fluid/widgets/LocationWidget"

// Module-level cache so species observations persist across component re-mounts
const observationCache = new Map<string, LocationResult[]>()

const INAT_BASE = "https://api.inaturalist.org/v1"

interface UseSpeciesObservationsResult {
  observations: LocationResult[]
  loading: boolean
  error: string | null
}

export function useSpeciesObservations(
  speciesName: string | null | undefined,
  maxObs = 200  // default raised — fetch hundreds for rich map coverage
): UseSpeciesObservationsResult {
  const [observations, setObservations] = useState<LocationResult[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!speciesName?.trim()) { setObservations([]); return }
    const key = speciesName.toLowerCase().trim()

    // Serve from cache instantly
    if (observationCache.has(key)) {
      setObservations(observationCache.get(key)!)
      return
    }

    cancelRef.current = false
    setLoading(true)
    setError(null)
    setObservations([])

    const ctrl = new AbortController()

    const mapObs = (obs: any, name: string): LocationResult | null => {
      if (!obs.geojson?.coordinates) return null
      return {
        id:          String(obs.id),
        speciesName: obs.taxon?.name || name,
        commonName:  obs.taxon?.preferred_common_name || obs.taxon?.name || name,
        lat:         obs.geojson.coordinates[1] as number,
        lng:         obs.geojson.coordinates[0] as number,
        observedAt:  obs.observed_on || obs.created_at,
        imageUrl:    obs.photos?.[0]?.url?.replace("square", "medium") || undefined,
        observer:    obs.user?.login || obs.user?.name || undefined,
        isToxic:     undefined,
        distance:    undefined,
      }
    }

    const run = async () => {
      try {
        // iNaturalist supports max 200 per page, so paginate to get thousands
        const perPage  = Math.min(200, maxObs)
        const pages    = Math.ceil(maxObs / perPage)
        const allResults: LocationResult[] = []

        for (let page = 1; page <= pages; page++) {
          if (cancelRef.current) break

          const params = new URLSearchParams({
            taxon_name:    speciesName,
            "has[]":       "geo",
            per_page:      String(perPage),
            page:          String(page),
            order:         "desc",
            order_by:      "observed_on",
            quality_grade: "research,needs_id",
            photos:        "false", // don't require photos so we get more hits
          })

          const res = await fetch(`${INAT_BASE}/observations?${params}`, { signal: ctrl.signal })
          if (!res.ok) break
          const data = await res.json()
          const batch = (data.results || []).map((o: any) => mapObs(o, speciesName)).filter(Boolean) as LocationResult[]
          allResults.push(...batch)

          // If iNaturalist returned fewer than asked, no more pages
          if ((data.results || []).length < perPage) break

          // Push partial results while loading more
          if (!cancelRef.current) setObservations([...allResults])

          // Be polite to iNaturalist between pages
          if (page < pages) await new Promise(r => setTimeout(r, 350))
        }

        observationCache.set(key, allResults)
        if (!cancelRef.current) setObservations(allResults)
      } catch (e) {
        if (cancelRef.current || (e as Error).name === "AbortError") return
        setError((e as Error).message || "Failed to fetch observations")
      } finally {
        if (!cancelRef.current) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelRef.current = true
      ctrl.abort()
    }
  }, [speciesName, maxObs])

  return { observations, loading, error }
}
