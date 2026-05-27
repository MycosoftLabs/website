"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  boundsCenter,
  buildViewportGeographyContext,
  geographyLodToLabel,
  nominatimZoomForGeographyLod,
  resolveLocalViewportPlaceHint,
  resolveViewportGeographyLod,
  type ViewportPlaceLike,
} from "@/lib/crep/viewport-place"
import {
  buildViewportJurisdictionKey,
  getViewportIntelCacheByBounds,
  setViewportIntelCache,
  setViewportIntelCacheForBounds,
  type ViewportBoundsLike,
} from "@/lib/crep/viewport-intel-cache"
import {
  isSignificantViewportChange,
  makeViewportRevisionKey,
  type MapBoundsLike,
} from "@/lib/crep/viewport-revision"

export interface ViewportIntelPrefetchPayload {
  ok?: boolean
  place?: ViewportPlaceLike | null
  jurisdiction_stack?: unknown[]
  officials?: unknown[]
  civic?: { officials?: unknown[] }
  facilities?: { facilities?: unknown[] }
  elections?: unknown[]
  legislation?: unknown[]
  media_gallery?: unknown[]
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

export function useViewportIntelPrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
) {
  const effectiveBounds = useMemo(
    () => resolveEffectiveBounds(mapBounds),
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west, mapBounds],
  )

  const lodLabel = useMemo(() => {
    const ctx = buildViewportGeographyContext(null, mapZoom, effectiveBounds, {
      regionLabel: "",
    })
    return ctx.lodLabel
  }, [mapZoom, effectiveBounds])

  const boundsCacheHit = useMemo(
    () => getViewportIntelCacheByBounds<ViewportIntelPrefetchPayload>(effectiveBounds, mapZoom),
    [effectiveBounds, mapZoom],
  )

  const [intel, setIntel] = useState<ViewportIntelPrefetchPayload | null>(
    () => boundsCacheHit,
  )
  const [optimisticPlace, setOptimisticPlace] = useState<ViewportPlaceLike | null>(
    () => boundsCacheHit?.place ?? null,
  )
  const [fetching, setFetching] = useState(
    () => !getViewportIntelCacheByBounds<ViewportIntelPrefetchPayload>(effectiveBounds, mapZoom),
  )

  const snapshotRef = useRef<{ bounds: ViewportBoundsLike; zoom: number } | null>(null)
  const revisionKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const next = { bounds: effectiveBounds, zoom: mapZoom }
    const shouldRefresh =
      !snapshotRef.current ||
      isSignificantViewportChange(snapshotRef.current, next)
    if (!shouldRefresh) return

    snapshotRef.current = next
    const revisionKey = makeViewportRevisionKey(effectiveBounds, mapZoom)
    if (revisionKeyRef.current === revisionKey) return
    revisionKeyRef.current = revisionKey

    const boundsHit = getViewportIntelCacheByBounds<ViewportIntelPrefetchPayload>(
      effectiveBounds,
      mapZoom,
    )
    const cached = boundsHit

    if (cached) {
      setIntel(cached)
      if (cached.place) setOptimisticPlace(cached.place)
    } else {
      setIntel(null)
    }

    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller

    setFetching(true)

    const center = boundsCenter(effectiveBounds)
    const geoLod = resolveViewportGeographyLod(mapZoom, effectiveBounds)
    const localPlaceHint = resolveLocalViewportPlaceHint(center.lat, center.lng)
    setOptimisticPlace(
      localPlaceHint ?? {
        displayName: `${geographyLodToLabel(geoLod)} viewport resolving`,
        lat: center.lat,
        lng: center.lng,
      },
    )

    void (async () => {
      try {
        const geocodeQ = new URLSearchParams({
          lat: String(center.lat),
          lng: String(center.lng),
          zoom: String(nominatimZoomForGeographyLod(geoLod)),
        })

        const intelQ = new URLSearchParams({
          north: String(effectiveBounds.north),
          south: String(effectiveBounds.south),
          east: String(effectiveBounds.east),
          west: String(effectiveBounds.west),
          zoom: String(mapZoom),
        })

        const [geocodeRes, intelRes] = await Promise.allSettled([
          fetch(`/api/crep/reverse-geocode?${geocodeQ}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/crep/viewport-intel?${intelQ}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ])

        if (geocodeRes.status === "fulfilled" && geocodeRes.value.ok) {
          const data = await geocodeRes.value.json()
          setOptimisticPlace({
            displayName: data.address ?? undefined,
            city: data.place ?? undefined,
            county: data.county ?? undefined,
            state: data.admin ?? undefined,
            country: data.country ?? undefined,
            countryCode: data.country_code ?? undefined,
            lat: center.lat,
            lng: center.lng,
          })
        }

        if (intelRes.status === "fulfilled" && intelRes.value.ok) {
          const nextIntel = (await intelRes.value.json()) as ViewportIntelPrefetchPayload
          setIntel(nextIntel)
          setViewportIntelCacheForBounds(effectiveBounds, mapZoom, nextIntel)
          const jurisdictionKey = buildViewportJurisdictionKey(
            nextIntel.place ?? optimisticPlace,
            lodLabel,
          )
          if (jurisdictionKey) setViewportIntelCache(jurisdictionKey, nextIntel)
          if (nextIntel.place) setOptimisticPlace(nextIntel.place)
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[CREP/ViewportIntelPrefetch]", (error as Error)?.message)
        }
      } finally {
        if (!controller.signal.aborted) setFetching(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [effectiveBounds, mapZoom, lodLabel])

  const hasDisplayContent = Boolean(intel || optimisticPlace)

  return {
    intel,
    optimisticPlace,
    /** True only when fetching and nothing to render yet (avoids blank tab on switch). */
    loading: fetching && !hasDisplayContent,
    /** True when refreshing in background while stale/cached content is visible. */
    refreshing: fetching && hasDisplayContent,
    effectiveBounds,
    lodLabel: geographyLodToLabel(
      resolveViewportGeographyLod(mapZoom, effectiveBounds),
    ),
  }
}
