/**
 * Client-side jurisdiction cache for viewport intelligence (May 24, 2026).
 * Stale-while-revalidate: instant panel updates on pan within the same jurisdiction.
 */

import type { ViewportPlaceLike } from "@/lib/crep/viewport-place"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface ViewportIntelCacheEntry<T> {
  data: T
  jurisdictionKey: string
  fetchedAt: number
}

const memoryCache = new Map<string, ViewportIntelCacheEntry<unknown>>()

export function buildViewportJurisdictionKey(
  place: ViewportPlaceLike | null | undefined,
  lodLabel: string,
): string | null {
  if (!place) return null
  const parts = [
    (place.countryCode || place.country || "").toLowerCase(),
    (place.state || "").toLowerCase(),
    (place.county || "").toLowerCase(),
    (place.city || "").toLowerCase(),
    lodLabel,
  ]
  if (!parts.some(Boolean)) return null
  return parts.join("|")
}

export function getViewportIntelCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as ViewportIntelCacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > WEEK_MS) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

export function setViewportIntelCache<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    jurisdictionKey: key,
    fetchedAt: Date.now(),
  })
}

export function findStaleViewportIntelCache<T>(
  place: ViewportPlaceLike | null | undefined,
  lodLabel: string,
): T | null {
  const exact = buildViewportJurisdictionKey(place, lodLabel)
  if (exact) {
    const hit = getViewportIntelCache<T>(exact)
    if (hit) return hit
  }
  if (!place) return null
  const prefixes = [
    buildViewportJurisdictionKey({ ...place, city: undefined }, lodLabel),
    buildViewportJurisdictionKey({ ...place, city: undefined, county: undefined }, lodLabel),
    buildViewportJurisdictionKey({ ...place, city: undefined, county: undefined, state: undefined }, lodLabel),
  ].filter(Boolean) as string[]
  for (const prefix of prefixes) {
    const hit = getViewportIntelCache<T>(prefix)
    if (hit) return hit
  }
  return null
}

export interface ViewportBoundsLike {
  north: number
  south: number
  east: number
  west: number
}

/** Bounds+zoom key for instant cache hits before reverse-geocode resolves. */
export function buildViewportBoundsCacheKey(
  bounds: ViewportBoundsLike,
  zoom: number,
): string {
  const precision = zoom >= 12 ? 3 : zoom >= 8 ? 2 : 1
  const round = (n: number) => Number(n.toFixed(precision))
  return [
    "bounds",
    round(bounds.north),
    round(bounds.south),
    round(bounds.east),
    round(bounds.west),
    zoom.toFixed(1),
  ].join("|")
}

export function getViewportIntelCacheByBounds<T>(
  bounds: ViewportBoundsLike,
  zoom: number,
): T | null {
  return getViewportIntelCache<T>(buildViewportBoundsCacheKey(bounds, zoom))
}

export function setViewportIntelCacheForBounds<T>(
  bounds: ViewportBoundsLike,
  zoom: number,
  data: T,
): void {
  setViewportIntelCache(buildViewportBoundsCacheKey(bounds, zoom), data)
}
