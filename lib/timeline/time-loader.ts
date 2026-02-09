/**
 * Time-Based Data Loader - February 6, 2026
 * 
 * Efficient data loading for timeline scrubbing with:
 * - Predictive prefetching
 * - Throttled updates during rapid scrubbing
 * - Seamless pastâ†’presentâ†’future transitions
 * - Loading state management
 */

import { getTimelineCacheManager, TimelineDataPoint } from "./cache-manager"
import { EntityType, TimelineQuery } from "./indexeddb-cache"

// Configuration
const PREFETCH_AHEAD_MS = 10 * 60 * 1000  // Prefetch 10 minutes ahead
const PREFETCH_BEHIND_MS = 5 * 60 * 1000   // Prefetch 5 minutes behind
const THROTTLE_MS = 100                     // Throttle rapid requests
const CHUNK_SIZE_MS = 5 * 60 * 1000        // Load data in 5-minute chunks

export type LoadingState = "idle" | "loading" | "prefetching" | "error"

export interface TimeLoaderState {
  currentTime: number
  loadingState: LoadingState
  loadedRanges: Array<{ start: number; end: number }>
  error: Error | null
  lastLoadTime: number
}

export interface TimeLoaderOptions {
  /** Entity types to load */
  entityTypes: EntityType[]
  /** Callback when new data is loaded */
  onData: (data: TimelineDataPoint[]) => void
  /** Callback when loading state changes */
  onStateChange?: (state: TimeLoaderState) => void
  /** Enable prefetching */
  prefetch?: boolean
  /** Viewport bounds (optional) */
  viewport?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

export class TimelineDataLoader {
  private options: TimeLoaderOptions
  private state: TimeLoaderState
  private pendingRequest: AbortController | null = null
  private prefetchTimer: ReturnType<typeof setTimeout> | null = null
  private throttleTimer: ReturnType<typeof setTimeout> | null = null
  private lastRequestedTime: number = 0
  
  constructor(options: TimeLoaderOptions) {
    this.options = {
      prefetch: true,
      ...options,
    }
    
    this.state = {
      currentTime: Date.now(),
      loadingState: "idle",
      loadedRanges: [],
      error: null,
      lastLoadTime: 0,
    }
  }
  
  /**
   * Check if a time range is already loaded
   */
  private isRangeLoaded(start: number, end: number): boolean {
    for (const range of this.state.loadedRanges) {
      if (range.start <= start && range.end >= end) {
        return true
      }
    }
    return false
  }
  
  /**
   * Mark a range as loaded
   */
  private markRangeLoaded(start: number, end: number): void {
    // Merge with existing ranges if possible
    const newRanges: Array<{ start: number; end: number }> = []
    let merged = false
    
    for (const range of this.state.loadedRanges) {
      if (range.end >= start && range.start <= end) {
        // Overlapping - merge
        start = Math.min(start, range.start)
        end = Math.max(end, range.end)
        merged = true
      } else {
        newRanges.push(range)
      }
    }
    
    newRanges.push({ start, end })
    
    // Sort by start time
    newRanges.sort((a, b) => a.start - b.start)
    
    // Keep only last 24 hours of ranges
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    this.state.loadedRanges = newRanges.filter(r => r.end > cutoff)
  }
  
  /**
   * Update state and notify listener
   */
  private updateState(updates: Partial<TimeLoaderState>): void {
    this.state = { ...this.state, ...updates }
    this.options.onStateChange?.(this.state)
  }
  
  /**
   * Load data for a specific time
   */
  async loadAtTime(timestamp: number): Promise<void> {
    // Throttle rapid requests
    if (this.throttleTimer) {
      this.lastRequestedTime = timestamp
      return
    }
    
    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null
      if (this.lastRequestedTime !== timestamp) {
        this.loadAtTime(this.lastRequestedTime)
      }
    }, THROTTLE_MS)
    
    // Cancel any pending request
    if (this.pendingRequest) {
      this.pendingRequest.abort()
    }
    
    // Calculate range to load
    const chunkStart = Math.floor(timestamp / CHUNK_SIZE_MS) * CHUNK_SIZE_MS
    const chunkEnd = chunkStart + CHUNK_SIZE_MS
    
    // Skip if already loaded
    if (this.isRangeLoaded(chunkStart, chunkEnd)) {
      this.updateState({ currentTime: timestamp, loadingState: "idle" })
      
      // Still trigger prefetch
      if (this.options.prefetch) {
        this.schedulePrefetch(timestamp)
      }
      return
    }
    
    // Start loading
    this.pendingRequest = new AbortController()
    this.updateState({ 
      currentTime: timestamp, 
      loadingState: "loading",
      error: null,
    })
    
