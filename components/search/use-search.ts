"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import useSWR from "swr"
import { useDebounce } from "@/hooks/use-debounce"
import type { SearchResult } from "@/types/search"

interface SearchSuggestion {
  id: string
  title: string
  type: "fungi" | "article" | "compound" | "research"
  scientificName?: string
  url: string
  date?: string
}

// SWR fetcher with error handling
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const error = new Error(errorData.error || `Request failed with status: ${res.status}`) as Error & { status: number }
    error.status = res.status
    throw error
  }
  
  return res.json()
}

// SWR configuration for search - aggressive caching for speed
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5000, // 5 second deduplication
  focusThrottleInterval: 30000,
  errorRetryCount: 2,
  keepPreviousData: true, // Show stale data while revalidating
}

export function useSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounce(query || "", 300)
  
  // Only fetch when query has minimum length - ensure string type
  const safeQuery = (debouncedQuery || "").trim()
  const shouldFetchSuggestions = safeQuery.length >= 2
  const suggestionsKey = shouldFetchSuggestions 
    ? `/api/search/suggestions?q=${encodeURIComponent(safeQuery)}`
    : null

  // SWR for suggestions with caching
  const { 
    data: suggestionsData, 
    error: suggestionsError, 
    isLoading: suggestionsLoading,
    isValidating: suggestionsValidating,
  } = useSWR(
    suggestionsKey,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 10000, // 10s cache for suggestions
    }
  )

  // Memoized suggestions with validation
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (!suggestionsData?.suggestions || !Array.isArray(suggestionsData.suggestions)) {
      return []
    }
    return suggestionsData.suggestions.filter((suggestion: any) => {
      if (!suggestion?.id || !suggestion?.title || !suggestion?.type || !suggestion?.url) {
        return false
      }
      return true
    })
  }, [suggestionsData])

  // Formatted error message
  const error = useMemo<string | null>(() => {
    if (!suggestionsError) return null
    
    if (suggestionsError instanceof Error) {
      const statusError = suggestionsError as Error & { status?: number }
      switch (statusError.status) {
        case 404:
          return "No results found"
        case 429:
          return "Too many requests. Please try again later."
        case 500:
          return "Server error. Please try again later."
        default:
          return suggestionsError.message || "An unexpected error occurred"
      }
    }
    return "An unexpected error occurred"
  }, [suggestionsError])

  // Combined loading state - true only for initial load, not revalidation
  const isLoading = suggestionsLoading && !suggestionsData

  // Legacy fetchSuggestions for backward compatibility
  const fetchSuggestions = useCallback(
    async (searchQuery: string, controller?: AbortController) => {
      // This is now a no-op as SWR handles fetching
      // Kept for backward compatibility with existing component calls
      if (searchQuery !== query) {
        setQuery(searchQuery)
      }
    },
    [query],
  )

  // Results hook using SWR (for full search page)
  const useResults = useCallback((searchQuery: string) => {
    const shouldFetch = searchQuery.trim().length >= 2
    const key = shouldFetch 
      ? `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
      : null

    const { data, error: fetchError, isLoading: loading } = useSWR(key, fetcher, swrConfig)

    const results = useMemo<SearchResult[]>(() => {
      if (!data?.results || !Array.isArray(data.results)) return []
      return data.results.filter((result: any) => (
        result?.id && result?.title && result?.type && result?.url
      ))
    }, [data])

    return { results, error: fetchError?.message, isLoading: loading }
  }, [])

  // Legacy fetchResults for backward compatibility
  const fetchResults = useCallback(
    async (searchQuery: string, controller?: AbortController) => {
      // This is now a no-op as SWR handles fetching
      // Kept for backward compatibility
      if (searchQuery !== query) {
        setQuery(searchQuery)
      }
    },
    [query],
  )

  return {
    query,
    setQuery,
    debouncedQuery,
    results: [] as SearchResult[], // Empty - use useResults for full search
    suggestions,
    isLoading,
    isValidating: suggestionsValidating,
    error,
    fetchResults,
    fetchSuggestions,
    useResults, // New hook for full search page
  }
}

/**
 * Dedicated hook for full search results with SWR caching
 * Use this on the search results page for better caching
 */
export function useSearchResults(query: string) {
  const debouncedQuery = useDebounce(query || "", 200)
  // Ensure string type for safety
  const safeQuery = (debouncedQuery || "").trim()
  const shouldFetch = safeQuery.length >= 2
  const key = shouldFetch 
    ? `/api/search?q=${encodeURIComponent(safeQuery)}`
    : null

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key, 
    fetcher, 
    {
      ...swrConfig,
      dedupingInterval: 30000, // 30s cache for full results
    }
  )

  const results = useMemo<SearchResult[]>(() => {
    if (!data?.results || !Array.isArray(data.results)) return []
    return data.results.filter((result: any) => (
      result?.id && result?.title && result?.type && result?.url
    ))
  }, [data])

  return {
    results,
    error: error?.message || null,
    isLoading: isLoading && !data,
    isValidating,
    refresh: () => mutate(),
    totalCount: data?.totalCount || results.length,
    source: data?.source || "cache",
  }
}
