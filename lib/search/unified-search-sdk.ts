/**
 * Unified Search SDK - Feb 2026
 * 
 * High-performance client for the unified search API
 * Features:
 * - Request deduplication
 * - Intelligent prefetching
 * - Response caching with TTL
 * - Streaming response support preparation
 */

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

export interface UnifiedSearchResponse {
  query: string
  results: {
    species: SpeciesResult[]
    compounds: CompoundResult[]
    genetics: GeneticsResult[]
    research: ResearchResult[]
  }
  totalCount: number
  timing: {
    total: number
    mindex: number
    ai?: number
  }
  source: "live" | "cache" | "fallback"
  message?: string
  aiAnswer?: {
    text: string
    confidence: number
    sources: string[]
  }
  error?: string
}

export interface SearchOptions {
  types?: ("species" | "compounds" | "genetics" | "research")[]
  limit?: number
  includeAI?: boolean
  signal?: AbortSignal
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
      types = ["species", "compounds", "genetics", "research"],
      limit = 20,
      includeAI = false,
      signal,
    } = options

    // Normalize query
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return {
        query: "",
        results: { species: [], compounds: [], genetics: [], research: [] },
        totalCount: 0,
        timing: { total: 0, mindex: 0 },
        source: "cache",
      }
    }

    // Build cache key
    const cacheKey = `${normalizedQuery}:${types.sort().join(",")}:${limit}:${includeAI}`

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

    // Build URL
    const params = new URLSearchParams({
      q: normalizedQuery,
      types: types.join(","),
      limit: limit.toString(),
    })
    if (includeAI) {
      params.set("ai", "true")
    }

    // Execute request
    const requestPromise = this.executeRequest(
      `${this.baseUrl}?${params.toString()}`,
      signal,
      cacheKey
    )

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
        signal: signal || AbortSignal.timeout(15000),
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
          results: { species: [], compounds: [], genetics: [], research: [] },
          totalCount: 0,
          timing: { total: performance.now() - startTime, mindex: 0 },
          source: "cache",
          error: "Search timed out. Try again or check your connection.",
        }
      }

      console.error("Unified search error:", error)
      return {
        query: "",
        results: { species: [], compounds: [], genetics: [], research: [] },
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
 * Prefetch common/popular searches on app load
 */
export function prefetchPopularSearches(): void {
  const popularQueries = [
    "psilocybe",
    "agaricus",
    "amanita",
    "ganoderma",
    "cordyceps",
    "lion's mane",
    "reishi",
    "turkey tail",
    "shiitake",
    "chanterelle",
  ]

  // Stagger prefetches to avoid overwhelming the server
  popularQueries.forEach((query, index) => {
    setTimeout(() => {
      unifiedSearch.prefetch(query, { limit: 10 })
    }, index * 500) // 500ms between each prefetch
  })
}
