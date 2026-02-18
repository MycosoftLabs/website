/**
 * CREP Data Cache Layer
 * 
 * Centralized caching for all CREP data sources to prevent:
 * 1. Overwhelming the dev server with API calls
 * 2. Rate limiting from external APIs
 * 3. Unnecessary network traffic
 * 
 * This module provides:
 * - In-memory caching with configurable TTLs
 * - Background refresh (stale-while-revalidate pattern)
 * - Rate limiting for external API calls
 * - Unified data access for all CREP sources
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  isRefreshing: boolean
}

export interface CacheConfig {
  ttlMs: number           // Time-to-live in milliseconds
  staleWhileRevalidate: boolean  // Return stale data while refreshing
  maxAge: number          // Max age before forced refresh (ms)
}

// Default cache configurations for different data types
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Real-time data - refresh every 30 seconds, stale OK for 2 minutes
  aircraft: { ttlMs: 30_000, staleWhileRevalidate: true, maxAge: 120_000 },
  vessels: { ttlMs: 30_000, staleWhileRevalidate: true, maxAge: 120_000 },
  
  // Semi-real-time - refresh every 2 minutes
  satellites: { ttlMs: 120_000, staleWhileRevalidate: true, maxAge: 300_000 },
  spaceWeather: { ttlMs: 120_000, staleWhileRevalidate: true, maxAge: 600_000 },
  
  // Slow-changing data - refresh every 5 minutes
  globalEvents: { ttlMs: 300_000, staleWhileRevalidate: true, maxAge: 900_000 },
  fungalObservations: { ttlMs: 300_000, staleWhileRevalidate: true, maxAge: 900_000 },
  devices: { ttlMs: 60_000, staleWhileRevalidate: true, maxAge: 300_000 },
  
  // Static/demo data - refresh every 10 minutes
  elephantConservation: { ttlMs: 600_000, staleWhileRevalidate: true, maxAge: 1800_000 },
}

// In-memory cache storage
const cache = new Map<string, CacheEntry<unknown>>()

// Track in-flight requests to prevent duplicate fetches
const pendingRequests = new Map<string, Promise<unknown>>()

// Rate limiting: track last fetch time per source
const lastFetchTime = new Map<string, number>()
const MIN_FETCH_INTERVAL_MS = 5000 // Minimum 5 seconds between fetches to same source

/**
 * Get cached data or fetch fresh data
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  config?: Partial<CacheConfig>
): Promise<T> {
  const cacheConfig = { ...CACHE_CONFIGS[key], ...config } || {
    ttlMs: 60_000,
    staleWhileRevalidate: true,
    maxAge: 300_000,
  }

  const now = Date.now()
  const cached = cache.get(key) as CacheEntry<T> | undefined

  // Check if we have valid cached data
  if (cached) {
    const isExpired = now > cached.expiresAt
    const isStale = now > cached.timestamp + cacheConfig.ttlMs
    const isTooOld = now > cached.timestamp + cacheConfig.maxAge

    // Return fresh cache
    if (!isStale) {
      return cached.data
    }

    // Return stale data while revalidating in background
    if (cacheConfig.staleWhileRevalidate && !isTooOld && !cached.isRefreshing) {
      // Trigger background refresh
      refreshInBackground(key, fetcher, cacheConfig)
      return cached.data
    }

    // Data too old, must wait for fresh data
    if (isTooOld) {
      return fetchAndCache(key, fetcher, cacheConfig)
    }

    // Return stale data if available
    return cached.data
  }

  // No cached data, fetch fresh
  return fetchAndCache(key, fetcher, cacheConfig)
}

/**
 * Fetch data and store in cache
 */
async function fetchAndCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<T> {
  // Check for pending request to prevent duplicate fetches
  const pending = pendingRequests.get(key)
  if (pending) {
    return pending as Promise<T>
  }

  // Rate limiting check
  const lastFetch = lastFetchTime.get(key) || 0
  const timeSinceLastFetch = Date.now() - lastFetch
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
    const cached = cache.get(key)
    if (cached) {
      return cached.data as T
    }
    // Wait for rate limit to pass
    await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL_MS - timeSinceLastFetch))
  }

  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      lastFetchTime.set(key, Date.now())
      const data = await fetcher()
      const now = Date.now()
      
      cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + config.ttlMs,
        isRefreshing: false,
      })
      
      return data
    } finally {
      pendingRequests.delete(key)
    }
  })()

  pendingRequests.set(key, fetchPromise)
  return fetchPromise
}

/**
 * Refresh cache in background without blocking
 */
function refreshInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): void {
  const cached = cache.get(key)
  if (cached?.isRefreshing) return

  // Mark as refreshing
  if (cached) {
    cache.set(key, { ...cached, isRefreshing: true })
  }

  // Fetch in background
  fetchAndCache(key, fetcher, config).catch(error => {
    console.error(`[CREP Cache] Background refresh failed for ${key}:`, error)
    // Reset refreshing flag on error
    const entry = cache.get(key)
    if (entry) {
      cache.set(key, { ...entry, isRefreshing: false })
    }
  })
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear()
  pendingRequests.clear()
  lastFetchTime.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number
  keys: string[]
  pendingRequests: number
} {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
    pendingRequests: pendingRequests.size,
  }
}

/**
 * Pre-warm cache with initial data
 */
export function warmCache<T>(key: string, data: T, ttlMs?: number): void {
  const config = CACHE_CONFIGS[key] || { ttlMs: ttlMs || 60_000 }
  const now = Date.now()
  
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + config.ttlMs,
    isRefreshing: false,
  })
}
