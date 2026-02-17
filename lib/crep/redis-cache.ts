/**
 * Shared Redis Cache for CREP and Search
 * Created: Feb 12, 2026
 * 
 * Provides a unified caching layer for:
 * - CREP environmental data (weather, events, devices, alerts)
 * - Unified search results
 * - Observation data
 * 
 * Supports:
 * - Configurable TTL per data type
 * - In-memory fallback when Redis unavailable
 * - Automatic reconnection
 * - Namespace isolation
 */

import { env } from "@/lib/env"

// Cache namespaces
export const CACHE_NAMESPACES = {
  CREP_WEATHER: "crep:weather:",
  CREP_EVENTS: "crep:events:",
  CREP_DEVICES: "crep:devices:",
  CREP_ALERTS: "crep:alerts:",
  SEARCH_UNIFIED: "search:unified:",
  SEARCH_TAXA: "search:taxa:",
  SEARCH_COMPOUNDS: "search:compounds:",
  SEARCH_OBSERVATIONS: "search:observations:",
} as const

// TTL configurations (in seconds)
export const CACHE_TTL = {
  CREP_WEATHER: 300,        // 5 minutes - weather updates frequently
  CREP_EVENTS: 60,          // 1 minute - events are time-sensitive
  CREP_DEVICES: 30,         // 30 seconds - device status changes
  CREP_ALERTS: 60,          // 1 minute - alerts are important
  SEARCH_UNIFIED: 600,      // 10 minutes - search results cache
  SEARCH_TAXA: 3600,        // 1 hour - taxa don't change often
  SEARCH_COMPOUNDS: 3600,   // 1 hour - compounds are stable
  SEARCH_OBSERVATIONS: 300, // 5 minutes - observations update moderately
} as const

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  source: "redis" | "memory" | "api"
}

// In-memory fallback cache (when Redis unavailable)
const memoryCache = new Map<string, CacheEntry<unknown>>()

// Redis connection status
let redisConnected = false
let redisLastCheck = 0
const REDIS_CHECK_INTERVAL = 30_000 // 30 seconds

/**
 * Check if Redis is available via MAS proxy
 */
async function checkRedisConnection(): Promise<boolean> {
  const now = Date.now()
  
  // Skip check if we checked recently
  if (now - redisLastCheck < REDIS_CHECK_INTERVAL) {
    return redisConnected
  }
  
  redisLastCheck = now
  
  try {
    // Use MAS Redis proxy endpoint
    const response = await fetch(`${env.masApiUrl}/api/redis/ping`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
    })
    
    redisConnected = response.ok
    return redisConnected
  } catch (error) {
    console.warn("[RedisCache] Redis connection check failed:", error)
    redisConnected = false
    return false
  }
}

/**
 * Get data from Redis via MAS proxy
 */
async function redisGet<T>(key: string): Promise<T | null> {
  try {
    const response = await fetch(`${env.masApiUrl}/api/redis/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(3000),
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.value ? JSON.parse(result.value) : null
    }
    return null
  } catch (error) {
    console.warn(`[RedisCache] Redis GET failed for ${key}:`, error)
    return null
  }
}

/**
 * Set data in Redis via MAS proxy
 */
async function redisSet<T>(key: string, value: T, ttl: number): Promise<boolean> {
  try {
    const response = await fetch(`${env.masApiUrl}/api/redis/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        key, 
        value: JSON.stringify(value),
        ttl,
      }),
      signal: AbortSignal.timeout(3000),
    })
    
    return response.ok
  } catch (error) {
    console.warn(`[RedisCache] Redis SET failed for ${key}:`, error)
    return false
  }
}

/**
 * Delete data from Redis via MAS proxy
 */
async function redisDel(key: string): Promise<boolean> {
  try {
    const response = await fetch(`${env.masApiUrl}/api/redis/del`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(3000),
    })
    
    return response.ok
  } catch (error) {
    console.warn(`[RedisCache] Redis DEL failed for ${key}:`, error)
    return false
  }
}

/**
 * Get cached data with multi-layer fallback
 */
export async function getCached<T>(
  namespace: keyof typeof CACHE_NAMESPACES,
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; forceRefresh?: boolean }
): Promise<{ data: T; fromCache: boolean; source: string; latency: number }> {
  const startTime = performance.now()
  const fullKey = CACHE_NAMESPACES[namespace] + key
  const ttl = options?.ttl || CACHE_TTL[namespace] || 300
  
  // Check if we should skip cache
  if (options?.forceRefresh) {
    return fetchAndCache(fullKey, fetcher, ttl, startTime)
  }
  
  // Layer 1: Check memory cache first (fastest)
  const memEntry = memoryCache.get(fullKey) as CacheEntry<T> | undefined
  const now = Date.now()
  
  if (memEntry && (now - memEntry.timestamp) < (memEntry.ttl * 1000)) {
    return {
      data: memEntry.data,
      fromCache: true,
      source: "memory",
      latency: performance.now() - startTime,
    }
  }
  
  // Layer 2: Try Redis if available
  const isRedisAvailable = await checkRedisConnection()
  
  if (isRedisAvailable) {
    try {
      const redisData = await redisGet<T>(fullKey)
      
      if (redisData !== null) {
        // Update memory cache
        memoryCache.set(fullKey, {
          data: redisData,
          timestamp: now,
          ttl,
          source: "redis",
        })
        
        return {
          data: redisData,
          fromCache: true,
          source: "redis",
          latency: performance.now() - startTime,
        }
      }
    } catch (error) {
      console.warn(`[RedisCache] Redis read failed for ${fullKey}:`, error)
    }
  }
  
  // Layer 3: Fetch fresh data
  return fetchAndCache(fullKey, fetcher, ttl, startTime)
}

