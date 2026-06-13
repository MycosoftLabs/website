"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  getViewportEnvironmentCache,
  setViewportEnvironmentCache,
} from "@/lib/crep/viewport-environment-cache"
import type { ViewportBoundsLike } from "@/lib/crep/viewport-intel-cache"
import {
  isSignificantViewportChange,
  makeViewportRevisionKey,
  type MapBoundsLike,
} from "@/lib/crep/viewport-revision"

export interface ViewportEnvironmentPrefetchPayload {
  ok?: boolean
  generatedAt?: string
  lod?: string
  unitSystem?: "imperial" | "metric"
  weather?: Record<string, unknown>
  airQuality?: Record<string, unknown>
  alerts?: Record<string, unknown>
  live?: Record<string, unknown>
  features?: {
    status?: string
    water?: unknown[]
    ecosystems?: unknown[]
    geology?: unknown[]
  }
  [key: string]: unknown
}

const DEFAULT_US_BOUNDS: ViewportBoundsLike = {
  north: 50,
  south: 24,
  east: -66,
  west: -125,
}

function resolveEffectiveBounds(mapBounds: MapBoundsLike | null): ViewportBoundsLike {
  if (mapBounds) return mapBounds
  return DEFAULT_US_BOUNDS
}

export function useViewportEnvironmentPrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
  enabled = true,
) {
  const effectiveBounds = useMemo(
    () => resolveEffectiveBounds(mapBounds),
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west, mapBounds],
  )

  const boundsCacheHit = useMemo(
    () => enabled ? getViewportEnvironmentCache<ViewportEnvironmentPrefetchPayload>(effectiveBounds, mapZoom) : null,
    [effectiveBounds, mapZoom, enabled],
  )

  const [environment, setEnvironment] = useState<ViewportEnvironmentPrefetchPayload | null>(
    () => enabled ? boundsCacheHit : null,
  )
  const [fetching, setFetching] = useState(
    () => enabled && !getViewportEnvironmentCache<ViewportEnvironmentPrefetchPayload>(effectiveBounds, mapZoom),
  )

  const snapshotRef = useRef<{ bounds: ViewportBoundsLike; zoom: number } | null>(null)
  const revisionKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled) {
      inFlightRef.current?.abort()
      inFlightRef.current = null
      snapshotRef.current = null
      revisionKeyRef.current = null
      setEnvironment(null)
      setFetching(false)
      return
    }

    const next = { bounds: effectiveBounds, zoom: mapZoom }
    const shouldRefresh =
      !snapshotRef.current ||
      isSignificantViewportChange(snapshotRef.current, next)
    if (!shouldRefresh) return

    snapshotRef.current = next
    const revisionKey = makeViewportRevisionKey(effectiveBounds, mapZoom)
    if (revisionKeyRef.current === revisionKey) return
    revisionKeyRef.current = revisionKey

    const cached = getViewportEnvironmentCache<ViewportEnvironmentPrefetchPayload>(
      effectiveBounds,
      mapZoom,
    )
    if (cached) setEnvironment(cached)

    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller

    if (!cached) setFetching(true)

    const timer = window.setTimeout(() => {
      controller.abort()
      setFetching(false)
    }, 6_500)
    const debounce = cached ? 1_200 : 350
    const debounceTimer = window.setTimeout(() => {
    void (async () => {
      try {
        const q = new URLSearchParams({
          north: String(effectiveBounds.north),
          south: String(effectiveBounds.south),
          east: String(effectiveBounds.east),
          west: String(effectiveBounds.west),
          zoom: String(mapZoom),
        })
        const res = await fetch(`/api/crep/viewport-environment?${q}`, {
          signal: controller.signal,
          cache: "default",
        })
        if (res.ok) {
          const payload = (await res.json()) as ViewportEnvironmentPrefetchPayload
          setEnvironment(payload)
          setViewportEnvironmentCache(effectiveBounds, mapZoom, payload)
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[CREP/ViewportEnvironmentPrefetch]", (error as Error)?.message)
        }
      } finally {
        if (!controller.signal.aborted) setFetching(false)
      }
    })()
    }, debounce)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(debounceTimer)
      controller.abort()
    }
  }, [enabled, effectiveBounds, mapZoom])

  const hasDisplayContent = Boolean(
    environment?.weather?.current ||
      environment?.airQuality?.current ||
      (environment?.features?.water?.length ?? 0) > 0 ||
      (environment?.features?.ecosystems?.length ?? 0) > 0 ||
      (environment?.features?.geology?.length ?? 0) > 0 ||
      (((environment?.alerts as { items?: unknown[] } | undefined)?.items?.length ?? 0) > 0) ||
      ((environment?.live as { usgsEarthquakes?: unknown[] } | undefined)?.usgsEarthquakes?.length ?? 0) > 0,
  )

  return {
    environment,
    loading: fetching && !hasDisplayContent,
    refreshing: fetching && hasDisplayContent,
    effectiveBounds,
  }
}
