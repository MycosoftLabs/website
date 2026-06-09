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
import { resolveCivicFacilityHintsForViewport } from "@/lib/crep/civic-facility-hints"

export interface ViewportIntelPrefetchPayload {
  ok?: boolean
  place?: ViewportPlaceLike | null
  jurisdiction_stack?: unknown[]
  officials?: unknown[]
  civic?: { officials?: unknown[] }
  facilities?: { facilities?: unknown[]; status?: string }
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

function mergeCivicFacilityHints(
  intel: ViewportIntelPrefetchPayload | null | undefined,
  place: ViewportPlaceLike | null | undefined,
  bounds: ViewportBoundsLike,
): ViewportIntelPrefetchPayload | null {
  if (!intel) return null
  const existingFacilities = Array.isArray(intel.facilities?.facilities)
    ? intel.facilities.facilities
    : []
  if (existingFacilities.length > 0) return intel

  const sourcePlace = intel.place ?? place ?? null
  const hints = resolveCivicFacilityHintsForViewport({
    place: sourcePlace,
    bounds,
    limit: 12,
  })
  if (!hints.length) return intel

  return {
    ...intel,
    facilities: {
      ...(intel.facilities ?? {}),
      facilities: hints,
      status: "civic-fallback",
    },
  }
}

export function useViewportIntelPrefetch(
  mapBounds: MapBoundsLike | null,
  mapZoom: number,
  enabled = true,
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
    () => enabled ? getViewportIntelCacheByBounds<ViewportIntelPrefetchPayload>(effectiveBounds, mapZoom) : null,
    [effectiveBounds, mapZoom, enabled],
  )

  const [intel, setIntel] = useState<ViewportIntelPrefetchPayload | null>(
    () => enabled ? boundsCacheHit : null,
  )
  const [optimisticPlace, setOptimisticPlace] = useState<ViewportPlaceLike | null>(
    () => enabled ? boundsCacheHit?.place ?? null : null,
  )
  const [fetching, setFetching] = useState(
    () => enabled && !getViewportIntelCacheByBounds<ViewportIntelPrefetchPayload>(effectiveBounds, mapZoom),
  )

  const snapshotRef = useRef<{ bounds: ViewportBoundsLike; zoom: number } | null>(null)
  const revisionKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      inFlightRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      inFlightRef.current?.abort()
      inFlightRef.current = null
      snapshotRef.current = null
      revisionKeyRef.current = null
      setIntel(null)
      setOptimisticPlace(null)
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

    const boundsHit = getViewportIntelCacheByBounds<ViewportIntelPrefetchPayload>(
      effectiveBounds,
      mapZoom,
    )
    const cached = boundsHit

    if (cached) {
      const hydratedCached = mergeCivicFacilityHints(
        cached,
        cached.place ?? optimisticPlace,
        effectiveBounds,
      )
      setIntel(hydratedCached)
      if (hydratedCached?.place) setOptimisticPlace(hydratedCached.place)
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
    const nextOptimisticPlace =
      localPlaceHint ?? {
        displayName: `${geographyLodToLabel(geoLod)} viewport resolving`,
        lat: center.lat,
        lng: center.lng,
      }
    setOptimisticPlace(nextOptimisticPlace)

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
          const hydratedIntel = mergeCivicFacilityHints(
            nextIntel,
            nextIntel.place ?? nextOptimisticPlace,
            effectiveBounds,
          ) ?? nextIntel
          setIntel(hydratedIntel)
          setViewportIntelCacheForBounds(effectiveBounds, mapZoom, hydratedIntel)
          const jurisdictionKey = buildViewportJurisdictionKey(
            hydratedIntel.place ?? nextOptimisticPlace,
            lodLabel,
          )
          if (jurisdictionKey) setViewportIntelCache(jurisdictionKey, hydratedIntel)
          if (hydratedIntel.place) setOptimisticPlace(hydratedIntel.place)
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[CREP/ViewportIntelPrefetch]", (error as Error)?.message)
        }
      } finally {
        if (!controller.signal.aborted) setFetching(false)
      }
    })()

    // Do not return the controller abort here. Small map state churn can re-run
    // this effect without a significant viewport change; aborting in that path
    // leaves MYCA stuck on empty stale intel until the next large move.
  }, [enabled, effectiveBounds, mapZoom, lodLabel])

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
