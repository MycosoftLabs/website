/**
 * Client-side bounds cache for viewport environment (May 24, 2026).
 */

import type { ViewportBoundsLike } from "@/lib/crep/viewport-intel-cache"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface ViewportEnvironmentCacheEntry<T> {
  data: T
  fetchedAt: number
}

const memoryCache = new Map<string, ViewportEnvironmentCacheEntry<unknown>>()

export function buildViewportEnvironmentCacheKey(
  bounds: ViewportBoundsLike,
  zoom: number,
): string {
  const precision = zoom >= 12 ? 3 : zoom >= 8 ? 2 : 1
  const round = (n: number) => Number(n.toFixed(precision))
  return [
    "env",
    round(bounds.north),
    round(bounds.south),
    round(bounds.east),
    round(bounds.west),
    zoom.toFixed(1),
  ].join("|")
}

export function getViewportEnvironmentCache<T>(
  bounds: ViewportBoundsLike,
  zoom: number,
): T | null {
  const key = buildViewportEnvironmentCacheKey(bounds, zoom)
  const entry = memoryCache.get(key) as ViewportEnvironmentCacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > WEEK_MS) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

export function setViewportEnvironmentCache<T>(
  bounds: ViewportBoundsLike,
  zoom: number,
  data: T,
): void {
  memoryCache.set(buildViewportEnvironmentCacheKey(bounds, zoom), {
    data,
    fetchedAt: Date.now(),
  })
}
