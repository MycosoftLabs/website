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

  // For media queries - return placeholder (would integrate with TMDB/IMDB)
  if (intent.type === "media") {
    // In a real implementation, this would call TMDB or similar API
    return {
      type: "media",
      media: getPlaceholderMediaResults(intent.entities),
      source: "TMDB",
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
// PLACEHOLDER DATA (to be replaced with real API calls)
// =============================================================================

function getPlaceholderMediaResults(entities: string[]): LiveMedia[] {
  // This would be replaced with real TMDB/IMDB API calls
  const fungiMedia: LiveMedia[] = [
    {
      id: "1",
      title: "Fantastic Fungi",
      type: "documentary",
      year: 2019,
      rating: 8.1,
      overview: "Time-lapse photography reveals the magical, mysterious world of fungi.",
      posterUrl: undefined,
      fungiRelevance: "Full documentary about fungi and mycelium",
    },
    {
      id: "2",
      title: "Know Your Mushrooms",
      type: "documentary",
      year: 2008,
      rating: 7.2,
      overview: "Documentary about mushroom hunters and their passion for fungi.",
      posterUrl: undefined,
      fungiRelevance: "Follows mushroom hunting community",
    },
    {
      id: "3",
      title: "The Last of Us",
      type: "tv",
      year: 2023,
      rating: 8.8,
      overview: "Post-apocalyptic series featuring a fungal pandemic.",
      posterUrl: undefined,
      fungiRelevance: "Cordyceps-inspired zombie fungus central to plot",
    },
  ]
  
  return fungiMedia
}

/**
 * Get news placeholder - would integrate with real news API
 */
export function getPlaceholderNewsResults(): LiveNews[] {
  return [
    {
      id: "1",
      title: "New Psilocybin Research Shows Promise for Depression Treatment",
      source: "Nature",
      publishedAt: new Date().toISOString(),
      summary: "Latest clinical trials demonstrate significant improvements in treatment-resistant depression.",
    },
    {
      id: "2",
      title: "Mycelium-Based Materials Could Replace Plastic Packaging",
      source: "Science Daily",
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      summary: "Researchers develop sustainable packaging from fungal mycelium.",
    },
  ]
}
