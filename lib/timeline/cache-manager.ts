/**
 * Multi-Tier Cache Manager - February 6, 2026
 * 
 * Orchestrates a hierarchy of caches for timeline data:
 * 1. In-Memory (fastest, smallest, most recent)
 * 2. IndexedDB (fast, larger, last 24h)
 * 3. API (slowest, unlimited, all historical)
 * 
 * Provides unified interface for timeline data access with
 * automatic tier selection and cache population.
 */

import { 
  getTimelineCache, 
  TimelineEntry, 
  TimelineQuery, 
  EntityType, 
  DataSource 
} from "./indexeddb-cache"

// Configuration
const MEMORY_CACHE_MAX_ENTRIES = 1000
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const PREFETCH_WINDOW_MS = 10 * 60 * 1000 // 10 minutes each direction
const API_BASE_URL = process.env.NEXT_PUBLIC_MAS_URL || "http://192.168.0.188:8001"

export interface CacheResult<T> {
  data: T
  source: "memory" | "indexeddb" | "api" | "stale"
  timestamp: number
  age: number // ms since data was fetched
}

export interface TimelineDataPoint {
  entityType: EntityType
  entityId: string
  timestamp: number
  position?: { lat: number; lng: number; altitude?: number }
  velocity?: { speed: number; heading: number; climb?: number }
  metadata?: Record<string, unknown>
  source: DataSource
}

interface MemoryCacheEntry {
  data: TimelineDataPoint[]
  fetchedAt: number
  expiresAt: number
}

class TimelineCacheManager {
  private memoryCache: Map<string, MemoryCacheEntry> = new Map()
  private pendingFetches: Map<string, Promise<TimelineDataPoint[]>> = new Map()
  private prefetchQueue: Set<string> = new Set()
  
  /**
   * Generate cache key for a query
   */
  private makeCacheKey(query: TimelineQuery): string {
    return [
      query.entityType || "*",
      query.entityId || "*",
      query.startTime || 0,
      query.endTime || Infinity,
      query.source || "*",
    ].join(":")
  }
  
