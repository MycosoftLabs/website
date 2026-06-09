"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  loadViewportEagleSources,
  type EagleViewportSource,
} from "@/lib/crep/eagle-viewport-sources"
import {
  getViewportEagleCache,
  setViewportEagleCache,
} from "@/lib/crep/viewport-eagle-cache"
import type { ViewportBoundsLike } from "@/lib/crep/viewport-intel-cache"
import {
  isSignificantViewportChange,
  makeViewportRevisionKey,
  type MapBoundsLike,
} from "@/lib/crep/viewport-revision"

function eagleSourcesEqual(a: EagleViewportSource[], b: EagleViewportSource[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]
    const right = b[i]
    if (
      left.id !== right.id ||
      Math.abs(left.lat - right.lat) > 0.000001 ||
      Math.abs(left.lng - right.lng) > 0.000001 ||
      left.stream_url !== right.stream_url ||
      left.embed_url !== right.embed_url ||
      left.media_url !== right.media_url
    ) {
      return false
    }
  }
  return true
}

export function useViewportEaglePrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
  assetsReady: boolean,
  limit = 12,
) {
  const shouldPrefetch = Boolean(mapBounds && assetsReady && mapZoom >= 7)
  const effectiveBounds = useMemo(
    () => mapBounds,
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west, mapBounds],
  )

  const boundsCacheHit = useMemo(
    () => effectiveBounds ? getViewportEagleCache(effectiveBounds, mapZoom) : undefined,
    [effectiveBounds, mapZoom],
  )

  const [sources, setSources] = useState<EagleViewportSource[]>(() => boundsCacheHit ?? [])
  const [fetching, setFetching] = useState(
    () => shouldPrefetch && !boundsCacheHit?.length,
  )
  const sourcesRef = useRef(sources)
  const fetchingRef = useRef(fetching)

  const snapshotRef = useRef<{ bounds: ViewportBoundsLike; zoom: number } | null>(null)
  const revisionKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)

  const revisionKey = useMemo(() => {
    if (!shouldPrefetch || !effectiveBounds) return null
    const next = { bounds: effectiveBounds, zoom: mapZoom }
    const shouldRefresh =
      !snapshotRef.current ||
      isSignificantViewportChange(snapshotRef.current, next)
    if (!shouldRefresh && revisionKeyRef.current) return revisionKeyRef.current
    snapshotRef.current = next
    const key = makeViewportRevisionKey(effectiveBounds, mapZoom)
    revisionKeyRef.current = key
    return key
  }, [effectiveBounds, mapZoom, shouldPrefetch])

  useEffect(() => {
    if (!shouldPrefetch || !revisionKey) {
      inFlightRef.current?.abort()
      inFlightRef.current = null
      sourcesRef.current = []
      setSources([])
      fetchingRef.current = false
      setFetching(false)
      return
    }
    const revision = snapshotRef.current
    if (!revision) return
    const requestBounds = revision.bounds
    const requestZoom = revision.zoom

    const cached = getViewportEagleCache(requestBounds, requestZoom)
    const commitSources = (next: EagleViewportSource[]) => {
      if (eagleSourcesEqual(sourcesRef.current, next)) return false
      sourcesRef.current = next
      setSources(next)
      return true
    }
    const commitFetching = (next: boolean) => {
      if (fetchingRef.current === next) return
      fetchingRef.current = next
      setFetching(next)
    }

    if (cached?.length) commitSources(cached)

    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller

    if (!cached?.length) commitFetching(true)

    void loadViewportEagleSources(
      requestBounds,
      limit,
      (next) => {
        if (controller.signal.aborted) return
        commitSources(next)
        if (next.length) setViewportEagleCache(requestBounds, requestZoom, next)
      },
      controller.signal,
    )
      .catch((error) => {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[CREP/ViewportEaglePrefetch]", (error as Error)?.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) commitFetching(false)
      })

    return () => controller.abort()
  }, [revisionKey, shouldPrefetch, limit])

  return {
    sources,
    revisionKey,
    loading: fetching && sources.length === 0,
    refreshing: fetching && sources.length > 0,
    effectiveBounds,
  }
}
