"use client"

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface LazyLoaderProps {
  children: React.ReactNode
  /** Skeleton to show while loading */
  skeleton?: React.ReactNode
  /** Root margin for intersection observer (e.g., "100px") */
  rootMargin?: string
  /** Threshold for intersection (0-1) */
  threshold?: number
  /** Whether to unload when out of viewport (for memory management) */
  unloadOnExit?: boolean
  /** Delay before unloading (ms) */
  unloadDelay?: number
  /** Minimum height to reserve space */
  minHeight?: number | string
  /** Callback when component enters viewport */
  onVisible?: () => void
  /** Callback when component leaves viewport */
  onHidden?: () => void
  /** Force load regardless of visibility */
  forceLoad?: boolean
  /** CSS class for container */
  className?: string
}

/**
 * LazyLoader - Visibility-based lazy loading component
 * 
 * Only renders children when the component is visible in the viewport.
 * Optionally unloads children when they leave the viewport to save memory.
 */
export function LazyLoader({
  children,
  skeleton,
  rootMargin = "200px",
  threshold = 0.1,
  unloadOnExit = false,
  unloadDelay = 5000,
  minHeight = 200,
  onVisible,
  onHidden,
  forceLoad = false,
  className = "",
}: LazyLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(forceLoad)
  const [hasLoaded, setHasLoaded] = useState(forceLoad)
  const unloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (forceLoad) {
      setIsVisible(true)
      setHasLoaded(true)
      return
    }

    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        
        if (entry.isIntersecting) {
          // Clear any pending unload
          if (unloadTimeoutRef.current) {
            clearTimeout(unloadTimeoutRef.current)
            unloadTimeoutRef.current = null
          }
          
          setIsVisible(true)
          setHasLoaded(true)
          onVisible?.()
        } else {
          setIsVisible(false)
          onHidden?.()
          
          // Schedule unload if enabled
          if (unloadOnExit && hasLoaded) {
            unloadTimeoutRef.current = setTimeout(() => {
              setHasLoaded(false)
            }, unloadDelay)
          }
        }
      },
      {
        rootMargin,
        threshold,
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      if (unloadTimeoutRef.current) {
        clearTimeout(unloadTimeoutRef.current)
      }
    }
  }, [forceLoad, rootMargin, threshold, unloadOnExit, unloadDelay, hasLoaded, onVisible, onHidden])

  const defaultSkeleton = (
    <Card className="overflow-hidden animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
    >
      {hasLoaded ? children : (skeleton ?? defaultSkeleton)}
    </div>
  )
}

interface LazyComponentProps<P extends object> {
  /** Dynamic import function returning the component */
  loader: () => Promise<{ default: React.ComponentType<P> }>
  /** Props to pass to the loaded component */
  componentProps?: P
  /** Skeleton to show while loading */
  skeleton?: React.ReactNode
  /** Whether to use visibility-based loading */
  visibilityBased?: boolean
  /** Visibility loader options */
  visibilityOptions?: Omit<LazyLoaderProps, "children" | "skeleton">
}

/**
 * LazyComponent - Generic lazy component loader with visibility support
 */
export function LazyComponent<P extends object>({
  loader,
  componentProps = {} as P,
  skeleton,
  visibilityBased = false,
  visibilityOptions = {},
}: LazyComponentProps<P>) {
  const [Component, setComponent] = useState<React.ComponentType<P> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const loadComponent = useCallback(async () => {
    if (Component || loading) return
    
    setLoading(true)
    try {
      const loadedModule = await loader()
      if (mountedRef.current) {
        setComponent(() => loadedModule.default)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error("Failed to load component"))
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [Component, loading, loader])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!visibilityBased) {
      loadComponent()
    }
  }, [visibilityBased, loadComponent])

  const defaultSkeleton = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  const content = Component ? (
    <Suspense fallback={skeleton ?? defaultSkeleton}>
      <Component {...componentProps} />
    </Suspense>
  ) : error ? (
    <div className="flex flex-col items-center justify-center p-8 text-destructive">
      <p>Failed to load component</p>
      <button 
        onClick={() => { setError(null); loadComponent(); }}
        className="mt-2 text-sm underline"
      >
        Retry
      </button>
    </div>
  ) : (
    skeleton ?? defaultSkeleton
  )

  if (visibilityBased) {
    return (
      <LazyLoader
        {...visibilityOptions}
        skeleton={skeleton ?? defaultSkeleton}
        onVisible={loadComponent}
      >
        {content}
      </LazyLoader>
    )
  }

  return content
}

/**
 * Hook for tracking component visibility
 */
export function useIsVisible(
  ref: React.RefObject<HTMLElement>,
  options: { rootMargin?: string; threshold?: number } = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      {
        rootMargin: options.rootMargin ?? "0px",
        threshold: options.threshold ?? 0,
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, options.rootMargin, options.threshold])

  return isVisible
}
