"use client"

/**
 * useTimelineCache - React hook for timeline data access
 * February 6, 2026
 * 
 * Provides React-friendly interface to the multi-tier cache system
 * with automatic prefetching, live updates, and cache statistics.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { 
  getTimelineCacheManager, 
  TimelineCacheManager, 
  TimelineDataPoint, 
  CacheResult 
} from "@/lib/timeline/cache-manager"
import { EntityType, TimelineQuery } from "@/lib/timeline/indexeddb-cache"

export interface UseTimelineCacheOptions {
  /** Enable automatic prefetching */
  prefetch?: boolean
  /** Prefetch window in milliseconds (default: 10 min) */
  prefetchWindow?: number
  /** Enable automatic cleanup interval */
  autoCleanup?: boolean
  /** Cleanup interval in milliseconds (default: 5 min) */
  cleanupInterval?: number
  /** Subscribe to live updates for these entity types */
  liveUpdates?: EntityType[]
}

export interface TimelineCacheState {
  /** Whether cache is initializing */
  isLoading: boolean
  /** Last error if any */
  error: Error | null
  /** Cache statistics */
  stats: {
    memoryEntries: number
    indexedDBEntries: number
    indexedDBSizeBytes: number
    cacheHitRate: number
  } | null
}

export interface UseTimelineCacheReturn {
  /** Current cache state */
  state: TimelineCacheState
  
  /** Query data from cache with automatic tier selection */
  query: (query: TimelineQuery) => Promise<CacheResult<TimelineDataPoint[]>>
  
  /** Get entity state at specific timestamp */
  getEntityAt: (
    entityType: EntityType,
    entityId: string,
    timestamp: number
  ) => Promise<CacheResult<TimelineDataPoint | null>>
  
  /** Prefetch data for a time range */
  prefetchRange: (
    entityType: EntityType,
    startTime: number,
    endTime: number
  ) => Promise<void>
  
  /** Store live update data */
  storeLiveUpdate: (data: TimelineDataPoint[]) => Promise<void>
  
  /** Invalidate cache (all or specific query) */
  invalidate: (query?: TimelineQuery) => void
  
  /** Force cleanup of expired entries */
  cleanup: () => Promise<void>
  
  /** Refresh cache statistics */
  refreshStats: () => Promise<void>
}

// Track cache hits/misses for statistics
let cacheHits = 0
let cacheMisses = 0

