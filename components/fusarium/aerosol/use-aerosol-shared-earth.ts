"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  classifyAirNow,
  classifyEarth2Spore,
  classifyEarth2Wind,
  classifyFungalOccurrence,
  classifyMindexFeatureCollection,
  classifySporeBase,
  classifySporeBaseLab,
  failedSharedEarthStatus,
  isParticulateFeature,
  loadingSharedEarthStatuses,
  mergeSharedEarthStatuses,
  type SharedEarthLayerStatus,
} from "@/lib/fusarium/aerosol/shared-earth-contracts"

const GLOBAL_BBOX = "-179.9,-85,179.9,85"
const AIRNOW_US_BBOX = "-125,24,-66.5,50"

async function readJson(path: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("json")) throw new Error(`status ${response.status} did not return JSON`)
    return await response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "readiness read timed out"
  return error instanceof Error ? error.message : "readiness read failed"
}

export function useAerosolSharedEarth(active: boolean) {
  const [statuses, setStatuses] = useState<SharedEarthLayerStatus[]>(() => loadingSharedEarthStatuses())
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    const checkedAt = new Date().toISOString()
    setRefreshing(true)
    setStatuses(loadingSharedEarthStatuses(checkedAt))

    const [sporeResult, sporeBaseResult, sporeBaseLabResult, fungalOccurrenceResult, airResult, firmsResult, weatherResult, windResult, airNowResult] = await Promise.allSettled([
      readJson("/api/earth2/spore-dispersal?hours=24"),
      readJson("/api/devices/sporebase"),
      readJson("/api/devices/sporebase/samples?limit=2000"),
      // MINDEX-only keeps background readiness on the existing qualified CREP
      // occurrence chain without starting browser-side iNaturalist/GBIF crawls.
      readJson("/api/crep/fungal?quick=true&source=mindex-only&kingdom=Fungi&limit=2000"),
      readJson(`/api/crep/environment/air-quality?bbox=${encodeURIComponent(GLOBAL_BBOX)}&limit=2000`),
      readJson(`/api/crep/environment/wildfires?bbox=${encodeURIComponent(GLOBAL_BBOX)}&limit=2000`),
      readJson(`/api/crep/environment/weather?bbox=${encodeURIComponent(GLOBAL_BBOX)}&limit=2000`),
      // Bounded coarse readiness grid; the visible shared layer performs its own viewport read.
      readJson("/api/earth2/layers/wind?hours=0&north=40&south=30&east=-110&west=-120&resolution=2.5"),
      readJson(`/api/crep/airnow/bbox?bbox=${encodeURIComponent(AIRNOW_US_BBOX)}&parameters=PM25,OZONE`),
    ])

    const modeledSporeDispersal = sporeResult.status === "fulfilled"
      ? classifyEarth2Spore(sporeResult.value, checkedAt)
      : failedSharedEarthStatus("modeled-spore-dispersal", "earth2-spore", checkedAt, `Earth-2 modeled-dispersal readiness failed: ${errorMessage(sporeResult.reason)}.`)
    const sporebase = sporeBaseResult.status === "fulfilled"
      ? classifySporeBase(sporeBaseResult.value, checkedAt)
      : failedSharedEarthStatus("sporebase", "sporebase", checkedAt, `SporeBase readiness failed: ${errorMessage(sporeBaseResult.reason)}.`)
    const sporebaseLab = sporeBaseLabResult.status === "fulfilled"
      ? classifySporeBaseLab(sporeBaseLabResult.value, checkedAt)
      : failedSharedEarthStatus("sporebase-lab", "sporebase-lab", checkedAt, `SporeBase lab readiness failed: ${errorMessage(sporeBaseLabResult.reason)}.`)
    const fungalOccurrence = fungalOccurrenceResult.status === "fulfilled"
      ? classifyFungalOccurrence(fungalOccurrenceResult.value, checkedAt)
      : failedSharedEarthStatus("fungal-occurrence", "crep-fungal-occurrence", checkedAt, `Fungal occurrence readiness failed: ${errorMessage(fungalOccurrenceResult.reason)}.`)
    const airQualityMindex = airResult.status === "fulfilled"
      ? classifyMindexFeatureCollection({
          layerId: "air-quality",
          source: "mindex-air-quality",
          payload: airResult.value,
          checkedAt,
          freshnessMs: 2 * 60 * 60 * 1000,
          observedProperties: ["measuredAt"],
        })
      : failedSharedEarthStatus("air-quality", "mindex-air-quality", checkedAt, `MINDEX air-quality readiness failed: ${errorMessage(airResult.reason)}.`)
    const particulate = airResult.status === "fulfilled"
      ? classifyMindexFeatureCollection({
          layerId: "particulate",
          source: "mindex-air-quality",
          payload: airResult.value,
          checkedAt,
          freshnessMs: 2 * 60 * 60 * 1000,
          observedProperties: ["measuredAt"],
          featureFilter: isParticulateFeature,
        })
      : failedSharedEarthStatus("particulate", "mindex-air-quality", checkedAt, `MINDEX particulate readiness failed: ${errorMessage(airResult.reason)}.`)
    const fire = firmsResult.status === "fulfilled"
      ? classifyMindexFeatureCollection({
          layerId: "nasa-firms-fire",
          source: "mindex-firms",
          payload: firmsResult.value,
          checkedAt,
          freshnessMs: 12 * 60 * 60 * 1000,
          observedProperties: ["detectedAt"],
        })
      : failedSharedEarthStatus("nasa-firms-fire", "mindex-firms", checkedAt, `MINDEX FIRMS readiness failed: ${errorMessage(firmsResult.reason)}.`)
    const weather = weatherResult.status === "fulfilled"
      ? classifyMindexFeatureCollection({
          layerId: "wind",
          source: "mindex-weather",
          payload: weatherResult.value,
          checkedAt,
          freshnessMs: 60 * 60 * 1000,
          observedProperties: ["observedAt"],
          featureFilter: (feature) => {
            const properties = feature && typeof feature === "object" && "properties" in feature
              ? (feature as { properties?: unknown }).properties
              : null
            if (properties == null || typeof properties !== "object") return false
            const windSpeed = (properties as { windSpeedMs?: unknown }).windSpeedMs
            const windDirection = (properties as { windDirection?: unknown }).windDirection
            return (windSpeed != null && Number.isFinite(Number(windSpeed))) ||
              (windDirection != null && Number.isFinite(Number(windDirection)))
          },
        })
      : failedSharedEarthStatus("wind", "mindex-weather", checkedAt, `MINDEX weather readiness failed: ${errorMessage(weatherResult.reason)}.`)
    const earth2Wind = windResult.status === "fulfilled"
      ? classifyEarth2Wind(windResult.value, checkedAt)
      : failedSharedEarthStatus("wind", "earth2-wind", checkedAt, `Earth-2 wind readiness failed: ${errorMessage(windResult.reason)}.`)
    const airNow = airNowResult.status === "fulfilled"
      ? classifyAirNow(airNowResult.value, checkedAt)
      : failedSharedEarthStatus("air-quality", "airnow", checkedAt, `AirNow readiness failed: ${errorMessage(airNowResult.reason)}.`)

    if (requestId !== requestIdRef.current) return
    setStatuses([
      sporebase,
      sporebaseLab,
      fungalOccurrence,
      modeledSporeDispersal,
      particulate,
      fire,
      loadingSharedEarthStatuses(checkedAt).find((item) => item.layerId === "smoke")!,
      mergeSharedEarthStatuses("wind", [earth2Wind, weather], checkedAt),
      mergeSharedEarthStatuses("air-quality", [airQualityMindex, airNow], checkedAt),
    ])
    setLastCheckedAt(checkedAt)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    if (!active) return
    void refresh()
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 5 * 60 * 1000)
    return () => {
      window.clearInterval(interval)
      requestIdRef.current += 1
    }
  }, [active, refresh])

  return { statuses, lastCheckedAt, refreshing, refresh }
}
