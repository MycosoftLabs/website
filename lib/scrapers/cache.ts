/**
 * Scraper Cache Layer
 * 
 * In-memory cache with optional persistence for scraped data.
 * Provides fast access to recently scraped data with automatic expiration.
 */

import type { ScrapedData, ScraperCategory } from "./types"

interface CacheEntry<T = unknown> {
  data: ScrapedData<T>
  cachedAt: number
  accessCount: number
}

class ScraperCache {
  private cache: Map<string, CacheEntry> = new Map()
  private categoryIndex: Map<ScraperCategory, Set<string>> = new Map()
  private maxEntries: number = 1000
  private cleanupIntervalMs: number = 60000 // 1 minute

  constructor() {
    // Start cleanup interval
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), this.cleanupIntervalMs)
    }
  }

  /**
   * Store scraped data in cache
   */
  set<T>(key: string, data: ScrapedData<T>, category?: ScraperCategory): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data: data as ScrapedData,
      cachedAt: Date.now(),
      accessCount: 0,
    })

    // Update category index
    if (category) {
      if (!this.categoryIndex.has(category)) {
        this.categoryIndex.set(category, new Set())
      }
      this.categoryIndex.get(category)!.add(key)
    }
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): ScrapedData<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check expiration
    const expiresAt = new Date(entry.data.expiresAt).getTime()
    if (Date.now() > expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Update access count
    entry.accessCount++
    return entry.data as ScrapedData<T>
  }

  /**
   * Get all cached data for a category
   */
  getByCategory<T>(category: ScraperCategory): ScrapedData<T>[] {
    const keys = this.categoryIndex.get(category)
    if (!keys) return []

    const results: ScrapedData<T>[] = []
    for (const key of keys) {
      const data = this.get<T>(key)
      if (data) {
        results.push(data)
      }
    }
    return results
  }

  /**
   * Get the most recent cached data for a scraper
   */
  getLatest<T>(scraperId: string): ScrapedData<T> | null {
    let latest: CacheEntry | null = null
    let latestTime = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.data.scraperId === scraperId) {
        const timestamp = new Date(entry.data.timestamp).getTime()
        if (timestamp > latestTime) {
          latestTime = timestamp
          latest = entry
        }
      }
    }

    if (!latest) return null

    // Check expiration
    const expiresAt = new Date(latest.data.expiresAt).getTime()
    if (Date.now() > expiresAt) {
      return null
    }

    return latest.data as ScrapedData<T>
  }

  /**
   * Check if cache has valid data for key
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
    // Remove from category index
    for (const keys of this.categoryIndex.values()) {
      keys.delete(key)
    }
  }

  /**
   * Invalidate all entries for a category
   */
  invalidateCategory(category: ScraperCategory): void {
    const keys = this.categoryIndex.get(category)
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key)
      }
      this.categoryIndex.delete(category)
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.categoryIndex.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number
    byCategory: Record<string, number>
    oldestEntry: string | null
    newestEntry: string | null
  } {
    const byCategory: Record<string, number> = {}
    for (const [cat, keys] of this.categoryIndex.entries()) {
      byCategory[cat] = keys.size
    }

    let oldestTime = Infinity
    let newestTime = 0
    let oldestEntry: string | null = null
    let newestEntry: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt
        oldestEntry = key
      }
      if (entry.cachedAt > newestTime) {
        newestTime = entry.cachedAt
        newestEntry = key
      }
    }

    return {
      totalEntries: this.cache.size,
      byCategory,
      oldestEntry,
      newestEntry,
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const expiresAt = new Date(entry.data.expiresAt).getTime()
      if (now > expiresAt) {
        toDelete.push(key)
      }
    }

    for (const key of toDelete) {
      this.invalidate(key)
    }
  }

  /**
   * Evict least recently accessed entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.invalidate(oldestKey)
    }
  }
}

// Singleton instance
let cacheInstance: ScraperCache | null = null

export function getScraperCache(): ScraperCache {
  if (!cacheInstance) {
    cacheInstance = new ScraperCache()
  }
  return cacheInstance
}

export { ScraperCache }
