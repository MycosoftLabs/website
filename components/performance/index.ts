/**
 * Performance utilities for Mycosoft website
 * 
 * This module provides:
 * - LazyLoader: Visibility-based component loading
 * - LazyComponent: Generic lazy loading with visibility support
 * - PrefetchLink: Optimized links with intelligent prefetching
 * - useIsVisible: Hook for tracking element visibility
 * 
 * Usage:
 * 
 * ```tsx
 * import { LazyLoader, PrefetchLink } from "@/components/performance"
 * 
 * // Lazy load heavy content when visible
 * <LazyLoader skeleton={<MySkeleton />}>
 *   <HeavyComponent />
 * </LazyLoader>
 * 
 * // Optimized navigation
 * <PrefetchLink href="/natureos" prefetchOnView>
 *   NatureOS
 * </PrefetchLink>
 * ```
 */

export { 
  LazyLoader, 
  LazyComponent, 
  useIsVisible,
  type LazyLoaderProps,
} from "./lazy-loader"

export { 
  PrefetchLink, 
  usePrefetch,
} from "./prefetch-link"

// Re-export hooks
export { 
  useCachedFetch, 
  prefetch, 
  clearCache, 
  getCached,
} from "@/hooks/use-cached-fetch"

export { 
  useComponentLifecycle,
  useManagedTimer,
  useManagedInterval,
  useManagedFetch,
  cleanupAllComponents,
  getActiveComponents,
} from "@/hooks/use-component-lifecycle"

// Re-export state management
export { 
  useAppState, 
  useToolState,
} from "@/contexts/app-state-context"

// Type exports
interface LazyLoaderProps {
  children: React.ReactNode
  skeleton?: React.ReactNode
  rootMargin?: string
  threshold?: number
  unloadOnExit?: boolean
  unloadDelay?: number
  minHeight?: number | string
  onVisible?: () => void
  onHidden?: () => void
  forceLoad?: boolean
  className?: string
}
