"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Bot,
  Camera,
  Clock3,
  Crosshair,
  Leaf,
  Loader2,
  MapPin,
  Plane,
  Radio,
  Satellite,
  Ship,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import EagleEyeThumbnailGrid, { openEagleCamera } from "@/components/crep/eagle-eye/EagleEyeThumbnailGrid"
import ViewportSensorGrid from "@/components/crep/eagle-eye/ViewportSensorGrid"
import type { ViewportSensorSource } from "@/lib/crep/viewport-sensor-sources"
import {
  bboxKeyFromBounds,
  loadViewportEagleSources,
  type EagleViewportSource,
} from "@/lib/crep/eagle-viewport-sources"
import {
  isSignificantViewportChange,
  makeViewportRevisionKey,
  type MapBoundsLike,
} from "@/lib/crep/viewport-revision"
interface GlobalEventLike {
  id: string
  title: string
  type?: string
  severity?: string
  source?: string
  lat?: number
  lng?: number
}

interface FungalObservationLike {
  id?: string | number
  latitude?: number
  longitude?: number
  species?: string
  species_guess?: string
  taxon_name?: string
  kingdom?: string
  taxon?: { name?: string; preferred_common_name?: string }
}

type AnalysisMentionKind = "event" | "species" | "camera" | "viewport" | "aircraft" | "vessel" | "satellite"
type AnalysisTriggerReason = "initial" | "camera" | "data" | "selection" | "interaction"

interface AnalysisMention {
  id: string
  kind: AnalysisMentionKind
  label: string
  detail?: string
  lat?: number
  lng?: number
  zoom?: number
  camera?: EagleViewportSource
}

interface AnalysisFact {
  label: string
  value: string
}

interface SelectedViewportContext {
  key: string
  kind: string
  label: string
  detail?: string
  lat?: number
  lng?: number
  zoom?: number
  facts?: AnalysisFact[]
  metadata?: Record<string, string | number | boolean | null | undefined>
}

interface ViewportIntelLike {
  place?: {
    displayName?: string
    city?: string
    county?: string
    state?: string
    country?: string
  } | null
  officials?: unknown[]
  civic?: { officials?: unknown[] } | null
  facilities?: { facilities?: unknown[] } | null
  jurisdiction_stack?: unknown[]
}

interface AnalysisSection {
  id: string
  title: string
  metric: string
  detail: string
  tone: "event" | "nature" | "motion" | "civic" | "sensor" | "selection"
  Icon: LucideIcon
  action?: AnalysisMention
  facts?: AnalysisFact[]
}

interface MycaViewportPanelProps {
  mapBounds: MapBoundsLike | null
  mapZoom: number
  assetsReady: boolean
  latestViewportEvents: GlobalEventLike[]
  visibleFungalObservations: FungalObservationLike[]
  aircraftCount: number
  vesselCount: number
  satelliteCount: number
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void
  selectedContext?: SelectedViewportContext | null
  prefetchedIntel?: ViewportIntelLike | null
  prefetchedIntelLoading?: boolean
  prefetchedEnvironment?: { weather?: EnvWeather; airQuality?: { current?: AirQualityCurrent } } | null
  prefetchedEnvironmentLoading?: boolean
  prefetchedEagleSources?: EagleViewportSource[] | null
  prefetchedEagleLoading?: boolean
  prefetchedRevisionKey?: string | null
  prefetchedSensors?: ViewportSensorSource[] | null
  prefetchedSensorsLoading?: boolean
}

interface AirQualityCurrent {
  us_aqi?: number
  pm2_5?: number
  pm10?: number
}

interface EnvWeather {
  current?: Record<string, number | string | null>
  units?: Record<string, string>
  forecastDaily?: Record<string, unknown[]>
}

const ACTIVE_ANALYSIS_MIN_MS = 30_000
const IDLE_ANALYSIS_MIN_MS = 5 * 60_000
const INITIAL_ANALYSIS_SETTLE_MS = 2_800
const INTERACTION_ANALYSIS_SETTLE_MS = 260
const CAMERA_ANALYSIS_SETTLE_MS = 1_250
const EMPTY_EAGLE_SOURCES: EagleViewportSource[] = []

function center(bounds: MapBoundsLike) {
  let lng = (bounds.east + bounds.west) / 2
  if (bounds.west > bounds.east) lng = ((bounds.east + 360 + bounds.west) / 2) % 360
  if (lng > 180) lng -= 360
  return { lat: (bounds.north + bounds.south) / 2, lng }
}

function speciesLabel(obs: FungalObservationLike) {
  return (
    obs.taxon?.preferred_common_name ||
    obs.species ||
    obs.species_guess ||
    obs.taxon_name ||
    obs.taxon?.name ||
    "Unknown"
  )
}

function formatMetric(value: unknown, digits = 0, suffix = "") {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n.toFixed(digits)}${suffix}`
}

function cloneBounds(bounds: MapBoundsLike): MapBoundsLike {
  return {
    north: bounds.north,
    south: bounds.south,
    east: bounds.east,
    west: bounds.west,
  }
}

function compactText(value: string, max = 30) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value
}

function listIds<T>(items: T[], getId: (item: T) => unknown, limit = 8) {
  return items
    .slice(0, limit)
    .map((item) => String(getId(item) ?? ""))
    .filter(Boolean)
    .join("|")
}

function arrayCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function placeLabel(intel?: ViewportIntelLike | null) {
  const place = intel?.place
  return (
    place?.displayName ||
    [place?.city, place?.county, place?.state, place?.country].filter(Boolean).join(", ") ||
    "Viewport"
  )
}

function intelContentScore(intel?: ViewportIntelLike | null): number {
  return (
    arrayCount(intel?.officials) +
    arrayCount(intel?.civic?.officials) +
    arrayCount(intel?.facilities?.facilities)
  )
}

function formatElapsed(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "now"
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)}m`
}

function mentionIcon(kind: AnalysisMentionKind) {
  switch (kind) {
    case "event":
      return Radio
    case "species":
      return Leaf
    case "camera":
      return Camera
    case "viewport":
      return Crosshair
    case "aircraft":
      return Plane
    case "vessel":
      return Ship
    case "satellite":
      return Satellite
    default:
      return MapPin
  }
}

