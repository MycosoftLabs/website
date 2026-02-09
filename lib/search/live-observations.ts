/**
 * Live Observations - Feb 2026
 *
 * Fetches recent iNaturalist observations for a taxon near user coordinates.
 * Supports polling with caching.
 */

interface LiveObservation {
  id: string
  species: string
  scientificName: string
  location: string
  date: string
  photoUrl?: string
  lat?: number
  lng?: number
  quality: string
}

interface FetchOptions {
  taxonName: string
  lat?: number
  lng?: number
  radiusKm?: number
  limit?: number
}

const cache = new Map<string, { data: LiveObservation[]; timestamp: number }>()
const CACHE_TTL = 60000 // 60 seconds

export async function fetchLiveObservations(
  options: FetchOptions
): Promise<LiveObservation[]> {
  const { taxonName, lat, lng, radiusKm = 200, limit = 10 } = options
  const cacheKey = `${taxonName}:${lat}:${lng}:${radiusKm}`

  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const params = new URLSearchParams({
      taxon_name: taxonName,
      per_page: String(limit),
      order: "desc",
      order_by: "observed_on",
      quality_grade: "research,needs_id",
      photos: "true",
    })

    if (lat != null && lng != null) {
      params.set("lat", String(lat))
      params.set("lng", String(lng))
      params.set("radius", String(radiusKm))
    }

    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?${params}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!res.ok) return []

    const data = await res.json()
    const observations: LiveObservation[] = (data.results || []).map(
      (obs: any) => ({
        id: String(obs.id),
        species:
          obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
        scientificName: obs.taxon?.name || "",
        location: obs.place_guess || "Unknown location",
        date: obs.observed_on || obs.created_at?.split("T")[0] || "",
        photoUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
        lat: obs.geojson?.coordinates?.[1],
        lng: obs.geojson?.coordinates?.[0],
        quality: obs.quality_grade || "needs_id",
      })
    )

    cache.set(cacheKey, { data: observations, timestamp: Date.now() })
    return observations
  } catch {
    return []
  }
}

/** Clear the observation cache */
export function clearObservationCache(): void {
  cache.clear()
}
