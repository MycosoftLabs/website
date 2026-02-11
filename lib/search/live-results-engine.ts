/**
 * Live Results Engine
 * 
 * Fetches live data based on search intent:
 * - iNaturalist observations for species
 * - Media results for movies/TV queries  
 * - News results for current events
 * - Location-based observations
 */

import type { SearchIntent } from "./intent-parser"

// =============================================================================
// TYPES
// =============================================================================

export interface LiveObservation {
  id: string
  species: string
  scientificName?: string
  location: string
  lat?: number
  lng?: number
  date: string
  photoUrl?: string
  quality: string
  isToxic?: boolean
  observerName?: string
  source: "inaturalist" | "mindex" | "gbif"
}

export interface LiveMedia {
  id: string
  title: string
  type: "movie" | "tv" | "documentary"
  year?: number
  rating?: number
  overview?: string
  posterUrl?: string
  fungiRelevance?: string
}

export interface LiveNews {
  id: string
  title: string
  source: string
  publishedAt: string
  url?: string
  imageUrl?: string
  summary?: string
}

export interface LiveResults {
  type: "observations" | "media" | "news" | "research" | "mixed"
  observations?: LiveObservation[]
  media?: LiveMedia[]
  news?: LiveNews[]
  source: string
  refreshedAt: string
}

// =============================================================================
// INATURALIST OBSERVATIONS
// =============================================================================

export async function fetchINaturalistObservations(
  taxonName: string,
  options?: {
    lat?: number
    lng?: number
    radius?: number // km
    limit?: number
  }
): Promise<LiveObservation[]> {
  const params = new URLSearchParams({
    taxon_name: taxonName,
    per_page: String(options?.limit || 10),
    order: "desc",
    order_by: "observed_on",
    quality_grade: "research,needs_id",
    photos: "true",
  })

  if (options?.lat && options?.lng) {
    params.set("lat", String(options.lat))
    params.set("lng", String(options.lng))
    params.set("radius", String(options?.radius || 200))
  }

  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?${params}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) return []

    const data = await res.json()
    return (data.results || []).map((obs: any) => ({
      id: String(obs.id),
      species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
      scientificName: obs.taxon?.name,
      location: obs.place_guess || "Unknown location",
      lat: obs.geojson?.coordinates?.[1],
      lng: obs.geojson?.coordinates?.[0],
      date: obs.observed_on || obs.created_at?.split("T")[0] || "",
      photoUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
      quality: obs.quality_grade || "needs_id",
      observerName: obs.user?.login,
      source: "inaturalist" as const,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch observations by location (no taxon filter)
 */
export async function fetchObservationsByLocation(
  lat: number,
  lng: number,
  radius: number = 50,
  limit: number = 20
): Promise<LiveObservation[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    per_page: String(limit),
    order: "desc",
    order_by: "observed_on",
    iconic_taxa: "Fungi",
    photos: "true",
  })

  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?${params}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) return []

    const data = await res.json()
    return (data.results || []).map((obs: any) => ({
      id: String(obs.id),
      species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
      scientificName: obs.taxon?.name,
      location: obs.place_guess || "Unknown location",
      lat: obs.geojson?.coordinates?.[1],
      lng: obs.geojson?.coordinates?.[0],
      date: obs.observed_on || obs.created_at?.split("T")[0] || "",
      photoUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
      quality: obs.quality_grade || "needs_id",
      observerName: obs.user?.login,
      source: "inaturalist" as const,
    }))
  } catch {
    return []
  }
}

// =============================================================================
// TOXICITY CHECKING
// =============================================================================

const KNOWN_TOXIC_GENERA = [
  "amanita", "galerina", "conocybe", "lepiota", "cortinarius",
  "gyromitra", "paxillus", "chlorophyllum", "omphalotus",
]

const KNOWN_PSYCHEDELIC_GENERA = [
  "psilocybe", "panaeolus", "gymnopilus", "pluteus", "inocybe",
]

export function checkToxicity(scientificName?: string): { isToxic: boolean; isPsychedelic: boolean } {
  if (!scientificName) return { isToxic: false, isPsychedelic: false }
  
  const lowerName = scientificName.toLowerCase()
  
  const isToxic = KNOWN_TOXIC_GENERA.some((genus) => lowerName.startsWith(genus))
  const isPsychedelic = KNOWN_PSYCHEDELIC_GENERA.some((genus) => lowerName.startsWith(genus))
  
  return { isToxic, isPsychedelic }
}