function mentionTone(kind: AnalysisMentionKind) {
  switch (kind) {
    case "event":
      return "border-orange-500/40 bg-orange-950/30 text-orange-100 hover:border-orange-400/70"
    case "species":
      return "border-green-500/40 bg-green-950/30 text-green-100 hover:border-green-400/70"
    case "camera":
      return "border-cyan-500/40 bg-cyan-950/30 text-cyan-100 hover:border-cyan-400/70"
    case "viewport":
      return "border-purple-500/40 bg-purple-950/40 text-purple-100 hover:border-purple-400/70"
    case "aircraft":
      return "border-amber-500/40 bg-amber-950/30 text-amber-100 hover:border-amber-400/70"
    case "vessel":
      return "border-sky-500/40 bg-sky-950/30 text-sky-100 hover:border-sky-400/70"
    case "satellite":
      return "border-violet-500/40 bg-violet-950/30 text-violet-100 hover:border-violet-400/70"
    default:
      return "border-gray-500/40 bg-black/30 text-gray-100"
  }
}

function sectionTone(tone: AnalysisSection["tone"]) {
  switch (tone) {
    case "event":
      return "border-orange-500/30 bg-orange-950/20 text-orange-100"
    case "nature":
      return "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
    case "motion":
      return "border-sky-500/30 bg-sky-950/20 text-sky-100"
    case "civic":
      return "border-violet-500/30 bg-violet-950/20 text-violet-100"
    case "sensor":
      return "border-cyan-500/30 bg-cyan-950/20 text-cyan-100"
    case "selection":
      return "border-fuchsia-500/35 bg-fuchsia-950/25 text-fuchsia-100"
    default:
      return "border-gray-500/30 bg-black/25 text-gray-100"
  }
}

function selectedKindToMentionKind(kind?: string): AnalysisMentionKind {
  switch ((kind || "").toLowerCase()) {
    case "event":
      return "event"
    case "species":
    case "fungal":
    case "nature":
      return "species"
    case "camera":
      return "camera"
    case "aircraft":
      return "aircraft"
    case "vessel":
    case "ship":
      return "vessel"
    case "satellite":
      return "satellite"
    default:
      return "viewport"
  }
}

function factsFromMetadata(metadata?: SelectedViewportContext["metadata"]): AnalysisFact[] {
  if (!metadata) return []
  return Object.entries(metadata)
    .map(([label, value]) => {
      if (value == null || value === "") return null
      return { label, value: String(value) }
    })
    .filter((fact): fact is AnalysisFact => Boolean(fact))
}

function selectedFacts(selectedContext?: SelectedViewportContext | null): AnalysisFact[] {
  return (selectedContext?.facts?.length ? selectedContext.facts : factsFromMetadata(selectedContext?.metadata)).slice(0, 6)
}

function formatFactsInline(facts: AnalysisFact[], limit = 3): string {
  return facts
    .slice(0, limit)
    .map((fact) => `${fact.label}: ${fact.value}`)
    .join("; ")
}

function sectionRelevance(section: AnalysisSection, selectedContext?: SelectedViewportContext | null): number {
  const kind = (selectedContext?.kind || "").toLowerCase()
  if (section.id === "selected") return 0
  if (kind) {
    if (kind.includes("species") || kind.includes("fung") || kind.includes("nature")) {
      if (section.id === "nature") return 1
      if (section.id === "sensors") return 2
    }
    if (
      kind.includes("event") ||
      kind.includes("earthquake") ||
      kind.includes("fire") ||
      kind.includes("storm") ||
      kind.includes("flood") ||
      kind.includes("weather") ||
      kind.includes("volcano") ||
      kind.includes("tornado")
    ) {
      if (section.id === "events") return 1
      if (section.id === "sensors") return 2
    }
    if (kind.includes("aircraft") || kind.includes("vessel") || kind.includes("ship") || kind.includes("satellite")) {
      if (section.id === "motion") return 1
      if (section.id === "sensors") return 2
    }
    if (
      kind.includes("camera") ||
      kind.includes("sensor") ||
      kind.includes("buoy") ||
      kind.includes("radar") ||
      kind.includes("tower") ||
      kind.includes("device")
    ) {
      if (section.id === "sensors") return 1
      if (section.id === "civic") return 2
    }
    if (
      kind.includes("civic") ||
      kind.includes("government") ||
      kind.includes("facility") ||
      kind.includes("infrastructure") ||
      kind.includes("power") ||
      kind.includes("substation") ||
      kind.includes("transmission")
    ) {
      if (section.id === "civic") return 1
      if (section.id === "sensors") return 2
    }
  }

  const metric = section.metric.toLowerCase()
  if (section.id === "events" && metric !== "0") return 3
  if (section.id === "nature" && metric !== "0") return 4
  if (section.id === "sensors" && metric !== "0") return 5
  if (section.id === "civic" && metric !== "0" && metric !== "...") return 6
  if (section.id === "motion" && metric !== "0/0/0") return 7
  return 20
}