export function useTimelineCache(
  options: UseTimelineCacheOptions = {}
): UseTimelineCacheReturn {
  const {
    prefetch = true,
    prefetchWindow = 10 * 60 * 1000,
    autoCleanup = true,
    cleanupInterval = 5 * 60 * 1000,
    liveUpdates = [],
  } = options
  
  const [state, setState] = useState<TimelineCacheState>({
    isLoading: true,
    error: null,
    stats: null,
  })
  
  const managerRef = useRef<TimelineCacheManager | null>(null)
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastQueryTimeRef = useRef<number>(Date.now())
  
  // Initialize cache manager
  useEffect(() => {
    managerRef.current = getTimelineCacheManager()
    
    // Initial stats load
    refreshStats()
    
    setState(prev => ({ ...prev, isLoading: false }))
    
    // Setup cleanup interval
    if (autoCleanup) {
      cleanupTimerRef.current = setInterval(async () => {
        await cleanup()
      }, cleanupInterval)
    }
    
    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current)
      }
    }
  }, [autoCleanup, cleanupInterval])
  
  // Subscribe to live updates via WebSocket
  useEffect(() => {
    if (liveUpdates.length === 0) return
    
    // Connect to live data WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_MAS_WS_URL || "ws://192.168.0.188:8001/ws/timeline"
    let ws: WebSocket | null = null
    let reconnectTimer: NodeJS.Timeout | null = null
    
    const connect = () => {
      try {
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          // Subscribe to entity types
          ws?.send(JSON.stringify({
            type: "subscribe",
            entityTypes: liveUpdates,
          }))
        }
        
        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data)
            
            if (message.type === "update" && Array.isArray(message.data)) {
              await storeLiveUpdate(message.data)
            }
          } catch (e) {
            console.error("[useTimelineCache] WebSocket message error:", e)
          }
        }
        
        ws.onclose = () => {
          // Reconnect after delay
          reconnectTimer = setTimeout(connect, 5000)
        }
        
        ws.onerror = (error) => {
          console.error("[useTimelineCache] WebSocket error:", error)
        }
      } catch (e) {
        console.error("[useTimelineCache] WebSocket connection failed:", e)
      }
    }
    
    connect()
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [liveUpdates])
  
  // Query with statistics tracking
  const query = useCallback(async (
    queryParams: TimelineQuery
  ): Promise<CacheResult<TimelineDataPoint[]>> => {
    if (!managerRef.current) {
      throw new Error("Cache manager not initialized")
    }
    
    try {
      const result = await managerRef.current.get(queryParams)
      
      // Track cache hits
      if (result.source === "memory" || result.source === "indexeddb") {
        cacheHits++
      } else {
        cacheMisses++
      }
      
      // Auto-prefetch if enabled
      if (prefetch && queryParams.entityType) {
        const currentTime = queryParams.startTime || Date.now()
        lastQueryTimeRef.current = currentTime
        
        // Prefetch in background
        managerRef.current.prefetch(
          queryParams.entityType,
          currentTime,
          "both"
        ).catch(console.error)
      }
      
      return result
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }))
      throw error
    }
  }, [prefetch])
  
  // Get entity at specific time
  const getEntityAt = useCallback(async (
    entityType: EntityType,
    entityId: string,
    timestamp: number
  ): Promise<CacheResult<TimelineDataPoint | null>> => {
    if (!managerRef.current) {
      throw new Error("Cache manager not initialized")
    }
    
    return managerRef.current.getEntityAt(entityType, entityId, timestamp)
  }, [])
  
  // Prefetch range
  const prefetchRange = useCallback(async (
    entityType: EntityType,
    startTime: number,
    endTime: number
  ): Promise<void> => {
    if (!managerRef.current) return
    
    // Prefetch in chunks
    const chunkSize = prefetchWindow
    
    for (let t = startTime; t < endTime; t += chunkSize) {
      await managerRef.current.prefetch(entityType, t, "future")
    }
  }, [prefetchWindow])
  
  // Store live update
  const storeLiveUpdate = useCallback(async (
    data: TimelineDataPoint[]
  ): Promise<void> => {
    if (!managerRef.current) return
    
    await managerRef.current.storeLiveUpdate(data)
  }, [])
  
  // Invalidate cache
  const invalidate = useCallback((query?: TimelineQuery): void => {
    if (!managerRef.current) return
    
    managerRef.current.invalidate(query)
  }, [])
  
  // Cleanup
  const cleanup = useCallback(async (): Promise<void> => {
    if (!managerRef.current) return
    
    try {
      await managerRef.current.cleanup()
      await refreshStats()
    } catch (error) {
      console.error("[useTimelineCache] Cleanup error:", error)
    }
  }, [])
  
  // Refresh statistics
  const refreshStats = useCallback(async (): Promise<void> => {
    if (!managerRef.current) return
    
    try {
      const stats = await managerRef.current.getStats()
      
      const totalRequests = cacheHits + cacheMisses
      const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0
      
      setState(prev => ({
        ...prev,
        stats: {
          memoryEntries: stats.memory.entries,
          indexedDBEntries: stats.indexeddb.entries,
          indexedDBSizeBytes: stats.indexeddb.sizeBytes,
          cacheHitRate: hitRate,
        },
      }))
    } catch (error) {
      console.error("[useTimelineCache] Stats error:", error)
    }
  }, [])
  
  return {
    state,
    query,
    getEntityAt,
    prefetchRange,
    storeLiveUpdate,
    invalidate,
    cleanup,
    refreshStats,
  }
}

/**
 * Hook for querying specific entity type with automatic updates
 */
export function useEntityTimeline(
  entityType: EntityType,
  options: {
    startTime?: number
    endTime?: number
    autoRefresh?: boolean
    refreshInterval?: number
  } = {}
) {
  const {
    startTime = Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    endTime = Date.now(),
    autoRefresh = false,
    refreshInterval = 30000,
  } = options
  
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<string>("none")
  
  const cache = useTimelineCache({ liveUpdates: autoRefresh ? [entityType] : [] })
  
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    
    try {
      const result = await cache.query({
        entityType,
        startTime,
        endTime,
      })
      
      setData(result.data)
      setSource(result.source)
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [cache, entityType, startTime, endTime])
  
  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const timer = setInterval(fetchData, refreshInterval)
    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, fetchData])
  
  return { data, isLoading, error, source, refetch: fetchData }
}