/**
 * Fetch data and cache it in all layers
 */
async function fetchAndCache<T>(
  fullKey: string,
  fetcher: () => Promise<T>,
  ttl: number,
  startTime: number
): Promise<{ data: T; fromCache: boolean; source: string; latency: number }> {
  try {
    const data = await fetcher()
    const now = Date.now()
    
    // Update memory cache
    memoryCache.set(fullKey, {
      data,
      timestamp: now,
      ttl,
      source: "api",
    })
    
    // Update Redis (non-blocking)
    if (redisConnected) {
      redisSet(fullKey, data, ttl).catch(err => 
        console.warn(`[RedisCache] Background Redis SET failed:`, err)
      )
    }
    
    return {
      data,
      fromCache: false,
      source: "api",
      latency: performance.now() - startTime,
    }
  } catch (error) {
    // Return stale memory cache if available
    const staleEntry = memoryCache.get(fullKey) as CacheEntry<T> | undefined
    if (staleEntry) {
      console.warn(`[RedisCache] Using stale cache for ${fullKey}:`, error)
      return {
        data: staleEntry.data,
        fromCache: true,
        source: "stale-memory",
        latency: performance.now() - startTime,
      }
    }
    
    throw error
  }
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(
  namespace: keyof typeof CACHE_NAMESPACES,
  key: string
): Promise<void> {
  const fullKey = CACHE_NAMESPACES[namespace] + key
  
  // Remove from memory
  memoryCache.delete(fullKey)
  
  // Remove from Redis
  if (await checkRedisConnection()) {
    await redisDel(fullKey)
  }
}

/**
 * Invalidate all cache entries for a namespace
 */
export async function invalidateNamespace(
  namespace: keyof typeof CACHE_NAMESPACES
): Promise<void> {
  const prefix = CACHE_NAMESPACES[namespace]
  
  // Remove from memory
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
    }
  }
  
  // Note: Redis namespace invalidation would require SCAN + DEL
  // For now, individual keys expire via TTL
  console.log(`[RedisCache] Invalidated memory cache for namespace: ${namespace}`)
}

/**
 * Pre-populate cache for common queries
 */
export async function warmCache(
  items: Array<{
    namespace: keyof typeof CACHE_NAMESPACES
    key: string
    fetcher: () => Promise<unknown>
  }>
): Promise<void> {
  console.log(`[RedisCache] Warming cache with ${items.length} items...`)
  
  await Promise.allSettled(
    items.map(({ namespace, key, fetcher }) =>
      getCached(namespace, key, fetcher)
    )
  )
  
  console.log(`[RedisCache] Cache warming complete`)
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memoryEntries: number
  redisConnected: boolean
  namespaces: Record<string, number>
} {
  const namespaces: Record<string, number> = {}
  
  for (const [key] of memoryCache) {
    for (const [name, prefix] of Object.entries(CACHE_NAMESPACES)) {
      if (key.startsWith(prefix)) {
        namespaces[name] = (namespaces[name] || 0) + 1
        break
      }
    }
  }
  
  return {
    memoryEntries: memoryCache.size,
    redisConnected,
    namespaces,
  }
}

// =============================================================================
// CREP-Specific Cache Functions
// =============================================================================

/**
 * Cache CREP weather data
 */
export async function cacheCREPWeather(
  locationKey: string,
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  return getCached("CREP_WEATHER", locationKey, fetcher)
}

/**
 * Cache CREP events data
 */
export async function cacheCREPEvents(
  regionKey: string,
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  return getCached("CREP_EVENTS", regionKey, fetcher)
}

/**
 * Cache CREP device data
 */
export async function cacheCREPDevices(
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  return getCached("CREP_DEVICES", "all", fetcher)
}

/**
 * Cache CREP alerts
 */
export async function cacheCREPAlerts(
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  return getCached("CREP_ALERTS", "active", fetcher)
}

// =============================================================================
// Search-Specific Cache Functions
// =============================================================================

/**
 * Cache unified search results
 */
export async function cacheSearchUnified(
  query: string,
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, "-")
  return getCached("SEARCH_UNIFIED", normalizedQuery, fetcher)
}

/**
 * Cache taxa search results
 */
export async function cacheSearchTaxa(
  query: string,
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, "-")
  return getCached("SEARCH_TAXA", normalizedQuery, fetcher)
}

/**
 * Cache observation search results
 */
export async function cacheSearchObservations(
  query: string,
  fetcher: () => Promise<unknown>
): Promise<{ data: unknown; fromCache: boolean; source: string; latency: number }> {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, "-")
  return getCached("SEARCH_OBSERVATIONS", normalizedQuery, fetcher)
}
