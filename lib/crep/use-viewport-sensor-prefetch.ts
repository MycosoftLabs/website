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

export function useViewportSensorPrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
  assetsReady: boolean,
  limit = 8,
) {
  const effectiveBounds = useMemo(
    () => mapBounds,
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west, mapBounds],
  )

  const [sensors, setSensors] = useState<ViewportSensorSource[]>([])
  const [fetching, setFetching] = useState(false)
  const sensorsRef = useRef<ViewportSensorSource[]>([])
  const fetchingRef = useRef(false)

  const snapshotRef = useRef<{ bounds: MapBoundsLike; zoom: number } | null>(null)
  const revisionKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)

  const revisionKey = useMemo(() => {
    if (!assetsReady || !effectiveBounds) return null
    const next = { bounds: effectiveBounds, zoom: mapZoom }
    const shouldRefresh =
      !snapshotRef.current ||
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
      sensorsRef.current = []
      setSensors([])
      fetchingRef.current = false
      setFetching(false)
      return
    }
    const revision = snapshotRef.current
    if (!revision) return
    const requestBounds = revision.bounds

    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller
    if (!fetchingRef.current) {
      fetchingRef.current = true
      setFetching(true)
    }

    void loadViewportSensors(
      requestBounds,
      limit,
      (next) => {
        if (controller.signal.aborted) return
        const previous = sensorsRef.current
        if (
          previous.length === next.length &&
          previous.every((sensor, index) => sensor.id === next[index]?.id)
        ) {
          return
        }
        sensorsRef.current = next
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
        if (!controller.signal.aborted) {
          fetchingRef.current = false
          setFetching(false)
        }
      })

    return () => controller.abort()
  }, [revisionKey, assetsReady, limit])

  return {
    sensors,
    revisionKey,
    loading: fetching && sensors.length === 0,
    refreshing: fetching && sensors.length > 0,
    effectiveBounds,
  }
}
