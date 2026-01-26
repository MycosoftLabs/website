"use client"

import React, { useRef, useEffect, useCallback, useState } from "react"
import Link, { LinkProps } from "next/link"
import { useRouter } from "next/navigation"

interface PrefetchLinkProps extends Omit<LinkProps, "prefetch"> {
  children: React.ReactNode
  className?: string
  /** Prefetch when link enters viewport */
  prefetchOnView?: boolean
  /** Prefetch on hover (default: true) */
  prefetchOnHover?: boolean
  /** Delay before prefetch on hover (ms) */
  hoverDelay?: number
  /** Root margin for viewport prefetch */
  viewportMargin?: string
  /** Whether to show loading state during navigation */
  showLoadingState?: boolean
  /** Callback before navigation */
  onNavigate?: () => void
  /** Additional data to prefetch */
  prefetchData?: Array<{ key: string; fetcher: () => Promise<unknown> }>
}

/**
 * PrefetchLink - Optimized link component with intelligent prefetching
 * 
 * Features:
 * - Viewport-based prefetching (when link scrolls into view)
 * - Hover-based prefetching with delay
 * - Data prefetching alongside route prefetch
 * - Navigation callback for cleanup
 */
export function PrefetchLink({
  children,
  className,
  prefetchOnView = true,
  prefetchOnHover = true,
  hoverDelay = 100,
  viewportMargin = "200px",
  showLoadingState = false,
  onNavigate,
  prefetchData = [],
  ...linkProps
}: PrefetchLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const router = useRouter()
  const [isPrefetched, setIsPrefetched] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prefetchedDataRef = useRef<Set<string>>(new Set())

  // Prefetch the route
  const prefetchRoute = useCallback(() => {
    if (isPrefetched) return
    
    const href = typeof linkProps.href === "string" 
      ? linkProps.href 
      : linkProps.href.pathname ?? ""
    
    if (href) {
      router.prefetch(href)
      setIsPrefetched(true)
    }
  }, [isPrefetched, linkProps.href, router])

  // Prefetch additional data
  const prefetchAdditionalData = useCallback(async () => {
    for (const { key, fetcher } of prefetchData) {
      if (prefetchedDataRef.current.has(key)) continue
      
      try {
        await fetcher()
        prefetchedDataRef.current.add(key)
      } catch (err) {
        console.error(`Failed to prefetch data for ${key}:`, err)
      }
    }
  }, [prefetchData])

  // Viewport-based prefetching
  useEffect(() => {
    if (!prefetchOnView) return
    
    const link = linkRef.current
    if (!link) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          prefetchRoute()
          prefetchAdditionalData()
          observer.disconnect()
        }
      },
      { rootMargin: viewportMargin }
    )

    observer.observe(link)
    return () => observer.disconnect()
  }, [prefetchOnView, viewportMargin, prefetchRoute, prefetchAdditionalData])

  // Hover-based prefetching
  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover || isPrefetched) return
    
    hoverTimeoutRef.current = setTimeout(() => {
      prefetchRoute()
      prefetchAdditionalData()
    }, hoverDelay)
  }, [prefetchOnHover, isPrefetched, hoverDelay, prefetchRoute, prefetchAdditionalData])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  // Handle click with callback
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.()
    
    if (showLoadingState) {
      setIsNavigating(true)
    }
  }, [onNavigate, showLoadingState])

  // Cleanup
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Link
      ref={linkRef}
      {...linkProps}
      prefetch={false} // We handle prefetch ourselves
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-prefetched={isPrefetched}
      data-navigating={isNavigating}
    >
      {children}
    </Link>
  )
}

/**
 * Hook for programmatic prefetching
 */
export function usePrefetch() {
  const router = useRouter()

  const prefetch = useCallback((href: string) => {
    router.prefetch(href)
  }, [router])

  const prefetchMultiple = useCallback((hrefs: string[]) => {
    hrefs.forEach(href => router.prefetch(href))
  }, [router])

  return { prefetch, prefetchMultiple }
}