    try {
      const manager = getTimelineCacheManager()
      const allData: TimelineDataPoint[] = []
      
      // Load data for each entity type
      for (const entityType of this.options.entityTypes) {
        const query: TimelineQuery = {
          entityType,
          startTime: chunkStart,
          endTime: chunkEnd,
          limit: 5000,
        }
        
        const result = await manager.get(query)
        allData.push(...result.data)
      }
      
      // Mark range as loaded
      this.markRangeLoaded(chunkStart, chunkEnd)
      
      // Notify with data
      this.options.onData(allData)
      
      this.updateState({
        loadingState: "idle",
        lastLoadTime: Date.now(),
      })
      
      // Schedule prefetch
      if (this.options.prefetch) {
        this.schedulePrefetch(timestamp)
      }
      
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        this.updateState({
          loadingState: "error",
          error: error as Error,
        })
      }
    } finally {
      this.pendingRequest = null
    }
  }
  
  /**
   * Schedule prefetch of adjacent time ranges
   */
  private schedulePrefetch(currentTime: number): void {
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer)
    }
    
    this.prefetchTimer = setTimeout(async () => {
      await this.prefetchAround(currentTime)
    }, 500) // Wait 500ms before prefetching
  }
  
  /**
   * Prefetch data around the current time
   */
  private async prefetchAround(centerTime: number): Promise<void> {
    const ranges = [
      { start: centerTime, end: centerTime + PREFETCH_AHEAD_MS },
      { start: centerTime - PREFETCH_BEHIND_MS, end: centerTime },
    ]
    
    for (const range of ranges) {
      // Skip if already loaded
      if (this.isRangeLoaded(range.start, range.end)) {
        continue
      }
      
      this.updateState({ loadingState: "prefetching" })
      
      try {
        const manager = getTimelineCacheManager()
        
        for (const entityType of this.options.entityTypes) {
          await manager.get({
            entityType,
            startTime: range.start,
            endTime: range.end,
            limit: 5000,
          })
        }
        
        this.markRangeLoaded(range.start, range.end)
        
      } catch (error) {
        console.warn("[TimeLoader] Prefetch failed:", error)
      }
    }
    
    this.updateState({ loadingState: "idle" })
  }
  
  /**
   * Load data for a range (e.g., when user drags to select range)
   */
  async loadRange(startTime: number, endTime: number): Promise<TimelineDataPoint[]> {
    this.updateState({ loadingState: "loading" })
    
    try {
      const manager = getTimelineCacheManager()
      const allData: TimelineDataPoint[] = []
      
      for (const entityType of this.options.entityTypes) {
        const result = await manager.get({
          entityType,
          startTime,
          endTime,
          limit: 10000,
        })
        allData.push(...result.data)
      }
      
      this.markRangeLoaded(startTime, endTime)
      this.updateState({ loadingState: "idle" })
      
      return allData
      
    } catch (error) {
      this.updateState({ loadingState: "error", error: error as Error })
      throw error
    }
  }
  
  /**
   * Clear loaded ranges (e.g., when changing entity types)
   */
  clearLoadedRanges(): void {
    this.state.loadedRanges = []
    this.updateState({ loadedRanges: [] })
  }
  
  /**
   * Get current state
   */
  getState(): TimeLoaderState {
    return { ...this.state }
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    if (this.pendingRequest) {
      this.pendingRequest.abort()
    }
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer)
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer)
    }
  }
}

/**
 * Factory function to create a TimelineDataLoader
 */
export function createTimelineLoader(options: TimeLoaderOptions): TimelineDataLoader {
  return new TimelineDataLoader(options)
}

/**
 * Utility: Calculate optimal chunk size based on time range
 */
export function calculateChunkSize(rangeMs: number): number {
  if (rangeMs < 60 * 60 * 1000) {
    // Less than 1 hour: 5 minute chunks
    return 5 * 60 * 1000
  } else if (rangeMs < 24 * 60 * 60 * 1000) {
    // Less than 1 day: 1 hour chunks
    return 60 * 60 * 1000
  } else if (rangeMs < 7 * 24 * 60 * 60 * 1000) {
    // Less than 1 week: 6 hour chunks
    return 6 * 60 * 60 * 1000
  } else {
    // More than 1 week: 1 day chunks
    return 24 * 60 * 60 * 1000
  }
}

/**
 * Utility: Get time bucket boundaries
 */
export function getTimeBucket(timestamp: number, bucketSizeMs: number): { start: number; end: number } {
  const start = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs
  return { start, end: start + bucketSizeMs }
}