function MycaViewportPanel({
  mapBounds,
  mapZoom,
  assetsReady,
  latestViewportEvents,
  visibleFungalObservations,
  aircraftCount,
  vesselCount,
  satelliteCount,
  onFlyTo,
  selectedContext,
  prefetchedIntel,
  prefetchedIntelLoading = false,
  prefetchedEnvironment,
  prefetchedEnvironmentLoading = false,
  prefetchedEagleSources,
  prefetchedEagleLoading = false,
  prefetchedRevisionKey,
  prefetchedSensors,
  prefetchedSensorsLoading = false,
}: MycaViewportPanelProps) {
  const useParentEnvPrefetch = prefetchedEnvironment !== undefined
  const useParentEaglePrefetch = prefetchedEagleSources !== undefined
  const useParentSensorPrefetch = prefetchedSensors !== undefined
  const useParentRevision = prefetchedRevisionKey !== undefined

  const [localEnvironment, setLocalEnvironment] = useState<{ weather?: EnvWeather } | null>(null)
  const [airQuality, setAirQuality] = useState<AirQualityCurrent | null>(null)
  const [cloudCover, setCloudCover] = useState<number | null>(null)
  const [localEnvLoading, setLocalEnvLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(null)
  const [nextAnalysisAt, setNextAnalysisAt] = useState<number | null>(null)
  const [analysisReason, setAnalysisReason] = useState<AnalysisTriggerReason>("initial")
  const [interactionNonce, setInteractionNonce] = useState(0)
  const [localEagleSources, setLocalEagleSources] = useState<EagleViewportSource[]>([])
  const [localViewportIntel, setLocalViewportIntel] = useState<ViewportIntelLike | null>(null)
  const [localViewportIntelLoading, setLocalViewportIntelLoading] = useState(false)
  const lastEagleKey = useRef<string | null>(null)

  const snapshotRef = useRef<{ bounds: MapBoundsLike; zoom: number } | null>(null)
  const intelSnapshotRef = useRef<{ bounds: MapBoundsLike; zoom: number } | null>(null)
  const intelRevisionKeyRef = useRef<string | null>(null)
  const intelControllerRef = useRef<AbortController | null>(null)
  const [localRevisionKey, setLocalRevisionKey] = useState<string | null>(null)
  const revisionKey = useParentRevision ? prefetchedRevisionKey ?? null : localRevisionKey
  const eagleSources = useParentEaglePrefetch ? (prefetchedEagleSources ?? EMPTY_EAGLE_SOURCES) : localEagleSources
  const viewportIntel = useMemo(() => {
    const parentScore = intelContentScore(prefetchedIntel)
    const localScore = intelContentScore(localViewportIntel)
    if (parentScore > 0 || localScore === 0) return prefetchedIntel ?? localViewportIntel
    return localViewportIntel
  }, [prefetchedIntel, localViewportIntel])
  const viewportIntelLoading =
    (prefetchedIntelLoading || localViewportIntelLoading) &&
    intelContentScore(viewportIntel) === 0
  const environment = useParentEnvPrefetch
    ? (prefetchedEnvironment as { weather?: EnvWeather } | null)
    : localEnvironment
  const envLoading = useParentEnvPrefetch ? Boolean(prefetchedEnvironmentLoading) : localEnvLoading
  const aiTimerRef = useRef<number | null>(null)
  const aiControllerRef = useRef<AbortController | null>(null)
  const aiInFlightRef = useRef(false)
  const lastAiRequestKeyRef = useRef<string | null>(null)
  const lastAnalyzedAtRef = useRef(0)
  const lastAnalyzedSnapshotRef = useRef<{ bounds: MapBoundsLike; zoom: number } | null>(null)
  const lastAnalyzedSignalRef = useRef<string | null>(null)
  const lastAnalyzedEventSignalRef = useRef<string | null>(null)
  const lastInteractionNonceRef = useRef(0)

  const viewportCenter = useMemo(
    () => (mapBounds ? center(mapBounds) : null),
    [mapBounds],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const bump = () => setInteractionNonce((n) => n + 1)
    window.addEventListener("myca-search-action", bump)
    window.addEventListener("crep:flyto", bump)
    window.addEventListener("crep:eagle:camera-click", bump)
    window.addEventListener("crep:analysis:select-event", bump)
    return () => {
      window.removeEventListener("myca-search-action", bump)
      window.removeEventListener("crep:flyto", bump)
      window.removeEventListener("crep:eagle:camera-click", bump)
      window.removeEventListener("crep:analysis:select-event", bump)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current)
      aiControllerRef.current?.abort()
      intelControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!mapBounds || !assetsReady) return
    const next = { bounds: mapBounds, zoom: mapZoom }
    const shouldRefresh =
      !intelSnapshotRef.current ||
      isSignificantViewportChange(intelSnapshotRef.current, next)
    if (!shouldRefresh) return

    const revision = makeViewportRevisionKey(mapBounds, mapZoom)
    if (intelRevisionKeyRef.current === revision) return
    intelRevisionKeyRef.current = revision
    intelSnapshotRef.current = next

    intelControllerRef.current?.abort()
    const controller = new AbortController()
    intelControllerRef.current = controller
    setLocalViewportIntelLoading(true)

    void (async () => {
      try {
        const q = new URLSearchParams({
          north: String(mapBounds.north),
          south: String(mapBounds.south),
          east: String(mapBounds.east),
          west: String(mapBounds.west),
          zoom: String(mapZoom),
        })
        const res = await fetch(`/api/crep/viewport-intel?${q}`, {
          signal: controller.signal,
          cache: "no-store",
        })
        if (!res.ok) return
        const data = (await res.json()) as ViewportIntelLike
        if (!controller.signal.aborted) setLocalViewportIntel(data)
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[MycaViewportPanel] viewport intel:", (error as Error)?.message)
        }
      } finally {
        if (!controller.signal.aborted) setLocalViewportIntelLoading(false)
      }
    })()
  }, [
    mapBounds?.north,
    mapBounds?.south,
    mapBounds?.east,
    mapBounds?.west,
    mapZoom,
    assetsReady,
  ])

  useEffect(() => {
    if (useParentRevision) return
    if (!mapBounds || !assetsReady) return
    const next = { bounds: mapBounds, zoom: mapZoom }
    const cityZoom = mapZoom >= 10
    const shouldRefresh =
      !snapshotRef.current ||
      cityZoom ||
      isSignificantViewportChange(snapshotRef.current, next)
    if (!shouldRefresh) return
    snapshotRef.current = next
    setLocalRevisionKey(makeViewportRevisionKey(mapBounds, mapZoom))
  }, [mapBounds, mapZoom, assetsReady, useParentRevision])

  useEffect(() => {
    if (useParentEnvPrefetch) {
      const aq = prefetchedEnvironment?.airQuality?.current
      if (aq) setAirQuality(aq)
      return
    }
    if (!mapBounds || !revisionKey) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLocalEnvLoading(true)
      try {
        const q = new URLSearchParams({
          north: String(mapBounds.north),
          south: String(mapBounds.south),
          east: String(mapBounds.east),
          west: String(mapBounds.west),
          zoom: String(mapZoom),
        })
        const c = center(mapBounds)
        const [envRes, aqRes, forecastRes] = await Promise.allSettled([
          fetch(`/api/crep/viewport-environment?${q}`, { signal: controller.signal }),
          fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat.toFixed(4)}&longitude=${c.lng.toFixed(4)}&current=us_aqi,pm2_5,pm10`,
            { signal: controller.signal },
          ),
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${c.lat.toFixed(4)}&longitude=${c.lng.toFixed(4)}&current=cloud_cover&timezone=auto`,
            { signal: controller.signal },
          ),
        ])

        if (envRes.status === "fulfilled" && envRes.value.ok) {
          setLocalEnvironment(await envRes.value.json())
        }
        if (aqRes.status === "fulfilled" && aqRes.value.ok) {
          const aq = await aqRes.value.json()
          setAirQuality(aq?.current || null)
        }
        if (forecastRes.status === "fulfilled" && forecastRes.value.ok) {
          const fc = await forecastRes.value.json()
          const cc = Number(fc?.current?.cloud_cover)
          setCloudCover(Number.isFinite(cc) ? cc : null)
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[MycaViewportPanel] env fetch:", (error as Error)?.message)
        }
      } finally {
        if (!controller.signal.aborted) setLocalEnvLoading(false)
      }
    }, 320)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [revisionKey, mapBounds, mapZoom, useParentEnvPrefetch, prefetchedEnvironment])

  const displayAirQuality = useMemo<AirQualityCurrent | null>(() => {
    if (airQuality?.us_aqi != null) return airQuality
    const aqiSensors = (prefetchedSensors ?? [])
      .filter((sensor) => sensor.kind === "aqi" && Number.isFinite(sensor.live?.value))
      .sort((a, b) => b.live.value - a.live.value)
    const dominant = aqiSensors[0]
    if (!dominant) return null
    return { us_aqi: Math.round(dominant.live.value) }
  }, [airQuality, prefetchedSensors])

  useEffect(() => {
    if (useParentEaglePrefetch) return
    if (!mapBounds || !revisionKey || !assetsReady) return

    const fetchKey = `${revisionKey}:${bboxKeyFromBounds(mapBounds)}`
    if (lastEagleKey.current === fetchKey) return

    const controller = new AbortController()
    void loadViewportEagleSources(
      mapBounds,
      8,
      (next) => setLocalEagleSources(next),
      controller.signal,
    )
      .then(() => {
        lastEagleKey.current = fetchKey
      })
      .catch((error) => {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("[MycaViewportPanel] eagle load:", (error as Error)?.message)
        }
      })

    return () => controller.abort()
  }, [revisionKey, mapBounds, assetsReady, useParentEaglePrefetch])

  const topSpecies = useMemo(() => {
    const counts = new Map<string, number>()
    visibleFungalObservations.forEach((obs) => {
      const name = speciesLabel(obs)
      counts.set(name, (counts.get(name) || 0) + 1)
    })
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name)
  }, [visibleFungalObservations])

  const tempUnit = useMemo(() => {
    const env = environment as { unitSystem?: string; weather?: EnvWeather } | null
    if (env?.unitSystem === "imperial") return "°F"
    return env?.weather?.units?.temperature_2m || "°C"
  }, [environment])

  const windUnitSuffix = useMemo(() => {
    const env = environment as { unitSystem?: string; weather?: EnvWeather } | null
    if (env?.unitSystem === "imperial") return " mph"
    return ` ${env?.weather?.units?.wind_speed_10m || "km/h"}`
  }, [environment])

  const eventSignal = useMemo(
    () => listIds(latestViewportEvents, (event) => `${event.id}:${event.severity ?? ""}:${event.type ?? ""}`, 10),
    [latestViewportEvents],
  )

  const speciesSignal = useMemo(
    () => `${visibleFungalObservations.length}:${topSpecies.join("|")}`,
    [visibleFungalObservations.length, topSpecies],
  )

  const eagleSignal = useMemo(
    () => listIds(eagleSources, (source) => source.id, 8),
    [eagleSources],
  )

  const civicSignal = useMemo(() => {
    const officials = arrayCount(viewportIntel?.officials) + arrayCount(viewportIntel?.civic?.officials)
    const facilities = arrayCount(viewportIntel?.facilities?.facilities)
    return `${placeLabel(viewportIntel)}:${officials}:${facilities}:${viewportIntelLoading ? "loading" : "ready"}`
  }, [viewportIntel, viewportIntelLoading])

  const localSummary = useMemo(() => {
    const place = placeLabel(viewportIntel)
    const placePrefix = place === "Viewport" ? "Current viewport" : `${place} viewport`
    const facts = selectedFacts(selectedContext)
    const pieces = [
      `${placePrefix}: ${latestViewportEvents.length} events, ${visibleFungalObservations.length} biodiversity records, ${aircraftCount} aircraft, ${vesselCount} vessels, ${satelliteCount} satellites, ${eagleSources.length} cameras, and ${prefetchedSensors?.length ?? 0} sensors.`,
    ]
    if (selectedContext?.label) {
      const factText = facts.length ? ` ${formatFactsInline(facts)}.` : ""
      pieces.unshift(
        `Selected ${selectedContext.kind}: ${selectedContext.label}${selectedContext.detail ? ` (${selectedContext.detail})` : ""}.${factText}`,
      )
    }
    if (latestViewportEvents.length) {
      pieces.push(`Event focus: ${latestViewportEvents.slice(0, 3).map((event) => event.title).join("; ")}.`)
    }
    if (topSpecies.length) {
      pieces.push(`Nature focus: ${topSpecies.slice(0, 4).join(", ")}.`)
    }
    return pieces.join(" ")
  }, [
    viewportIntel,
    latestViewportEvents,
    visibleFungalObservations.length,
    aircraftCount,
    vesselCount,
    satelliteCount,
    eagleSources.length,
    prefetchedSensors?.length,
    selectedContext,
    topSpecies,
  ])

  const analysisSignal = useMemo(
    () => [
      eventSignal,
      speciesSignal,
      eagleSignal,
      civicSignal,
      aircraftCount,
      vesselCount,
      satelliteCount,
      prefetchedSensors?.length ?? 0,
      selectedContext?.key ?? "none",
      interactionNonce,
    ].join("~"),
    [
      eventSignal,
      speciesSignal,
      eagleSignal,
      civicSignal,
      aircraftCount,
      vesselCount,
      satelliteCount,
      prefetchedSensors?.length,
      selectedContext?.key,
      interactionNonce,
    ],
  )

  const fetchAiSummary = useCallback(async (reason: AnalysisTriggerReason, signalKey: string) => {
    if (!mapBounds || !assetsReady) return
    const summaryRevision = revisionKey || makeViewportRevisionKey(mapBounds, mapZoom)
    const requestKey = `${summaryRevision}:${signalKey}`
    if (lastAiRequestKeyRef.current === requestKey) return

    const markAnalyzed = () => {
      const now = Date.now()
      lastAnalyzedAtRef.current = now
      lastAnalyzedSnapshotRef.current = { bounds: cloneBounds(mapBounds), zoom: mapZoom }
      lastAnalyzedSignalRef.current = signalKey
      lastAnalyzedEventSignalRef.current = eventSignal
      setLastAnalyzedAt(now)
    }

    aiControllerRef.current?.abort()
    const controller = new AbortController()
    aiControllerRef.current = controller
    aiInFlightRef.current = true
    setAiLoading(true)
    setAiError(null)
    setNextAnalysisAt(null)
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const c = center(mapBounds)
      const current = environment?.weather?.current
      const res = await fetch("/api/crep/viewport-ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          revision: summaryRevision,
          context: {
            revision: summaryRevision,
            reason,
            zoom: mapZoom,
            center: c,
            bounds: mapBounds,
            place: placeLabel(viewportIntel),
            selected: selectedContext
              ? {
                kind: selectedContext.kind,
                label: selectedContext.label,
                detail: selectedContext.detail,
                facts: selectedFacts(selectedContext),
              }
              : null,
            counts: {
              events: latestViewportEvents.length,
              species: visibleFungalObservations.length,
              aircraft: aircraftCount,
              vessels: vesselCount,
              satellites: satelliteCount,
              cameras: eagleSources.length,
              sensors: prefetchedSensors?.length ?? 0,
            },
            topEvents: latestViewportEvents.slice(0, 6).map((e) => ({
              title: e.title,
              type: e.type,
              severity: e.severity,
            })),
            topSpecies,
            weather: {
              temp: current?.temperature_2m != null ? `${formatMetric(current.temperature_2m, 0, tempUnit)}` : null,
              humidity: current?.relative_humidity_2m != null ? `${formatMetric(current.relative_humidity_2m, 0, "%")}` : null,
              cloud_cover: cloudCover != null ? `${cloudCover}%` : null,
              aqi: displayAirQuality?.us_aqi ?? null,
              wind: current?.wind_speed_10m != null ? `${formatMetric(current.wind_speed_10m, 0, windUnitSuffix)}` : null,
            },
          },
        }),
      })
      const data = await res.json()
      if (controller.signal.aborted) return
      if (aiControllerRef.current === controller) markAnalyzed()
      if (!res.ok || data.error) {
        setAiError(data.error || "MYCA summary unavailable")
        setAiSummary("")
        return
      }
      lastAiRequestKeyRef.current = requestKey
      setAiSummary(String(data.summary || "").trim())
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        setAiError(error instanceof Error ? error.message : "Summary failed")
      }
      if (aiControllerRef.current === controller) markAnalyzed()
    } finally {
      window.clearTimeout(timeout)
      if (aiControllerRef.current === controller) aiInFlightRef.current = false
      if (!controller.signal.aborted) setAiLoading(false)
      if (controller.signal.aborted && aiControllerRef.current === controller) setAiLoading(false)
    }
  }, [
    mapBounds,
    revisionKey,
    assetsReady,
    mapZoom,
    latestViewportEvents,
    visibleFungalObservations.length,
    aircraftCount,
    vesselCount,
    satelliteCount,
    eagleSources.length,
    prefetchedSensors?.length,
    topSpecies,
    environment,
    cloudCover,
    displayAirQuality,
    tempUnit,
    windUnitSuffix,
    viewportIntel,
    selectedContext,
    eventSignal,
  ])

  const scheduleAiSummary = useCallback((reason: AnalysisTriggerReason, signalKey: string) => {
    if (!mapBounds || !assetsReady) return
    const now = Date.now()
    const minInterval = reason === "data" ? IDLE_ANALYSIS_MIN_MS : ACTIVE_ANALYSIS_MIN_MS
    const sinceLast = lastAnalyzedAtRef.current ? now - lastAnalyzedAtRef.current : Number.POSITIVE_INFINITY
    const cooldownDelay = Math.max(0, minInterval - sinceLast)
    const settleDelay =
      reason === "initial"
        ? INITIAL_ANALYSIS_SETTLE_MS
        : reason === "selection" || reason === "interaction"
          ? INTERACTION_ANALYSIS_SETTLE_MS
          : CAMERA_ANALYSIS_SETTLE_MS
    const delay = Math.max(settleDelay, cooldownDelay)

    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current)
    setAnalysisReason(reason)
    setNextAnalysisAt(now + delay)
    aiTimerRef.current = window.setTimeout(() => {
      aiTimerRef.current = null
      void fetchAiSummary(reason, signalKey)
    }, delay)
  }, [assetsReady, fetchAiSummary, mapBounds])

  useEffect(() => {
    if (!mapBounds || !assetsReady) return
    const nextSnapshot = { bounds: mapBounds, zoom: mapZoom }
    const hasAnalyzed = lastAnalyzedAtRef.current > 0
    if (aiInFlightRef.current) return
    const interactionChanged = interactionNonce !== lastInteractionNonceRef.current
    const spatialChanged =
      !lastAnalyzedSnapshotRef.current ||
      isSignificantViewportChange(lastAnalyzedSnapshotRef.current, nextSnapshot)
    const signalChanged = lastAnalyzedSignalRef.current !== analysisSignal
    const eventChanged = lastAnalyzedEventSignalRef.current !== eventSignal

    if (!hasAnalyzed) {
      scheduleAiSummary("initial", analysisSignal)
      return
    }

    if (interactionChanged) {
      lastInteractionNonceRef.current = interactionNonce
      scheduleAiSummary("interaction", analysisSignal)
      return
    }

    if (eventChanged) {
      scheduleAiSummary("interaction", analysisSignal)
      return
    }

    if (selectedContext?.key && signalChanged) {
      scheduleAiSummary("selection", analysisSignal)
      return
    }

    if (spatialChanged) {
      scheduleAiSummary("camera", analysisSignal)
      return
    }

    if (signalChanged) {
      scheduleAiSummary("data", analysisSignal)
    }
  }, [
    mapBounds,
    mapZoom,
    assetsReady,
    analysisSignal,
    interactionNonce,
    selectedContext?.key,
    eventSignal,
    lastAnalyzedAt,
    scheduleAiSummary,
  ])


  // New event at the front → show it immediately (live feed behavior).
  // Auto-advance — no manual scroll; rotates through viewport events.
  const analysisMentions = useMemo((): AnalysisMention[] => {
    const mentions: AnalysisMention[] = []

    if (selectedContext?.lat != null && selectedContext.lng != null) {
      mentions.push({
        id: `selected-${selectedContext.key}`,
        kind: selectedKindToMentionKind(selectedContext.kind),
        label: compactText(selectedContext.label, 28),
        detail: selectedContext.detail || "selected",
        lng: selectedContext.lng,
        lat: selectedContext.lat,
        zoom: selectedContext.zoom ?? Math.max(12, mapZoom),
      })
    }

    if (viewportCenter) {
      mentions.push({
        id: "viewport-center",
        kind: "viewport",
        label: "Viewport center",
        detail: `${viewportCenter.lat.toFixed(2)}°, ${viewportCenter.lng.toFixed(2)}°`,
        lng: viewportCenter.lng,
        lat: viewportCenter.lat,
        zoom: Math.max(8, mapZoom),
      })
    }

    latestViewportEvents
      .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
      .slice(0, 6)
      .forEach((event) => {
        mentions.push({
          id: `event-${event.id}`,
          kind: "event",
          label: event.title.length > 28 ? `${event.title.slice(0, 26)}…` : event.title,
          detail: event.type || event.severity || "event",
          lng: event.lng,
          lat: event.lat,
          zoom: 10,
        })
      })

    const seenSpecies = new Set<string>()
    visibleFungalObservations.forEach((obs) => {
      if (seenSpecies.size >= 5) return
      const lat = Number(obs.latitude)
      const lng = Number(obs.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      const name = speciesLabel(obs)
      if (seenSpecies.has(name)) return
      seenSpecies.add(name)
      mentions.push({
        id: `species-${obs.id ?? name}`,
        kind: "species",
        label: name.length > 24 ? `${name.slice(0, 22)}…` : name,
        detail: obs.kingdom || "nature obs",
        lng,
        lat,
        zoom: 12,
      })
    })

    eagleSources.slice(0, 4).forEach((cam) => {
      mentions.push({
        id: `camera-${cam.id}`,
        kind: "camera",
        label: (cam.name || cam.provider).slice(0, 24),
        detail: cam.provider,
        lng: cam.lng,
        lat: cam.lat,
        zoom: 14,
        camera: cam,
      })
    })

    if (aircraftCount > 0 && viewportCenter) {
      mentions.push({
        id: "traffic-air",
        kind: "aircraft",
        label: `${aircraftCount} aircraft`,
        detail: "in viewport",
        lng: viewportCenter.lng,
        lat: viewportCenter.lat,
        zoom: Math.max(9, mapZoom),
      })
    }

    if (vesselCount > 0 && viewportCenter) {
      mentions.push({
        id: "traffic-sea",
        kind: "vessel",
        label: `${vesselCount} vessels`,
        detail: "in viewport",
        lng: viewportCenter.lng,
        lat: viewportCenter.lat,
        zoom: Math.max(8, mapZoom),
      })
    }

    if (satelliteCount > 0 && viewportCenter) {
      mentions.push({
        id: "traffic-space",
        kind: "satellite",
        label: `${satelliteCount} satellites`,
        detail: "tracked",
        lng: viewportCenter.lng,
        lat: viewportCenter.lat,
        zoom: Math.max(6, mapZoom),
      })
    }

    return mentions
  }, [
    selectedContext,
    viewportCenter,
    mapZoom,
    latestViewportEvents,
    visibleFungalObservations,
    eagleSources,
    aircraftCount,
    vesselCount,
    satelliteCount,
  ])

  const handleMentionClick = useCallback(
    (mention: AnalysisMention) => {
      if (mention.kind === "camera" && mention.camera) {
        openEagleCamera(mention.camera, onFlyTo)
        return
      }
      if (mention.lng == null || mention.lat == null) return
      onFlyTo?.(mention.lng, mention.lat, mention.zoom)

      if (mention.kind === "event") {
        const eventId = mention.id.replace(/^event-/, "")
        window.dispatchEvent(
          new CustomEvent("crep:analysis:select-event", { detail: { eventId } }),
        )
      }
    },
    [onFlyTo],
  )

  const mentionSlotCount = 2
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionFade, setMentionFade] = useState(true)

  useEffect(() => {
    setMentionIndex(0)
  }, [revisionKey, analysisMentions.length])

  const visibleMentions = useMemo(() => {
    if (analysisMentions.length === 0) return []
    if (analysisMentions.length <= mentionSlotCount) return analysisMentions
    return Array.from({ length: mentionSlotCount }, (_, i) =>
      analysisMentions[(mentionIndex + i) % analysisMentions.length],
    )
  }, [analysisMentions, mentionIndex, mentionSlotCount])

  useEffect(() => {
    if (analysisMentions.length <= mentionSlotCount) return
    const timer = window.setInterval(() => {
      setMentionFade(false)
      window.setTimeout(() => {
        setMentionIndex((i) => (i + mentionSlotCount) % analysisMentions.length)
        setMentionFade(true)
      }, 140)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [analysisMentions.length, mentionSlotCount])

  const analysisSections = useMemo((): AnalysisSection[] => {
    const sections: AnalysisSection[] = []
    const centerAction = viewportCenter
      ? {
        id: "section-viewport",
        kind: "viewport" as const,
        label: "Viewport",
        detail: placeLabel(viewportIntel),
        lng: viewportCenter.lng,
        lat: viewportCenter.lat,
        zoom: Math.max(8, mapZoom),
      }
      : undefined

    if (selectedContext) {
      const facts = selectedFacts(selectedContext)
      sections.push({
        id: "selected",
        title: compactText(selectedContext.label, 22),
        metric: selectedContext.kind,
        detail: selectedContext.detail || (facts.length ? formatFactsInline(facts, 2) : selectedContext.label),
        tone: "selection",
        Icon: Crosshair,
        action: selectedContext.lat != null && selectedContext.lng != null
          ? {
            id: `section-selected-${selectedContext.key}`,
            kind: selectedKindToMentionKind(selectedContext.kind),
            label: selectedContext.label,
            detail: selectedContext.detail,
            lat: selectedContext.lat,
            lng: selectedContext.lng,
            zoom: selectedContext.zoom ?? Math.max(12, mapZoom),
          }
          : undefined,
        facts,
      })
    }

    sections.push({
      id: "events",
      title: "Events",
      metric: String(latestViewportEvents.length),
      detail: latestViewportEvents.length
        ? latestViewportEvents.slice(0, 3).map((event) => event.title).join("; ")
        : "No active event marker resolved in view.",
      tone: "event",
      Icon: AlertTriangle,
      action: analysisMentions.find((mention) => mention.kind === "event") ?? centerAction,
      facts: [
        { label: "Active", value: String(latestViewportEvents.length) },
        latestViewportEvents[0]?.severity ? { label: "Top", value: latestViewportEvents[0].severity } : null,
        latestViewportEvents[0]?.type ? { label: "Type", value: latestViewportEvents[0].type } : null,
      ].filter((fact): fact is AnalysisFact => Boolean(fact)),
    })

    sections.push({
      id: "nature",
      title: "Nature",
      metric: String(visibleFungalObservations.length),
      detail: topSpecies.length ? topSpecies.slice(0, 4).join(", ") : "Species signal is still resolving.",
      tone: "nature",
      Icon: Leaf,
      action: analysisMentions.find((mention) => mention.kind === "species") ?? centerAction,
      facts: [
        { label: "Visible", value: String(visibleFungalObservations.length) },
        topSpecies[0] ? { label: "Focus", value: topSpecies[0] } : null,
      ].filter((fact): fact is AnalysisFact => Boolean(fact)),
    })

    sections.push({
      id: "motion",
      title: "Movers",
      metric: `${aircraftCount}/${vesselCount}/${satelliteCount}`,
      detail: `${aircraftCount} aircraft, ${vesselCount} vessels, ${satelliteCount} satellites in the active viewport.`,
      tone: "motion",
      Icon: Activity,
      action:
        analysisMentions.find((mention) =>
          mention.kind === "aircraft" || mention.kind === "vessel" || mention.kind === "satellite",
        ) ?? centerAction,
      facts: [
        { label: "Aircraft", value: String(aircraftCount) },
        { label: "Vessels", value: String(vesselCount) },
        { label: "Sats", value: String(satelliteCount) },
      ],
    })

    const officials = arrayCount(viewportIntel?.officials) + arrayCount(viewportIntel?.civic?.officials)
    const facilities = arrayCount(viewportIntel?.facilities?.facilities)
    sections.push({
      id: "civic",
      title: "Civic",
      metric: viewportIntelLoading ? "..." : String(officials + facilities),
      detail: `${placeLabel(viewportIntel)}: ${officials} officials, ${facilities} facilities.`,
      tone: "civic",
      Icon: Users,
      action: centerAction,
      facts: [
        { label: "Officials", value: String(officials) },
        { label: "Facilities", value: String(facilities) },
        { label: "Place", value: compactText(placeLabel(viewportIntel), 30) },
      ],
    })

    sections.push({
      id: "sensors",
      title: "Sensors",
      metric: String((prefetchedSensors?.length ?? 0) + eagleSources.length),
      detail: `${eagleSources.length} cameras, ${prefetchedSensors?.length ?? 0} sensors, AQI ${displayAirQuality?.us_aqi ?? "-"}.`,
      tone: "sensor",
      Icon: Camera,
      action: analysisMentions.find((mention) => mention.kind === "camera") ?? centerAction,
      facts: [
        { label: "Cameras", value: String(eagleSources.length) },
        { label: "Sensors", value: String(prefetchedSensors?.length ?? 0) },
        displayAirQuality?.us_aqi != null ? { label: "AQI", value: String(displayAirQuality.us_aqi) } : null,
      ].filter((fact): fact is AnalysisFact => Boolean(fact)),
    })

    return sections
  }, [
    selectedContext,
    viewportCenter,
    viewportIntel,
    viewportIntelLoading,
    mapZoom,
    latestViewportEvents,
    visibleFungalObservations.length,
    topSpecies,
    aircraftCount,
    vesselCount,
    satelliteCount,
    analysisMentions,
    prefetchedSensors?.length,
    eagleSources.length,
    displayAirQuality?.us_aqi,
  ])

  const visibleAnalysisSections = useMemo(() => {
    return [...analysisSections]
      .sort((a, b) => sectionRelevance(a, selectedContext) - sectionRelevance(b, selectedContext))
      .slice(0, 2)
  }, [analysisSections, selectedContext])

  const analysisCadenceLabel = useMemo(() => {
    if (aiLoading) return `Reading ${analysisReason}`
    if (nextAnalysisAt) return `Next ${formatElapsed(nextAnalysisAt - Date.now())}`
    if (lastAnalyzedAt) return `Read ${formatElapsed(Date.now() - lastAnalyzedAt)} ago`
    return "Ready"
  }, [aiLoading, analysisReason, nextAnalysisAt, lastAnalyzedAt])

  const summaryText = aiSummary && lastAnalyzedSignalRef.current === analysisSignal
    ? aiSummary
    : localSummary

  return (
    <ScrollArea className="h-full">
      <div className="flex min-h-full flex-col gap-2 p-2">
        {/* MYCA Analysis room (Environment tab owns env data) */}
        <div className="flex min-h-[280px] flex-1 flex-col rounded-lg border border-purple-500/35 bg-gradient-to-b from-purple-950/25 to-black/50 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20">
                <Bot className="h-3.5 w-3.5 text-purple-200" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-100">MYCA Analysis</span>
                <p className="text-[7px] text-purple-300/70">Viewport intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[7px] text-purple-200/80">
              {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-300" />}
              <Clock3 className="h-3 w-3 text-purple-300/80" />
              <span className="tabular-nums">{analysisCadenceLabel}</span>
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            </div>
          </div>

          <div className="min-h-[92px] shrink-0 overflow-y-auto rounded-lg border border-purple-500/25 bg-black/45 p-2.5">
            {aiError && !aiLoading && (
              <p className="text-[9px] text-red-400">{aiError}</p>
            )}
            {!aiError && !summaryText && !aiLoading && (
              <p className="text-[9px] leading-relaxed text-gray-500">
                Waiting for a stable viewport and ready data.
              </p>
            )}
            {aiLoading && !summaryText && (
              <div className="flex items-center gap-2 text-[9px] text-purple-300">
                <Bot className="h-3.5 w-3.5 shrink-0" />
                <span>Reading viewport context...</span>
              </div>
            )}
            {summaryText && (
              <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-gray-100">{summaryText}</p>
            )}
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {visibleAnalysisSections.map((section) => {
              const Icon = section.Icon
              return (
                <div
                  key={section.id}
                  className={cn("min-h-[54px] rounded-md border p-1.5", sectionTone(section.tone))}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <Icon className="h-2.5 w-2.5 shrink-0 opacity-85" />
                      <span className="truncate text-[7px] font-bold uppercase tracking-wide">{section.title}</span>
                    </div>
                    <span className="shrink-0 text-[7px] font-bold tabular-nums">{section.metric}</span>
                  </div>
                  <p className="line-clamp-2 min-h-[18px] text-[7px] leading-snug text-gray-300">
                    {section.detail}
                  </p>
                  {section.facts?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {section.facts.slice(0, 3).map((fact) => (
                        <span
                          key={`${section.id}-${fact.label}-${fact.value}`}
                          className="max-w-full truncate rounded border border-white/10 bg-black/25 px-1 py-0.5 text-[6px] leading-none text-white/80"
                          title={`${fact.label}: ${fact.value}`}
                        >
                          <span className="text-white/45">{fact.label}</span> {fact.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {section.action?.lat != null && section.action.lng != null && (
                    <button
                      type="button"
                      onClick={() => handleMentionClick(section.action!)}
                      className="mt-1 inline-flex h-[17px] items-center gap-1 rounded border border-white/10 bg-white/10 px-1.5 text-[6px] font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/20"
                      title={`Fly to ${section.action.label}`}
                    >
                      <MapPin className="h-2 w-2" />
                      Fly
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {analysisMentions.length > 0 && (
            <div className="mt-1.5 shrink-0">
              <div className="mb-0.5 flex items-center justify-between gap-1">
                <span className="text-[6px] font-semibold uppercase tracking-wider text-purple-300/65">
                  Fly-to
                </span>
                {analysisMentions.length > mentionSlotCount && (
                  <span className="text-[6px] tabular-nums text-purple-400/45">
                    {Math.floor(mentionIndex / mentionSlotCount) + 1}/
                    {Math.ceil(analysisMentions.length / mentionSlotCount)}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "flex min-h-[18px] items-center gap-1 transition-opacity duration-150",
                  mentionFade ? "opacity-100" : "opacity-30",
                )}
              >
                {visibleMentions.map((mention, slotIdx) => {
                  const Icon = mentionIcon(mention.kind)
                  const clickable = mention.lng != null && mention.lat != null
                  return (
                    <button
                      key={`${mention.id}-slot-${slotIdx}`}
                      type="button"
                      disabled={!clickable}
                      onClick={() => handleMentionClick(mention)}
                      title={
                        clickable
                          ? `${mention.detail ? `${mention.label} - ${mention.detail}` : mention.label} - fly to target`
                          : mention.label
                      }
                      className={cn(
                        "inline-flex h-[18px] max-w-[48%] flex-1 items-center gap-0.5 rounded border px-1 text-left transition-colors",
                        mentionTone(mention.kind),
                        !clickable && "cursor-default opacity-45",
                      )}
                    >
                      <Icon className="h-2 w-2 shrink-0 opacity-90" />
                      <span className="truncate text-[6px] font-medium leading-none">{mention.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live environmental sensors (non-video providers) */}
        {useParentSensorPrefetch &&
          (prefetchedSensorsLoading || (prefetchedSensors?.length ?? 0) > 0) && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/10 p-1.5">
            <ViewportSensorGrid
              sensors={prefetchedSensors ?? []}
              loading={prefetchedSensorsLoading}
              onFlyTo={onFlyTo}
              limit={8}
              mapBounds={mapBounds}
            />
          </div>
        )}

        {/* Eagle Eye thumbnails */}
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/10 p-1.5">
          <EagleEyeThumbnailGrid
            mapBounds={mapBounds}
            revisionKey={revisionKey}
            assetsReady={assetsReady}
            onFlyTo={onFlyTo}
            limit={6}
            prefetchedSources={useParentEaglePrefetch ? eagleSources : undefined}
            prefetchedLoading={useParentEaglePrefetch ? prefetchedEagleLoading : undefined}
          />
          <p className="mt-1 flex items-center gap-1 text-[7px] text-gray-500">
            <MapPin className="h-2.5 w-2.5" />
            Tap a feed to fly there and open live video
          </p>
        </div>
      </div>
    </ScrollArea>
  )
}

function ScrollArea({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-y-auto overscroll-contain", className)}>{children}</div>
}

export default memo(MycaViewportPanel)
