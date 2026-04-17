/**
 * Unified Search SDK - Feb 2026
 * 
 * High-performance client for the unified search API
 * Features:
 * - Request deduplication
 * - Intelligent prefetching
 * - Response caching with TTL
 * - Streaming response support preparation
 * - Optional `fluidContext` → POST /api/search/unified (Apr 17, 2026)
 */

import type { FluidSearchContext } from "./fluid-search-context"

export interface SpeciesResult {
  id: string
  scientificName: string
  commonName: string
  taxonomy: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
  }
  description: string
  photos: Array<{
    id: string
    url: string
    medium_url: string
    large_url: string
    attribution: string
  }>
  observationCount: number
  rank: string
}

export interface CompoundResult {
  id: string
  name: string
  formula: string
  molecularWeight: number
  chemicalClass: string
  sourceSpecies: string[]
  biologicalActivity: string[]
  structure?: string
}

/** Matches unified API response: id, accession, speciesName, geneRegion, sequenceLength, gcContent, source */
export interface GeneticsResult {
  id: string
  accession: string
  speciesName: string
  geneRegion: string
  sequenceLength: number
  gcContent?: number
  source: string
}

export interface ResearchResult {
  id: string
  title: string
  authors: string[]
  journal: string
  year: number
  doi: string
  abstract: string
  relatedSpecies: string[]
}

export interface LiveResult {
  id: string
  species: string
  location: string
  date: string
  imageUrl?: string
  lat?: number
  lng?: number
}

// ---------------------------------------------------------------------------
// Earth Intelligence result types — all domains beyond biology
// ---------------------------------------------------------------------------

export interface EventResult {
  id: string
  type: "earthquake" | "volcano" | "wildfire" | "storm" | "flood" | "lightning" | "tornado" | "tsunami" | "dust_haze"
  title: string
  description: string
  lat: number
  lng: number
  magnitude?: number
  severity?: string
  timestamp: string
  source: string
}

export interface AircraftResult {
  id: string
  callsign: string
  icao24: string
  origin: string
  destination?: string
  lat: number
  lng: number
  altitude: number
  velocity: number
  heading: number
  onGround: boolean
  source: string
}

export interface VesselResult {
  id: string
  name: string
  mmsi: string
  shipType: string
  lat: number
  lng: number
  speed: number
  heading: number
  destination?: string
  source: string
}

export interface SatelliteResult {
  id: string
  name: string
  noradId: string
  category: string
  lat: number
  lng: number
  altitude: number
  velocity?: number
  source: string
}

export interface WeatherResult {
  id: string
  type: "forecast" | "alert" | "observation" | "radar" | "satellite_imagery"
  title: string
  description: string
  lat?: number
  lng?: number
  temperature?: number
  windSpeed?: number
  humidity?: number
  precipitation?: number
  pressure?: number
  timestamp: string
  source: string
}

export interface EmissionsResult {
  id: string
  type: "co2" | "methane" | "air_quality" | "pollution_source"
  title: string
  description: string
  lat: number
  lng: number
  value?: number
  unit?: string
  parameter?: string
  sourceType?: string
  timestamp: string
  source: string
}

export interface InfrastructureResult {
  id: string
  type: "power_plant" | "factory" | "dam" | "mining" | "oil_gas" | "treatment_plant"
    | "airport" | "seaport" | "spaceport" | "railway" | "antenna" | "cable" | "military_base"
  name: string
  description?: string
  lat: number
  lng: number
  operator?: string
  source: string
}

export interface DeviceResult {
  id: string
  deviceType: string
  name: string
  lat?: number
  lng?: number
  temperature?: number
  humidity?: number
  airQuality?: number
  sporeCount?: number
  lastSeen: string
  status: string
  source: string
}

export interface SpaceWeatherResult {
  id: string
  type: "solar_flare" | "geomagnetic_storm" | "solar_wind" | "radiation_belt" | "cme"
  title: string
  description: string
  severity?: string
  kpIndex?: number
  flareClass?: string
  solarWindSpeed?: number
  timestamp: string
  source: string
}

export interface CameraResult {
  id: string
  title: string
  location: string
  lat: number
  lng: number
  streamUrl?: string
  imageUrl?: string
  type: "cctv" | "webcam" | "traffic" | "satellite"
  status: "live" | "offline"
  source: string
}


