/**
 * Live Results Engine — Updated Mar 19, 2026
 *
 * Fetches live data based on search intent across ALL domains:
 * - iNaturalist observations for ALL species (not just fungi)
 * - Events (earthquakes, storms, volcanoes)
 * - Aircraft, vessels, satellites
 * - News and research
 * - Weather alerts
 *
 * Results are sorted: photo-attached first, then newest first.
 */

import type { SearchIntent } from "./intent-parser"
import type { LiveResultType } from "./search-intelligence-router"

// =============================================================================
// INATURALIST API RESPONSE TYPE
// =============================================================================

interface INatObservationResponse {
  id: number
  taxon?: {
    preferred_common_name?: string
    name?: string
    iconic_taxon_name?: string
  }
  place_guess?: string
  geojson?: {
    coordinates?: [number, number]
  }
  observed_on?: string
  created_at?: string
  photos?: Array<{ url?: string }>
  quality_grade?: string
  user?: { login?: string }
}

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

/** Unified live result item that can represent any type of live data */
export interface UnifiedLiveResult {
  id: string
  type: "observation" | "event" | "aircraft" | "vessel" | "news" | "research" | "weather"
  title: string
  subtitle?: string
  location?: string
  lat?: number
  lng?: number
  date: string
  photoUrl?: string
  url?: string
  source: string
  metadata?: Record<string, unknown>
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
  /** Unified results across all types — sorted by photo-first, then newest */
  unified?: UnifiedLiveResult[]
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
    return (data.results || []).map((obs: INatObservationResponse) => ({
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
 * Fetch observations by location for ALL species (not just fungi).
 * Returns observations across all kingdoms: animals, plants, fungi, etc.
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
    photos: "true",
    // No iconic_taxa filter — fetch ALL species across all kingdoms
  })

  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?${params}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) return []