  /**
   * Get data from memory cache
   */
  private getFromMemory(key: string): MemoryCacheEntry | null {
    const entry = this.memoryCache.get(key)
    
    if (!entry) return null
    
    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key)
      return null
    }
    
    return entry
  }
  
  /**
   * Store data in memory cache
   */
  private putInMemory(key: string, data: TimelineDataPoint[]): void {
    // LRU eviction if cache is full
    if (this.memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) this.memoryCache.delete(oldestKey)
    }
    
    this.memoryCache.set(key, {
      data,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    })
  }
  
  /**
   * Get data from IndexedDB cache
   */
  private async getFromIndexedDB(query: TimelineQuery): Promise<TimelineDataPoint[]> {
    const cache = getTimelineCache()
    
    try {
      const entries = await cache.query(query)
      
      return entries.map(entry => ({
        entityType: entry.entityType,
        entityId: entry.entityId,
        timestamp: entry.timestamp,
        ...entry.data,
        source: entry.source,
      } as TimelineDataPoint))
    } catch (error) {
      console.error("[CacheManager] IndexedDB error:", error)
      return []
    }
  }
  
  /**
   * Store data in IndexedDB cache
   */
  private async putInIndexedDB(data: TimelineDataPoint[]): Promise<void> {
    const cache = getTimelineCache()
    
    try {
      await cache.putBatch(
        data.map(point => ({
          entityType: point.entityType,
          entityId: point.entityId,
          timestamp: point.timestamp,
          data: {
            position: point.position,
            velocity: point.velocity,
            metadata: point.metadata,
          },
          source: point.source,
        }))
      )
    } catch (error) {
      console.error("[CacheManager] IndexedDB write error:", error)
    }
  }
  
  /**
   * Fetch data from API
   */
  private async fetchFromAPI(query: TimelineQuery): Promise<TimelineDataPoint[]> {
    const params = new URLSearchParams()
    
    if (query.entityType) params.append("entity_type", query.entityType)
    if (query.entityId) params.append("entity_id", query.entityId)
    if (query.startTime) params.append("start_time", query.startTime.toString())
    if (query.endTime) params.append("end_time", query.endTime.toString())
    if (query.limit) params.append("limit", query.limit.toString())
    if (query.source) params.append("source", query.source)
    
    const response = await fetch(`${API_BASE_URL}/api/timeline/range?${params}`, {
      headers: { "Content-Type": "application/json" },
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const result = await response.json()
    return result.data as TimelineDataPoint[]
  }
  
  /**
   * Get timeline data with automatic cache tier selection
   */
  async get(query: TimelineQuery): Promise<CacheResult<TimelineDataPoint[]>> {
    const cacheKey = this.makeCacheKey(query)
    
    // 1. Check memory cache first
    const memoryEntry = this.getFromMemory(cacheKey)
    if (memoryEntry) {
      return {
        data: memoryEntry.data,
        source: "memory",
        timestamp: memoryEntry.fetchedAt,
        age: Date.now() - memoryEntry.fetchedAt,
      }
    }
    
    // 2. Check IndexedDB
    const indexedDBData = await this.getFromIndexedDB(query)
    if (indexedDBData.length > 0) {
      // Promote to memory cache
      this.putInMemory(cacheKey, indexedDBData)
      
      return {
        data: indexedDBData,
        source: "indexeddb",
        timestamp: Date.now(),
        age: 0,
      }
    }
    
    // 3. Check for pending fetch (deduplication)
    if (this.pendingFetches.has(cacheKey)) {
      const data = await this.pendingFetches.get(cacheKey)!
      return {
        data,
        source: "api",
        timestamp: Date.now(),
        age: 0,
      }
    }
    
    // 4. Fetch from API
    const fetchPromise = this.fetchFromAPI(query)
    this.pendingFetches.set(cacheKey, fetchPromise)
    
    try {
      const data = await fetchPromise
      
      // Populate caches
      this.putInMemory(cacheKey, data)
      await this.putInIndexedDB(data)
      
      return {
        data,
        source: "api",
        timestamp: Date.now(),
        age: 0,
      }
    } finally {
      this.pendingFetches.delete(cacheKey)
    }
  }
  
  /**
   * Get entity state at a specific time (with interpolation)
   */
  async getEntityAt(
    entityType: EntityType,
    entityId: string,
    timestamp: number
  ): Promise<CacheResult<TimelineDataPoint | null>> {
    // Query a small window around the timestamp
    const result = await this.get({
      entityType,
      entityId,
      startTime: timestamp - 60000, // 1 minute before
      endTime: timestamp + 60000,   // 1 minute after
      limit: 10,
    })
    
    if (result.data.length === 0) {
      return { data: null, source: result.source, timestamp: result.timestamp, age: result.age }
    }
    
    // Find closest point
    let closest = result.data[0]
    let minDelta = Math.abs(result.data[0].timestamp - timestamp)
    
    for (const point of result.data) {
      const delta = Math.abs(point.timestamp - timestamp)
      if (delta < minDelta) {
        minDelta = delta
        closest = point
      }
    }
    
    return {
      data: closest,
      source: result.source,
      timestamp: result.timestamp,
      age: result.age,
    }
  }
  
  /**
   * Prefetch data for a time range (background loading)
   */
  async prefetch(
    entityType: EntityType,
    currentTime: number,
    direction: "past" | "future" | "both" = "both"
  ): Promise<void> {
    const prefetchKey = `${entityType}:${currentTime}:${direction}`
    
    if (this.prefetchQueue.has(prefetchKey)) return
    this.prefetchQueue.add(prefetchKey)
    
    try {
      const queries: TimelineQuery[] = []
      
      if (direction === "past" || direction === "both") {
        queries.push({
          entityType,
          startTime: currentTime - PREFETCH_WINDOW_MS,
          endTime: currentTime,
        })
      }
      
      if (direction === "future" || direction === "both") {
        queries.push({
          entityType,
          startTime: currentTime,
          endTime: currentTime + PREFETCH_WINDOW_MS,
        })
      }
      
      // Fetch in parallel
      await Promise.all(queries.map(q => this.get(q)))
    } finally {
      this.prefetchQueue.delete(prefetchKey)
    }
  }
  
  /**
   * Store live update data
   */
  async storeLiveUpdate(data: TimelineDataPoint[]): Promise<void> {
    // Store in both memory and IndexedDB
    for (const point of data) {
      const key = this.makeCacheKey({
        entityType: point.entityType,
        entityId: point.entityId,
        startTime: point.timestamp,
        endTime: point.timestamp,
      })
      
      this.putInMemory(key, [point])
    }
    
    await this.putInIndexedDB(data)
  }
  
  /**
   * Invalidate cache for a query
   */
  invalidate(query?: TimelineQuery): void {
    if (!query) {
      // Clear all memory cache
      this.memoryCache.clear()
      return
    }
    
    // Clear matching entries
    const prefix = [
      query.entityType || "",
      query.entityId || "",
    ].join(":")
    
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key)
      }
    }
  }
  
  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<{ memory: number; indexeddb: number }> {
    // Clean memory cache
    let memoryCleared = 0
    const now = Date.now()
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key)
        memoryCleared++
      }
    }
    
    // Clean IndexedDB
    const cache = getTimelineCache()
    const indexeddbCleared = await cache.cleanExpired()
    
    // LRU eviction if needed
    await cache.evictLRU()
    
    return { memory: memoryCleared, indexeddb: indexeddbCleared }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memory: { entries: number; oldestMs: number | null }
    indexeddb: { entries: number; sizeBytes: number; oldestMs: number | null }
  }> {
    // Memory stats
    let oldestMemory: number | null = null
    for (const entry of this.memoryCache.values()) {
      if (oldestMemory === null || entry.fetchedAt < oldestMemory) {
        oldestMemory = entry.fetchedAt
      }
    }
    
    // IndexedDB stats
    const cache = getTimelineCache()
    const idbStats = await cache.getStats()
    
    return {
      memory: {
        entries: this.memoryCache.size,
        oldestMs: oldestMemory ? Date.now() - oldestMemory : null,
      },
      indexeddb: {
        entries: idbStats.totalEntries,
        sizeBytes: idbStats.totalSizeBytes,
        oldestMs: idbStats.oldestEntry ? Date.now() - idbStats.oldestEntry : null,
      },
    }
  }
}

// Singleton instance
let managerInstance: TimelineCacheManager | null = null

export function getTimelineCacheManager(): TimelineCacheManager {
  if (!managerInstance) {
    managerInstance = new TimelineCacheManager()
  }
  return managerInstance
}

export { TimelineCacheManager }