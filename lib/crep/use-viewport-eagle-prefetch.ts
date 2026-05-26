"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  loadViewportEagleSources,
  type EagleViewportSource,
} from "@/lib/crep/eagle-viewport-sources"
import {
  getViewportEagleCache,
  setViewportEagleCache,
  type ViewportBoundsLike,
} from "@/lib/crep/viewport-eagle-cache"
import {
  isSignificantViewportChange,
  makeViewportRevisionKey,
  type MapBoundsLike,
} from "@/lib/crep/viewport-revision"

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

export function useViewportEaglePrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
  assetsReady: boolean,
  limit = 12,
) {
  const effectiveBounds = useMemo(
    () => resolveEffectiveBounds(mapBounds),
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west, mapBounds],
  )

  const boundsCacheHit = useMemo(
    () => getViewportEagleCache(effectiveBounds, mapZoom),
    [effectiveBounds, mapZoom],
  )

  const [sources, setSources] = useState<EagleViewportSource[]>(() => boundsCacheHit ?? [])
  const [fetching, setFetching] = useState(
    () => assetsReady && !getViewportEagleCache(effectiveBounds, mapZoom)?.length,
  )

  const snapshotRef = useRef<{ bounds: ViewportBoundsLike; zoom: number } | null>(null)
  const revisionKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)

  const revisionKey = useMemo(() => {
    if (!assetsReady) return null
    const next = { bounds: effectiveBounds, zoom: mapZoom }
    const cityZoom = mapZoom >= 10
    const shouldRefresh =
      !snapshotRef.current ||
      cityZoom ||
      isSignificantViewportChange(snapshotRef.current, next)
    if (!shouldRefresh && revisionKeyRef.current) return revisionKeyRef.current
    snapshotRef.current = next
    const key = makeViewportRevisionKey(effectiveBounds, mapZoom)
    revisionKeyRef.current = key
    return key
  }, [effectiveBounds, mapZoom, assetsReady])

  useEffect(() => {
    if (!assetsReady || !revisionKey) return

    const cached = getViewportEagleCache(effectiveBounds, mapZoom)
    if (cached?.length) setSources(cached)

    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller

    if (!cached?.length) setFetching(true)

    void loadViewportEagleSources(
      effectiveBounds,
      limit,
      (next) => {
        if (controller.signal.aborted) return
        setSources(next)
        if (next.length) setViewportEagleCache(effectiveBounds, mapZoom, next)
      },
      controller.signal,
    )
      .catch((error) => {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[CREP/ViewportEaglePrefetch]", (error as Error)?.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false)
      })

    return () => controller.abort()
  }, [revisionKey, effectiveBounds, mapZoom, assetsReady, limit])

  return {
    sources,
    revisionKey,
    loading: fetching && sources.length === 0,
    refreshing: fetching && sources.length > 0,
    effectiveBounds,
  }
}
