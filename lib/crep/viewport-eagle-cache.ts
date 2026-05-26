/**
 * Client-side bounds cache for viewport Eagle Eye sources (May 24, 2026).
 */

import type { EagleViewportSource } from "@/lib/crep/eagle-viewport-sources"
import type { ViewportBoundsLike } from "@/lib/crep/viewport-intel-cache"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface ViewportEagleCacheEntry {
  sources: EagleViewportSource[]
  fetchedAt: number
}

const memoryCache = new Map<string, ViewportEagleCacheEntry>()

export function buildViewportEagleCacheKey(
  bounds: ViewportBoundsLike,
  zoom: number,
): string {
  const precision = zoom >= 12 ? 3 : zoom >= 8 ? 2 : 1
  const round = (n: number) => Number(n.toFixed(precision))
  return [
    "eagle",
    round(bounds.north),
    round(bounds.south),
    round(bounds.east),
    round(bounds.west),
    zoom.toFixed(1),
  ].join("|")
}

export function getViewportEagleCache(
  bounds: ViewportBoundsLike,
  zoom: number,
): EagleViewportSource[] | null {
  const key = buildViewportEagleCacheKey(bounds, zoom)
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > WEEK_MS) {
    memoryCache.delete(key)
    return null
  }
  return entry.sources
}

export function setViewportEagleCache(
  bounds: ViewportBoundsLike,
  zoom: number,
  sources: EagleViewportSource[],
): void {
  memoryCache.set(buildViewportEagleCacheKey(bounds, zoom), {
    sources,
    fetchedAt: Date.now(),
  })
}
