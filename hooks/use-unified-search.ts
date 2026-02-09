/**
 * useUnifiedSearch Hook - Feb 2026
 * 
 * React hook for the unified search API with:
 * - SWR caching and revalidation
 * - Optimistic updates
 * - Type-safe results
 * - Loading and error states
 */

"use client"

import { useMemo, useCallback } from "react"
import useSWR from "swr"
import { useDebounce } from "@/hooks/use-debounce"
import { 
  unifiedSearch, 
  type UnifiedSearchResponse, 
  type SearchOptions,
  type SpeciesResult,
  type CompoundResult,
  type GeneticsResult,
  type ResearchResult,
} from "@/lib/search/unified-search-sdk"

// Re-export types for convenience
export type { 
  SpeciesResult, 
  CompoundResult, 
  GeneticsResult, 
  ResearchResult,
  UnifiedSearchResponse,
}

interface UseUnifiedSearchOptions extends SearchOptions {
  debounceMs?: number
  enabled?: boolean
}

interface UseUnifiedSearchResult {
  // Data
  results: UnifiedSearchResponse["results"]
  species: SpeciesResult[]
  compounds: CompoundResult[]
  genetics: GeneticsResult[]
  research: ResearchResult[]
  totalCount: number
  
  // AI
  aiAnswer?: UnifiedSearchResponse["aiAnswer"]
  
  // State
  isLoading: boolean
  isValidating: boolean
  error: string | null
  
  // Metadata
  timing: UnifiedSearchResponse["timing"]
  source: "live" | "cache" | "fallback"
  message?: string

  // Actions
  refresh: () => Promise<void>
  prefetch: (query: string) => void
}

// SWR fetcher using our SDK
const searchFetcher = async ([query, optionsJson]: [string, string]): Promise<UnifiedSearchResponse> => {
  const options = JSON.parse(optionsJson) as SearchOptions
  return unifiedSearch.search(query, options)
}

/**
 * Hook for unified search across MINDEX database
 */
export function useUnifiedSearch(
  query: string,
  options: UseUnifiedSearchOptions = {}
): UseUnifiedSearchResult {
  const {
    debounceMs = 300,
    enabled = true,
    types = ["species", "compounds", "genetics", "research"],
    limit = 20,
    includeAI = false,
  } = options

  // Debounce the query - ensure string type
  const debouncedQuery = useDebounce(query || "", debounceMs)
  const normalizedQuery = (debouncedQuery || "").trim()

  // Build SWR key
  const swrKey = useMemo(() => {
    if (!enabled || !normalizedQuery || normalizedQuery.length < 2) {
      return null
    }
    return [
      normalizedQuery,
      JSON.stringify({ types, limit, includeAI }),
    ] as [string, string]
  }, [enabled, normalizedQuery, types, limit, includeAI])

  // SWR with aggressive caching
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    searchFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10s deduplication
      focusThrottleInterval: 60000, // 1 minute
      errorRetryCount: 2,
      keepPreviousData: true,
    }
  )

  // Extract results with memoization
  const results = useMemo(() => {
    if (!data) {
      return {
        species: [],
        compounds: [],
        genetics: [],
        research: [],
      }
    }
    return data.results
  }, [data])

  const species = useMemo(() => results.species || [], [results.species])
  const compounds = useMemo(() => results.compounds || [], [results.compounds])
  const genetics = useMemo(() => results.genetics || [], [results.genetics])
  const research = useMemo(() => results.research || [], [results.research])
  const totalCount = data?.totalCount || 0
  const aiAnswer = data?.aiAnswer
  const timing = data?.timing || { total: 0, mindex: 0 }
  const source = data?.source || "cache"
  const message = data?.message

  // Actions
  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const prefetch = useCallback((prefetchQuery: string) => {
    unifiedSearch.prefetch(prefetchQuery, { types, limit, includeAI })
  }, [types, limit, includeAI])

  return {
    results,
    species,
    compounds,
    genetics,
    research,
    totalCount,
    aiAnswer,
    isLoading: isLoading && !data,
    isValidating,
    error: error?.message || data?.error || null,
    timing,
    source,
    message,
    refresh,
    prefetch,
  }
}

/**
 * Hook for species-only search (optimized)
 */
export function useSpeciesSearch(query: string, limit = 20) {
  return useUnifiedSearch(query, {
    types: ["species"],
    limit,
    includeAI: false,
    debounceMs: 200,
  })
}

/**
 * Hook for compound search (optimized)
 */
export function useCompoundSearch(query: string, limit = 20) {
  return useUnifiedSearch(query, {
    types: ["compounds"],
    limit,
    includeAI: false,
    debounceMs: 200,
  })
}

/**
 * Hook for AI-powered search with context
 */
export function useAISearch(query: string) {
  return useUnifiedSearch(query, {
    types: ["species", "compounds", "research"],
    limit: 10,
    includeAI: true,
    debounceMs: 500, // Longer debounce for AI queries
  })
}