/** All result bucket key names */
export type ResultBucketKey =
  | "species" | "compounds" | "genetics" | "research"
  | "events" | "aircraft" | "vessels" | "satellites"
  | "weather" | "emissions" | "infrastructure" | "devices"
  | "space_weather" | "cameras"

export interface UnifiedSearchResults {
  species: SpeciesResult[]
  compounds: CompoundResult[]
  genetics: GeneticsResult[]
  research: ResearchResult[]
  events: EventResult[]
  aircraft: AircraftResult[]
  vessels: VesselResult[]
  satellites: SatelliteResult[]
  weather: WeatherResult[]
  emissions: EmissionsResult[]
  infrastructure: InfrastructureResult[]
  devices: DeviceResult[]
  space_weather: SpaceWeatherResult[]
  cameras: CameraResult[]
}

export interface UnifiedSearchResponse {
  query: string
  results: UnifiedSearchResults
  totalCount: number
  timing: {
    total: number
    mindex: number
    inaturalist?: number
    crossref?: number
    ai?: number
    earth?: number
  }
  source: "live" | "cache" | "fallback"
  message?: string
  aiAnswer?: string
  live_results?: LiveResult[]
  error?: string
}

export const EMPTY_RESULTS: UnifiedSearchResponse = {
  query: "",
  results: {
    species: [],
    compounds: [],
    genetics: [],
    research: [],
    events: [],
    aircraft: [],
    vessels: [],
    satellites: [],
    weather: [],
    emissions: [],
    infrastructure: [],
    devices: [],
    space_weather: [],
    cameras: [],
  },
  totalCount: 0,
  timing: { total: 0, mindex: 0 },
  source: "cache",
}

export interface SearchOptions {
  types?: ResultBucketKey[]
  limit?: number
  includeAI?: boolean
  signal?: AbortSignal
  lat?: number
  lng?: number
  /** When set, uses POST so search route + MYCA threading reach MAS without huge URLs */
  fluidContext?: FluidSearchContext
}

// In-flight request deduplication
const inflightRequests = new Map<string, Promise<UnifiedSearchResponse>>()

// Local response cache
const localCache = new Map<string, { data: UnifiedSearchResponse; timestamp: number }>()
const LOCAL_CACHE_TTL = 60000 // 1 minute local cache

/**
 * Unified Search Client
 */
export class UnifiedSearchClient {
  private baseUrl: string

  constructor(baseUrl = "/api/search/unified") {
    this.baseUrl = baseUrl
  }

  /**
   * Execute a unified search query
   */
  async search(query: string, options: SearchOptions = {}): Promise<UnifiedSearchResponse> {
    const {
      types = ["species", "compounds", "genetics", "research", "events", "aircraft", "vessels", "satellites", "weather", "emissions", "infrastructure", "devices", "space_weather"],
      limit = 20,
      includeAI = false,
      signal,
      fluidContext,
    } = options

    // Normalize query
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return {
        query: "",
        results: { ...EMPTY_RESULTS.results },
        totalCount: 0,
        timing: { total: 0, mindex: 0 },
        source: "cache",
      }
    }

    // Build cache key — include serialized fluid context so distinct routes do not collide
    const fluidKey = fluidContext
      ? JSON.stringify(fluidContext)
      : ""
    const cacheKey = `${normalizedQuery}:${types.sort().join(",")}:${limit}:${includeAI}:${fluidKey}`