/**
 * Add toxicity info to observations
 */
export function enrichObservationsWithToxicity(
  observations: LiveObservation[]
): LiveObservation[] {
  return observations.map((obs) => {
    const { isToxic } = checkToxicity(obs.scientificName)
    return { ...obs, isToxic }
  })
}

// =============================================================================
// INTENT-BASED LIVE RESULTS
// =============================================================================

/**
 * Get live results based on parsed search intent
 */
export async function getLiveResultsByIntent(
  intent: SearchIntent,
  options?: {
    lat?: number
    lng?: number
    limit?: number
  }
): Promise<LiveResults> {
  const now = new Date().toISOString()

  // For location queries without specific taxa
  if (intent.type === "location" && options?.lat && options?.lng) {
    const observations = await fetchObservationsByLocation(
      options.lat,
      options.lng,
      intent.filters.location?.radius || 50,
      options?.limit || 20
    )
    
    const enriched = enrichObservationsWithToxicity(observations)
    
    // Filter by toxicity if specified
    let filtered = enriched
    if (intent.filters.toxicity === "poisonous" || intent.filters.toxicity === "toxic") {
      filtered = enriched.filter((o) => o.isToxic)
    } else if (intent.filters.toxicity === "edible") {
      filtered = enriched.filter((o) => !o.isToxic)
    }
    
    return {
      type: "observations",
      observations: filtered,
      source: "iNaturalist",
      refreshedAt: now,
    }
  }

  // For species queries
  if (intent.type === "species" && intent.entities.length > 0) {
    // Fetch observations for each entity
    const allObservations: LiveObservation[] = []
    
    for (const entity of intent.entities.slice(0, 3)) {
      const obs = await fetchINaturalistObservations(entity, {
        lat: options?.lat,
        lng: options?.lng,
        radius: intent.filters.location?.radius,
        limit: 5,
      })
      allObservations.push(...obs)
    }
    
    const enriched = enrichObservationsWithToxicity(allObservations)
    
    return {
      type: "observations",
      observations: enriched.slice(0, options?.limit || 10),
      source: "iNaturalist",
      refreshedAt: now,
    }
  }

  // For media queries - NOTE: TMDB/IMDB integration not yet implemented
  // Returns empty results with proper source attribution (no mock data)
  if (intent.type === "media") {
    // TODO: Integrate with TMDB API for real media results
    // For now, return empty to comply with no-mock-data policy
    return {
      type: "media",
      media: [], // No mock data - awaiting TMDB integration
      source: "pending_tmdb_integration",
      refreshedAt: now,
    }
  }

  // Default: try to fetch observations for any keywords
  if (intent.keywords.length > 0) {
    const observations = await fetchINaturalistObservations(intent.keywords[0], {
      lat: options?.lat,
      lng: options?.lng,
      limit: options?.limit || 10,
    })
    
    return {
      type: "observations",
      observations: enrichObservationsWithToxicity(observations),
      source: "iNaturalist",
      refreshedAt: now,
    }
  }

  return {
    type: "mixed",
    source: "none",
    refreshedAt: now,
  }
}

// =============================================================================
// REAL API INTEGRATIONS (no mock data)
// =============================================================================

/**
 * Fetch media results from TMDB API
 * TODO: Implement when TMDB API key is available
 * For now returns empty array to comply with no-mock-data policy
 */
export async function fetchMediaResults(query: string): Promise<LiveMedia[]> {
  // TMDB API integration pending - API key required
  // When implemented:
  // const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
  // const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}`)
  // return parseMediaResults(res)
  
  console.log(`[LiveResults] Media search for "${query}" - TMDB integration pending`)
  return [] // No mock data
}

/**
 * Fetch news results from news API
 * TODO: Implement when news API key is available (NewsAPI, GNews, etc.)
 * For now returns empty array to comply with no-mock-data policy
 */
export async function fetchNewsResults(query: string): Promise<LiveNews[]> {
  // News API integration pending - API key required
  // When implemented:
  // const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
  // const res = await fetch(`https://newsapi.org/v2/everything?q=${query}&apiKey=${NEWS_API_KEY}`)
  // return parseNewsResults(res)
  
  console.log(`[LiveResults] News search for "${query}" - News API integration pending`)
  return [] // No mock data
}
