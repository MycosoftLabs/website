"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface CacheEntry<T> {
  data: T
  timestamp: number
  error?: Error
}

// Global cache store (persists across component unmounts)
const globalCache = new Map<string, CacheEntry<unknown>>()

// Active fetch promises (prevents duplicate requests)
const activeFetches = new Map<string, Promise<unknown>>()

// Cache configuration
interface CacheConfig {
  /** Time in ms before cache is considered stale (default: 5 minutes) */
  staleTime?: number
  /** Time in ms before cache is garbage collected (default: 30 minutes) */
  cacheTime?: number
  /** Whether to revalidate on window focus (default: true) */
  revalidateOnFocus?: boolean
  /** Whether to revalidate on reconnect (default: true) */
  revalidateOnReconnect?: boolean
  /** Retry count on error (default: 3) */
  retryCount?: number
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number
}

interface UseCachedFetchReturn<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isValidating: boolean
  isStale: boolean
  mutate: (data?: T) => void
  revalidate: () => Promise<void>
}

const DEFAULT_CONFIG: Required<CacheConfig> = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  retryCount: 3,
  retryDelay: 1000,
}

/**
 * useCachedFetch - SWR-like data fetching hook with caching
 * 
 * Features:
 * - Stale-while-revalidate pattern
 * - Deduplication of in-flight requests
 * - Automatic revalidation on focus/reconnect
 * - Retry on error
 * - Global cache that persists across mounts
 */
export function useCachedFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
): UseCachedFetchReturn<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [data, setData] = useState<T | null>(() => {
    if (!key) return null
    const cached = globalCache.get(key) as CacheEntry<T> | undefined
    return cached?.data ?? null
  })
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(!data && !!key)
  const [isValidating, setIsValidating] = useState(false)
  
  const mountedRef = useRef(true)
  const retryCountRef = useRef(0)

  // Check if cache is stale
  const isStale = useCallback(() => {
    if (!key) return false
    const cached = globalCache.get(key)
    if (!cached) return true
    return Date.now() - cached.timestamp > mergedConfig.staleTime
  }, [key, mergedConfig.staleTime])

  // Fetch data with deduplication
  const fetchData = useCallback(async (forceRevalidate = false): Promise<void> => {
    if (!key) return

    const cached = globalCache.get(key) as CacheEntry<T> | undefined
    const stale = isStale()

    // Return cached data if fresh and not forcing revalidate
    if (cached && !stale && !forceRevalidate) {
      if (mountedRef.current) {
        setData(cached.data)
        setIsLoading(false)
      }
      return
    }

    // Check for active fetch
    const activeFetch = activeFetches.get(key)
    if (activeFetch) {
      try {
        const result = await activeFetch as T
        if (mountedRef.current) {
          setData(result)
          setIsLoading(false)
          setIsValidating(false)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error("Fetch failed"))
          setIsLoading(false)
          setIsValidating(false)
        }
      }
      return
    }

    // Show stale data while revalidating
    if (cached && stale) {
      if (mountedRef.current) {
        setData(cached.data)
        setIsLoading(false)
        setIsValidating(true)
      }
    } else if (mountedRef.current) {
      setIsLoading(true)
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      let lastError: Error | null = null
      
      for (let attempt = 0; attempt <= mergedConfig.retryCount; attempt++) {
        try {
          const result = await fetcher()
          
          // Update cache
          globalCache.set(key, {
            data: result,
            timestamp: Date.now(),
          })
          
          return result
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Fetch failed")
          
          if (attempt < mergedConfig.retryCount) {
            await new Promise(resolve => 
              setTimeout(resolve, mergedConfig.retryDelay * (attempt + 1))
            )
          }
        }
      }
      
      throw lastError
    })()

    activeFetches.set(key, fetchPromise)

    try {
      const result = await fetchPromise
      if (mountedRef.current) {
        setData(result as T)
        setError(null)
        retryCountRef.current = 0
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error("Fetch failed"))
      }
    } finally {
      activeFetches.delete(key)
      if (mountedRef.current) {
        setIsLoading(false)
        setIsValidating(false)
      }
    }
  }, [key, fetcher, isStale, mergedConfig.retryCount, mergedConfig.retryDelay])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => {
      mountedRef.current = false
    }
  }, [fetchData])

  // Revalidate on focus
  useEffect(() => {
    if (!mergedConfig.revalidateOnFocus) return

    const handleFocus = () => {
      if (isStale()) {
        fetchData(true)
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [fetchData, isStale, mergedConfig.revalidateOnFocus])

  // Revalidate on reconnect
  useEffect(() => {
    if (!mergedConfig.revalidateOnReconnect) return

    const handleOnline = () => {
      fetchData(true)
    }

    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [fetchData, mergedConfig.revalidateOnReconnect])

  // Mutate cache manually
  const mutate = useCallback((newData?: T) => {
    if (!key) return
    
    if (newData !== undefined) {
      globalCache.set(key, {
        data: newData,
        timestamp: Date.now(),
      })
      setData(newData)
    } else {
      // Revalidate
      fetchData(true)
    }
  }, [key, fetchData])

  // Force revalidate
  const revalidate = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return {
    data,
    error,
    isLoading,
    isValidating,
    isStale: isStale(),
    mutate,
    revalidate,
  }
}

/**
 * Prefetch data into cache
 */
export async function prefetch<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  if (globalCache.has(key)) return
  
  try {
    const data = await fetcher()
    globalCache.set(key, { data, timestamp: Date.now() })
  } catch (err) {
    console.error(`Prefetch failed for ${key}:`, err)
  }
}

/**
 * Clear cache entry
 */
export function clearCache(key?: string): void {
  if (key) {
    globalCache.delete(key)
  } else {
    globalCache.clear()
  }
}

/**
 * Get cache entry without triggering fetch
 */
export function getCached<T>(key: string): T | null {
  const entry = globalCache.get(key) as CacheEntry<T> | undefined
  return entry?.data ?? null
}

// Garbage collection - run periodically to clean old entries
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes
    
    for (const [key, entry] of globalCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        globalCache.delete(key)
      }
    }
  }, 5 * 60 * 1000) // Run every 5 minutes
}