    // Check local cache first (ultra-fast)
    const cached = localCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < LOCAL_CACHE_TTL) {
      return { ...cached.data, source: "cache" }
    }

    // Check for in-flight request (deduplication)
    const inflight = inflightRequests.get(cacheKey)
    if (inflight) {
      return inflight
    }

    // Execute request — POST when fluid routing / threading is present
    const requestPromise = fluidContext
      ? this.executePostRequest(
          normalizedQuery,
          types,
          limit,
          includeAI,
          options.lat,
          options.lng,
          fluidContext,
          signal
        )
      : (() => {
          const params = new URLSearchParams({
            q: normalizedQuery,
            types: types.join(","),
            limit: limit.toString(),
          })
          if (includeAI) params.set("ai", "true")
          if (options.lat !== undefined && options.lng !== undefined) {
            params.set("lat", options.lat.toString())
            params.set("lng", options.lng.toString())
          }
          return this.executeRequest(`${this.baseUrl}?${params.toString()}`, signal, cacheKey)
        })()

    // Store as in-flight
    inflightRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      // Cache successful result
      if (!result.error) {
        localCache.set(cacheKey, { data: result, timestamp: Date.now() })
      }
      return result
    } finally {
      // Remove from in-flight after completion
      inflightRequests.delete(cacheKey)
    }
  }

  private async executePostRequest(
    q: string,
    types: ResultBucketKey[],
    limit: number,
    includeAI: boolean,
    lat: number | undefined,
    lng: number | undefined,
    fluidContext: FluidSearchContext,
    signal?: AbortSignal
  ): Promise<UnifiedSearchResponse> {
    const startTime = performance.now()
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q,
          types: types.join(","),
          limit,
          ai: includeAI,
          ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
          fluidContext,
        }),
        signal: signal || AbortSignal.timeout(45000),
      })
      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`)
      }
      const data = await response.json()
      return {
        ...data,
        timing: {
          ...data.timing,
          clientRoundTrip: performance.now() - startTime,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          query: "",
          results: { ...EMPTY_RESULTS.results },
          totalCount: 0,
          timing: { total: performance.now() - startTime, mindex: 0 },
          source: "cache",
          error: "Search timed out. Try again or check your connection.",
        }
      }
      console.error("Unified search error:", error)
      return {
        query: "",
        results: { ...EMPTY_RESULTS.results },
        totalCount: 0,
        timing: { total: performance.now() - startTime, mindex: 0 },
        source: "cache",
        error: error instanceof Error ? error.message : "Search failed",
      }
    }
  }

  private async executeRequest(
    url: string,
    signal?: AbortSignal,
    _cacheKey?: string
  ): Promise<UnifiedSearchResponse> {
    const startTime = performance.now()

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: signal || AbortSignal.timeout(45000),
      })

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Add client-side timing for transparency
      return {
        ...data,
        timing: {
          ...data.timing,
          clientRoundTrip: performance.now() - startTime,
        },
      }
    } catch (error) {
      // Timeout/abort: return error response so UI shows message instead of throwing
      if (error instanceof Error && error.name === "AbortError") {
        return {
          query: "",
          results: { ...EMPTY_RESULTS.results },
          totalCount: 0,
          timing: { total: performance.now() - startTime, mindex: 0 },
          source: "cache",
          error: "Search timed out. Try again or check your connection.",
        }
      }

      console.error("Unified search error:", error)
      return {
        query: "",
        results: { ...EMPTY_RESULTS.results },
        totalCount: 0,
        timing: { total: performance.now() - startTime, mindex: 0 },
        source: "cache",
        error: error instanceof Error ? error.message : "Search failed",
      }
    }
  }

  /**
   * Prefetch search results for a query (non-blocking)
   */
  prefetch(query: string, options: SearchOptions = {}): void {
    // Fire and forget - populate cache
    this.search(query, options).catch(() => {
      // Ignore prefetch errors
    })
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    localCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: localCache.size,
      keys: Array.from(localCache.keys()),
    }
  }
}

// Singleton instance
export const unifiedSearch = new UnifiedSearchClient()

/**
 * Prefetch common/popular searches on app load.
 * Balanced across biodiversity (including fungi), weather, and worldview intent —
 * does not seed mushroom-only as the default user intent.
 */
export function prefetchPopularSearches(): void {
  const popularQueries = [
    // Biodiversity (fungi remain a first-class domain)
    "reishi",
    "chanterelle",
    "amanita",
    // Biodiversity (all-life)
    "birds",
    "oak",
    "butterfly",
    // Worldview / operational
    "weather",
    "flights over pacific",
    "satellites",
  ]

  // Stagger prefetches to avoid overwhelming the server
  popularQueries.forEach((query, index) => {
    setTimeout(() => {
      unifiedSearch.prefetch(query, { limit: 10 })
    }, index * 500) // 500ms between each prefetch
  })
}
