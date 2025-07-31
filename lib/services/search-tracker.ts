/**
 * SearchTracker - Tracks search patterns and evolves the search database
 * This service helps improve search results by analyzing user behavior
 */

interface SearchMetrics {
  timestamp: number
  query: string
  resultClicked?: boolean
  resultType?: string
  sessionId: string
}

interface PopularSearch {
  query: string
  count: number
  lastSearched: number
}

// Check if we're in a browser environment
const isClient = typeof window !== "undefined"

export class SearchTracker {
  private static instance: SearchTracker
  private searchHistory: SearchMetrics[] = []
  private popularSearches: Map<string, PopularSearch> = new Map()
  private sessionId: string

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.loadFromStorage()

    // Clean up old data periodically
    if (isClient) {
      setInterval(() => this.cleanup(), 24 * 60 * 60 * 1000) // Once a day
    }
  }

  static getInstance(): SearchTracker {
    if (!SearchTracker.instance) {
      SearchTracker.instance = new SearchTracker()
    }
    return SearchTracker.instance
  }

  trackSearch(query: string) {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return

    const searchMetric: SearchMetrics = {
      timestamp: Date.now(),
      query: normalizedQuery,
      sessionId: this.sessionId,
    }

    this.searchHistory.push(searchMetric)
    this.updatePopularSearches(normalizedQuery)
    this.saveToStorage()
  }

  trackResultClick(query: string, resultType: string) {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return

    const searchMetric: SearchMetrics = {
      timestamp: Date.now(),
      query: normalizedQuery,
      resultClicked: true,
      resultType,
      sessionId: this.sessionId,
    }

    this.searchHistory.push(searchMetric)
    this.updatePopularSearches(normalizedQuery, 2) // Weight clicks more heavily
    this.saveToStorage()
  }

  getTopSearches(limit = 100): Array<PopularSearch> {
    return Array.from(this.popularSearches.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  getRecentSearches(limit = 10): Array<string> {
    // Get unique recent searches from this session
    const recentSearches = this.searchHistory
      .filter((metric) => metric.sessionId === this.sessionId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((metric) => metric.query)

    // Remove duplicates
    return Array.from(new Set(recentSearches)).slice(0, limit)
  }

  getRelatedSearches(query: string, limit = 5): Array<string> {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return []

    // Find searches that often occur in the same session as this query
    const sessionsWithQuery = new Set(
      this.searchHistory.filter((metric) => metric.query === normalizedQuery).map((metric) => metric.sessionId),
    )

    // Count other queries in these sessions
    const relatedQueries = new Map<string, number>()

    this.searchHistory
      .filter((metric) => sessionsWithQuery.has(metric.sessionId) && metric.query !== normalizedQuery)
      .forEach((metric) => {
        const count = relatedQueries.get(metric.query) || 0
        relatedQueries.set(metric.query, count + 1)
      })

    // Sort by frequency and return top results
    return Array.from(relatedQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([query]) => query)
      .slice(0, limit)
  }

  private updatePopularSearches(query: string, weight = 1) {
    const existing = this.popularSearches.get(query)

    if (existing) {
      existing.count += weight
      existing.lastSearched = Date.now()
      this.popularSearches.set(query, existing)
    } else {
      this.popularSearches.set(query, {
        query,
        count: weight,
        lastSearched: Date.now(),
      })
    }
  }

  private saveToStorage() {
    if (!isClient) return

    try {
      localStorage.setItem("searchHistory", JSON.stringify(this.searchHistory.slice(-1000))) // Keep last 1000 searches
      localStorage.setItem("popularSearches", JSON.stringify(Array.from(this.popularSearches.entries())))
      localStorage.setItem("searchSessionId", this.sessionId)
    } catch (error) {
      console.error("Error saving search metrics:", error)
    }
  }

  private loadFromStorage() {
    if (!isClient) return

    try {
      const history = localStorage.getItem("searchHistory")
      const popular = localStorage.getItem("popularSearches")
      const savedSessionId = localStorage.getItem("searchSessionId")

      if (history) {
        this.searchHistory = JSON.parse(history)
      }

      if (popular) {
        const entries = JSON.parse(popular) as [string, PopularSearch][]
        this.popularSearches = new Map(entries)
      }

      if (savedSessionId) {
        // If session is less than 30 minutes old, reuse it
        const lastActivity = Math.max(
          ...this.searchHistory
            .filter((metric) => metric.sessionId === savedSessionId)
            .map((metric) => metric.timestamp),
          0,
        )

        if (Date.now() - lastActivity < 30 * 60 * 1000) {
          this.sessionId = savedSessionId
        }
      }
    } catch (error) {
      console.error("Error loading search metrics:", error)
    }
  }

  // Clean up old data (older than 90 days)
  cleanup() {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
    this.searchHistory = this.searchHistory.filter((metric) => metric.timestamp > ninetyDaysAgo)

    // Clean up old popular searches
    for (const [query, data] of this.popularSearches.entries()) {
      if (data.lastSearched < ninetyDaysAgo) {
        this.popularSearches.delete(query)
      }
    }

    this.saveToStorage()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// Create a singleton instance with safety checks for server-side rendering
let searchTrackerInstance: SearchTracker

// Use a function to get the instance safely
export function getSearchTracker(): SearchTracker {
  // Only create the instance if we're in a browser environment
  if (isClient && !searchTrackerInstance) {
    searchTrackerInstance = SearchTracker.getInstance()
  }

  // Return a mock implementation for server-side rendering
  if (!isClient) {
    return {
      trackSearch: () => {},
      trackResultClick: () => {},
      getTopSearches: () => [],
      getRecentSearches: () => [],
      getRelatedSearches: () => [],
    } as unknown as SearchTracker
  }

  return searchTrackerInstance
}

// Export the singleton instance getter function
export const searchTracker = isClient
  ? SearchTracker.getInstance()
  : ({
      trackSearch: () => {},
      trackResultClick: () => {},
      getTopSearches: () => [],
      getRecentSearches: () => [],
      getRelatedSearches: () => [],
    } as unknown as SearchTracker)
