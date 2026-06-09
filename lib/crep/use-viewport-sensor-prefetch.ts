"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  loadViewportSensors,
  type ViewportSensorSource,
} from "@/lib/crep/viewport-sensor-sources"
import {
  isSignificantViewportChange,
  makeViewportRevisionKey,
  type MapBoundsLike,
} from "@/lib/crep/viewport-revision"

const DEFAULT_US_BOUNDS: MapBoundsLike = {
  north: 50,
  south: 24,
  east: -66,
  west: -125,
}

function resolveEffectiveBounds(mapBounds: MapBoundsLike | null): MapBoundsLike {
  if (mapBounds) return mapBounds
  return DEFAULT_US_BOUNDS
}

export function useViewportSensorPrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
  assetsReady: boolean,
  limit = 8,
) {
  const effectiveBounds = useMemo(
    () => resolveEffectiveBounds(mapBounds),
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west, mapBounds],
  )

  const [sensors, setSensors] = useState<ViewportSensorSource[]>([])
  const [fetching, setFetching] = useState(false)

  const snapshotRef = useRef<{ bounds: MapBoundsLike; zoom: number } | null>(null)
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
    if (!assetsReady || !revisionKey) {
      inFlightRef.current?.abort()
      inFlightRef.current = null
      snapshotRef.current = null
      revisionKeyRef.current = null
      setSensors([])
      setFetching(false)
      return
    }

    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller
    setFetching(true)

    void loadViewportSensors(
      effectiveBounds,
      limit,
      (next) => {
        if (controller.signal.aborted) return
        setSensors(next)
      },
      controller.signal,
    )
      .catch((error) => {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[CREP/ViewportSensorPrefetch]", (error as Error)?.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false)
      })

    return () => controller.abort()
  }, [revisionKey, effectiveBounds, assetsReady, limit])

  return {
    sensors,
    revisionKey,
    loading: fetching && sensors.length === 0,
    refreshing: fetching && sensors.length > 0,
    effectiveBounds,
  }
}
