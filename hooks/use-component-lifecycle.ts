"use client"

import { useEffect, useRef, useCallback } from "react"

type CleanupFn = () => void
type CleanupRegistry = Map<string, CleanupFn>

// Global cleanup registry
const globalCleanupRegistry: CleanupRegistry = new Map()

interface UseComponentLifecycleOptions {
  /** Unique ID for this component instance */
  id: string
  /** Called when component mounts */
  onMount?: () => void | CleanupFn
  /** Called when component unmounts */
  onUnmount?: () => void
  /** Called when component becomes visible */
  onVisible?: () => void
  /** Called when component becomes hidden */
  onHidden?: () => void
  /** Cleanup expensive resources when hidden (timers, subscriptions, etc.) */
  cleanupOnHidden?: boolean
  /** Resources to clean up (timers, subscriptions, etc.) */
  resources?: {
    timers?: NodeJS.Timeout[]
    intervals?: NodeJS.Timeout[]
    subscriptions?: { unsubscribe: () => void }[]
    abortControllers?: AbortController[]
    custom?: CleanupFn[]
  }
}

/**
 * useComponentLifecycle - Manages component lifecycle with proper cleanup
 * 
 * Features:
 * - Automatic cleanup of timers, intervals, subscriptions
 * - Visibility-based resource management
 * - Global cleanup registry for emergency cleanup
 * - Prevents memory leaks
 */
export function useComponentLifecycle({
  id,
  onMount,
  onUnmount,
  onVisible,
  onHidden,
  cleanupOnHidden = false,
  resources = {},
}: UseComponentLifecycleOptions) {
  const mountedRef = useRef(true)
  const cleanupFnRef = useRef<CleanupFn | null>(null)
  const resourcesRef = useRef(resources)

  // Update resources ref
  useEffect(() => {
    resourcesRef.current = resources
  }, [resources])

  // Cleanup function
  const cleanup = useCallback(() => {
    const res = resourcesRef.current

    // Clear timers
    res.timers?.forEach(timer => clearTimeout(timer))
    
    // Clear intervals
    res.intervals?.forEach(interval => clearInterval(interval))
    
    // Unsubscribe subscriptions
    res.subscriptions?.forEach(sub => sub.unsubscribe())
    
    // Abort fetch requests
    res.abortControllers?.forEach(controller => controller.abort())
    
    // Run custom cleanup
    res.custom?.forEach(fn => fn())
    
    // Run mount cleanup if provided
    cleanupFnRef.current?.()
  }, [])

  // Register cleanup in global registry
  useEffect(() => {
    globalCleanupRegistry.set(id, cleanup)
    return () => {
      globalCleanupRegistry.delete(id)
    }
  }, [id, cleanup])

  // Mount/unmount lifecycle
  useEffect(() => {
    mountedRef.current = true
    
    // Run onMount and store cleanup function
    const result = onMount?.()
    if (typeof result === "function") {
      cleanupFnRef.current = result
    }

    return () => {
      mountedRef.current = false
      cleanup()
      onUnmount?.()
    }
  }, [onMount, onUnmount, cleanup])

  // Visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onVisible?.()
      } else {
        onHidden?.()
        if (cleanupOnHidden) {
          cleanup()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [onVisible, onHidden, cleanupOnHidden, cleanup])

  return {
    isMounted: () => mountedRef.current,
    cleanup,
  }
}

/**
 * Hook for managing timers with automatic cleanup
 */
export function useManagedTimer() {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set())

  const setTimeout_ = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, delay)
    timersRef.current.add(timer)
    return timer
  }, [])

  const clearTimeout_ = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer)
    timersRef.current.delete(timer)
  }, [])

  const clearAll = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer))
    timersRef.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  return { setTimeout: setTimeout_, clearTimeout: clearTimeout_, clearAll }
}

/**
 * Hook for managing intervals with automatic cleanup
 */
export function useManagedInterval() {
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set())

  const setInterval_ = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = setInterval(callback, delay)
    intervalsRef.current.add(interval)
    return interval
  }, [])

  const clearInterval_ = useCallback((interval: NodeJS.Timeout) => {
    clearInterval(interval)
    intervalsRef.current.delete(interval)
  }, [])

  const clearAll = useCallback(() => {
    intervalsRef.current.forEach(interval => clearInterval(interval))
    intervalsRef.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval))
    }
  }, [])

  return { setInterval: setInterval_, clearInterval: clearInterval_, clearAll }
}

/**
 * Hook for managing fetch requests with automatic abort on unmount
 */
export function useManagedFetch() {
  const controllersRef = useRef<Set<AbortController>>(new Set())

  const fetch_ = useCallback(async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const controller = new AbortController()
    controllersRef.current.add(controller)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      return response
    } finally {
      controllersRef.current.delete(controller)
    }
  }, [])

  const abortAll = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort())
    controllersRef.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllersRef.current.forEach(controller => controller.abort())
    }
  }, [])

  return { fetch: fetch_, abortAll }
}

/**
 * Emergency cleanup - call when app needs to release all resources
 */
export function cleanupAllComponents(): void {
  globalCleanupRegistry.forEach(cleanup => cleanup())
  globalCleanupRegistry.clear()
}

/**
 * Get list of active component IDs (for debugging)
 */
export function getActiveComponents(): string[] {
  return Array.from(globalCleanupRegistry.keys())
}
