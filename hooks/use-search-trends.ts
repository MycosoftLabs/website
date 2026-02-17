/**
 * useSearchTrends Hook - Search Trends and Analytics for App Integration
 * 
 * Provides:
 * - Recent search history (session-scoped)
 * - Trending topics (from MINDEX)
 * - Search result sharing across apps
 * - User preference tracking
 * 
 * Used by internal apps (Chemistry, Genetics, AI, Earth2, CREP, Map) 
 * to access search context and trends.
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import useSWR from "swr"

// =============================================================================
// TYPES
// =============================================================================

export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: number
  resultCount: number
  intent?: string
  providers?: string[]
}

export interface TrendingTopic {
  topic: string
  count: number
  category: "species" | "compound" | "location" | "research" | "general"
  change: "up" | "down" | "stable"
}

export interface SearchResultShare {
  query: string
  results: {
    species?: Array<{ id: string; name: string; commonName?: string }>
    compounds?: Array<{ id: string; name: string; formula?: string }>
    genetics?: Array<{ id: string; accession: string; speciesName?: string }>
    research?: Array<{ id: string; title: string; doi?: string }>
  }
  aiAnswer?: string
  timestamp: number
}

export interface UserSearchPreferences {
  favoriteTopics: string[]
  excludedSources: string[]
  preferredResultTypes: string[]
  locationPreference?: { lat: number; lng: number; name?: string }
}

export interface UseSearchTrendsOptions {
  /** Max items to keep in history */
  maxHistory?: number
  /** Enable auto-fetching trends from MINDEX */
  fetchTrends?: boolean
  /** Trend refresh interval in ms */
  trendsRefreshInterval?: number
}

export interface UseSearchTrendsReturn {
  // History
  searchHistory: SearchHistoryItem[]
  addToHistory: (item: Omit<SearchHistoryItem, "id" | "timestamp">) => void
  clearHistory: () => void
  
  // Trends
  trends: TrendingTopic[]
  trendsLoading: boolean
  trendsError: string | null
  refreshTrends: () => void
  
  // Result sharing
  sharedResults: SearchResultShare | null
  shareResults: (results: SearchResultShare) => void
  clearSharedResults: () => void
  
  // Preferences
  preferences: UserSearchPreferences
  updatePreferences: (prefs: Partial<UserSearchPreferences>) => void
  
  // Analytics
  getTopSearches: (limit?: number) => Array<{ query: string; count: number }>
  getRecentCategories: () => Array<{ category: string; count: number }>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEYS = {
  history: "mycosoft-search-history",
  preferences: "mycosoft-search-preferences",
  sharedResults: "mycosoft-search-shared",
}

const DEFAULT_PREFERENCES: UserSearchPreferences = {
  favoriteTopics: [],
  excludedSources: [],
  preferredResultTypes: ["species", "compounds", "research"],
}

// =============================================================================
// FETCHER
// =============================================================================

const trendsFetcher = async (url: string): Promise<TrendingTopic[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch trends")
  const data = await res.json()
  return data.trends || []
}

// =============================================================================
// HOOK
// =============================================================================

export function useSearchTrends(options: UseSearchTrendsOptions = {}): UseSearchTrendsReturn {
  const {
    maxHistory = 50,
    fetchTrends = true,
    trendsRefreshInterval = 60000, // 1 minute
  } = options

  // State
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [sharedResults, setSharedResults] = useState<SearchResultShare | null>(null)
  const [preferences, setPreferences] = useState<UserSearchPreferences>(DEFAULT_PREFERENCES)

  // Load from storage on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      // Load history
      const savedHistory = sessionStorage.getItem(STORAGE_KEYS.history)
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory))
      }

      // Load preferences (persistent)
      const savedPrefs = localStorage.getItem(STORAGE_KEYS.preferences)
      if (savedPrefs) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) })
      }

      // Load shared results
      const savedShared = sessionStorage.getItem(STORAGE_KEYS.sharedResults)
      if (savedShared) {
        setSharedResults(JSON.parse(savedShared))
      }
    } catch (e) {
      console.warn("[useSearchTrends] Failed to load from storage:", e)
    }
  }, [])

  // Fetch trends from MINDEX
  const {
    data: trendsData,
    error: trendsError,
    isLoading: trendsLoading,
    mutate: refreshTrends,
  } = useSWR<TrendingTopic[]>(
    fetchTrends ? "/api/search/trends" : null,
    trendsFetcher,
    {
      refreshInterval: trendsRefreshInterval,
      revalidateOnFocus: false,
      fallbackData: [],
    }
  )

  // History management
  const addToHistory = useCallback(
    (item: Omit<SearchHistoryItem, "id" | "timestamp">) => {
      const newItem: SearchHistoryItem = {
        ...item,
        id: `search-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      }

      setSearchHistory((prev) => {
        // Deduplicate by query (keep most recent)
        const filtered = prev.filter(
          (h) => h.query.toLowerCase() !== item.query.toLowerCase()
        )
        const updated = [newItem, ...filtered].slice(0, maxHistory)
        
        // Save to storage
        try {
          sessionStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated))
        } catch {}
        
        return updated
      })
    },
    [maxHistory]
  )

  const clearHistory = useCallback(() => {
    setSearchHistory([])
    try {
      sessionStorage.removeItem(STORAGE_KEYS.history)
    } catch {}
  }, [])

  // Result sharing
  const shareResults = useCallback((results: SearchResultShare) => {
    setSharedResults(results)
    try {
      sessionStorage.setItem(STORAGE_KEYS.sharedResults, JSON.stringify(results))
    } catch {}
  }, [])

  const clearSharedResults = useCallback(() => {
    setSharedResults(null)
    try {
      sessionStorage.removeItem(STORAGE_KEYS.sharedResults)
    } catch {}
  }, [])

  // Preferences management
  const updatePreferences = useCallback(
    (prefs: Partial<UserSearchPreferences>) => {
      setPreferences((prev) => {
        const updated = { ...prev, ...prefs }
        try {
          localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(updated))
        } catch {}
        return updated
      })
    },
    []
  )

  // Analytics helpers
  const getTopSearches = useCallback(
    (limit = 10) => {
      const counts: Record<string, number> = {}
      for (const item of searchHistory) {
        const key = item.query.toLowerCase()
        counts[key] = (counts[key] || 0) + 1
      }
      return Object.entries(counts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
    },
    [searchHistory]
  )

  const getRecentCategories = useCallback(() => {
    const counts: Record<string, number> = {}
    for (const item of searchHistory.slice(0, 20)) {
      const category = item.intent || "general"
      counts[category] = (counts[category] || 0) + 1
    }
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }, [searchHistory])

  return {
    // History
    searchHistory,
    addToHistory,
    clearHistory,
    
    // Trends
    trends: trendsData || [],
    trendsLoading,
    trendsError: trendsError?.message || null,
    refreshTrends: () => refreshTrends(),
    
    // Result sharing
    sharedResults,
    shareResults,
    clearSharedResults,
    
    // Preferences
    preferences,
    updatePreferences,
    
    // Analytics
    getTopSearches,
    getRecentCategories,
  }
}

export default useSearchTrends