    const data = await res.json()
    return (data.results || []).map((obs: INatObservationResponse) => ({
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
// UNIFIED LIVE RESULTS FETCHER
// =============================================================================

/**
 * Fetch live results across ALL domains based on search route.
 * This is the main entry point used by LiveResultsWidget.
 * Returns sorted results: photo-attached first, then newest first.
 */
export async function fetchUnifiedLiveResults(
  query: string,
  resultTypes: LiveResultType[],
  options?: {
    lat?: number
    lng?: number
    limit?: number
  }
): Promise<UnifiedLiveResult[]> {
  const results: UnifiedLiveResult[] = []
  const limit = options?.limit || 30

  // Launch all fetches in parallel
  const fetchers: Promise<void>[] = []

  // Observations (all species or specific)
  if (resultTypes.includes("all_species") || resultTypes.includes("specific_species")) {
    fetchers.push(
      (async () => {
        try {
          let observations: LiveObservation[]
          if (resultTypes.includes("specific_species") && query) {
            observations = await fetchINaturalistObservations(query, {
              lat: options?.lat,
              lng: options?.lng,
              limit: 15,
            })
          } else if (options?.lat && options?.lng) {
            observations = await fetchObservationsByLocation(
              options.lat,
              options.lng,
              100,
              15
            )
          } else {
            observations = await fetchINaturalistObservations(query || "life", {
              limit: 15,
            })
          }
          for (const obs of observations) {
            results.push({
              id: `obs-${obs.id}`,
              type: "observation",
              title: obs.species,
              subtitle: obs.scientificName,
              location: obs.location,
              lat: obs.lat,
              lng: obs.lng,
              date: obs.date,
              photoUrl: obs.photoUrl,
              source: "iNaturalist",
              metadata: { quality: obs.quality, observer: obs.observerName },
            })
          }
        } catch { /* silent */ }
      })()
    )
  }

  // Events (earthquakes, volcanoes, storms)
  if (resultTypes.includes("events")) {
    fetchers.push(
      (async () => {
        try {
          const res = await fetch(
            `/api/search/unified?q=${encodeURIComponent(query)}&types=events&limit=10`,
            { signal: AbortSignal.timeout(8000) }
          )
          if (res.ok) {
            const data = await res.json()
            const events = data?.results?.events || []
            for (const ev of events) {
              results.push({
                id: `event-${ev.id || Math.random().toString(36).slice(2)}`,
                type: "event",
                title: ev.title || ev.type || "Event",
                subtitle: ev.magnitude ? `Magnitude ${ev.magnitude}` : ev.severity,
                location: ev.location || ev.place,
                lat: ev.lat,
                lng: ev.lng,
                date: ev.timestamp || ev.date || new Date().toISOString(),
                photoUrl: ev.imageUrl,
                url: ev.url,
                source: ev.source || "EONET",
              })
            }
          }
        } catch { /* silent */ }
      })()
    )
  }

  // Aircraft
  if (resultTypes.includes("aircraft")) {
    fetchers.push(
      (async () => {
        try {
          const res = await fetch(
            `/api/search/unified?q=${encodeURIComponent(query)}&types=aircraft&limit=10`,
            { signal: AbortSignal.timeout(8000) }
          )
          if (res.ok) {
            const data = await res.json()
            const aircraft = data?.results?.aircraft || []
            for (const ac of aircraft) {
              results.push({
                id: `aircraft-${ac.id || ac.callsign || Math.random().toString(36).slice(2)}`,
                type: "aircraft",
                title: ac.callsign || ac.registration || "Aircraft",
                subtitle: `Alt: ${ac.altitude}ft • ${ac.speed}kts`,
                lat: ac.lat,
                lng: ac.lng,
                date: ac.timestamp || new Date().toISOString(),
                source: ac.source || "OpenSky",
              })
            }
          }
        } catch { /* silent */ }
      })()
    )
  }

  // Vessels
  if (resultTypes.includes("vessels")) {
    fetchers.push(
      (async () => {
        try {
          const res = await fetch(
            `/api/search/unified?q=${encodeURIComponent(query)}&types=vessels&limit=10`,
            { signal: AbortSignal.timeout(8000) }
          )
          if (res.ok) {
            const data = await res.json()
            const vessels = data?.results?.vessels || []
            for (const v of vessels) {
              results.push({
                id: `vessel-${v.id || v.mmsi || Math.random().toString(36).slice(2)}`,
                type: "vessel",
                title: v.name || v.callsign || "Vessel",
                subtitle: v.type || `MMSI: ${v.mmsi}`,
                lat: v.lat,
                lng: v.lng,
                date: v.timestamp || new Date().toISOString(),
                source: v.source || "AIS",
              })
            }
          }
        } catch { /* silent */ }
      })()
    )
  }

  // News
  if (resultTypes.includes("news")) {
    fetchers.push(
      (async () => {
        try {
          const res = await fetch(
            `/api/search/news?q=${encodeURIComponent(query)}&limit=10`,
            { signal: AbortSignal.timeout(8000) }
          )
          if (res.ok) {
            const data = await res.json()
            const newsItems = data?.results || []
            for (const item of newsItems) {
              results.push({
                id: `news-${item.id || Math.random().toString(36).slice(2)}`,
                type: "news",
                title: item.title,
                subtitle: item.source?.name || item.source,
                date: item.publishedAt || item.published_at || new Date().toISOString(),
                photoUrl: item.urlToImage || item.imageUrl || item.image_url,
                url: item.url,
                source: item.source?.name || item.source || "News",
              })
            }
          }
        } catch { /* silent */ }
      })()
    )
  }

  // Weather
  if (resultTypes.includes("weather")) {
    fetchers.push(
      (async () => {
        try {
          const res = await fetch(
            `/api/search/unified?q=${encodeURIComponent(query)}&types=weather&limit=5`,
            { signal: AbortSignal.timeout(8000) }
          )
          if (res.ok) {
            const data = await res.json()
            const weatherItems = data?.results?.weather || []
            for (const w of weatherItems) {
              results.push({
                id: `weather-${w.id || Math.random().toString(36).slice(2)}`,
                type: "weather",
                title: w.event || w.headline || "Weather Alert",
                subtitle: w.description?.slice(0, 100),
                location: w.areaDesc || w.location,
                lat: w.lat,
                lng: w.lng,
                date: w.effective || w.onset || new Date().toISOString(),
                source: w.senderName || "NWS",
              })
            }
          }
        } catch { /* silent */ }
      })()
    )
  }

  await Promise.allSettled(fetchers)

  // Sort: photo-attached results first, then newest first
  return sortLiveResults(results).slice(0, limit)
}

/**
 * Sort live results: photo-attached first, then newest first within each group.
 */
export function sortLiveResults(results: UnifiedLiveResult[]): UnifiedLiveResult[] {
  return [...results].sort((a, b) => {
    // Photo-attached results first
    const aHasPhoto = a.photoUrl ? 1 : 0
    const bHasPhoto = b.photoUrl ? 1 : 0
    if (aHasPhoto !== bHasPhoto) return bHasPhoto - aHasPhoto

    // Then newest first
    const aDate = new Date(a.date || 0).getTime()
    const bDate = new Date(b.date || 0).getTime()
    return bDate - aDate
  })
}

// =============================================================================
// REAL API INTEGRATIONS (no mock data)
// =============================================================================

/**
 * Fetch media results from TMDB API
 * TODO: Implement when TMDB API key is available
 */
export async function fetchMediaResults(query: string): Promise<LiveMedia[]> {
  console.log(`[LiveResults] Media search for "${query}" - TMDB integration pending`)
  return []
}

/**
 * Fetch news results from news API
 * TODO: Implement when news API key is available
 */
export async function fetchNewsResults(query: string): Promise<LiveNews[]> {
  console.log(`[LiveResults] News search for "${query}" - News API integration pending`)
  return []
}
