"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Bot,
  Camera,
  ChevronDown,
  Cloud,
  Crosshair,
  Leaf,
  Loader2,
  MapPin,
  Plane,
  Radio,
  Satellite,
  Ship,
  Sparkles,
  Thermometer,
  Wind,
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

const DISMISSED_MENTIONS_KEY = "crep:myca:dismissed-mentions"

function loadDismissedMentions(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.sessionStorage.getItem(DISMISSED_MENTIONS_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

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
  const [displayedSummary, setDisplayedSummary] = useState("")
  const [forecastOpen, setForecastOpen] = useState(false)
  const [localEagleSources, setLocalEagleSources] = useState<EagleViewportSource[]>([])
  const lastEagleKey = useRef<string | null>(null)

  const snapshotRef = useRef<{ bounds: MapBoundsLike; zoom: number } | null>(null)
  const [localRevisionKey, setLocalRevisionKey] = useState<string | null>(null)
  const revisionKey = useParentRevision ? prefetchedRevisionKey ?? null : localRevisionKey
  const eagleSources = useParentEaglePrefetch ? (prefetchedEagleSources ?? []) : localEagleSources
  const environment = useParentEnvPrefetch
    ? (prefetchedEnvironment as { weather?: EnvWeather } | null)
    : localEnvironment
  const envLoading = useParentEnvPrefetch ? Boolean(prefetchedEnvironmentLoading) : localEnvLoading
  const lastAiRevision = useRef<string | null>(null)
  const typewriterRef = useRef<number | null>(null)

  const viewportCenter = useMemo(
    () => (mapBounds ? center(mapBounds) : null),
    [mapBounds?.north, mapBounds?.south, mapBounds?.east, mapBounds?.west],
  )

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
  }, [revisionKey, mapBounds, mapZoom, useParentEnvPrefetch, prefetchedEnvironment?.airQuality?.current])

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

  const fetchAiSummary = useCallback(async () => {
    if (!mapBounds || !revisionKey || !assetsReady) return
    if (lastAiRevision.current === revisionKey) return

    setAiLoading(true)
    setAiError(null)
    try {
      const c = center(mapBounds)
      const current = environment?.weather?.current
      const units = environment?.weather?.units
      const res = await fetch("/api/crep/viewport-ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: revisionKey,
          context: {
            revision: revisionKey,
            zoom: mapZoom,
            center: c,
            bounds: mapBounds,
            counts: {
              events: latestViewportEvents.length,
              species: visibleFungalObservations.length,
              aircraft: aircraftCount,
              vessels: vesselCount,
              satellites: satelliteCount,
            },
            topEvents: latestViewportEvents.slice(0, 6).map((e) => ({
              title: e.title,
              type: e.type,
              severity: e.severity,
            })),
            topSpecies,
            weather: {
              temp: current?.temperature_2m != null ? `${formatMetric(current.temperature_2m, 0, units?.temperature_2m || "°C")}` : null,
              humidity: current?.relative_humidity_2m != null ? `${formatMetric(current.relative_humidity_2m, 0, "%")}` : null,
              cloud_cover: cloudCover != null ? `${cloudCover}%` : null,
              aqi: airQuality?.us_aqi ?? null,
              wind: current?.wind_speed_10m != null ? `${formatMetric(current.wind_speed_10m, 0, ` ${units?.wind_speed_10m || "km/h"}`)}` : null,
            },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAiError(data.error || "MYCA summary unavailable")
        setAiSummary("")
        return
      }
      lastAiRevision.current = revisionKey
      setAiSummary(String(data.summary || "").trim())
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Summary failed")
    } finally {
      setAiLoading(false)
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
    topSpecies,
    environment,
    cloudCover,
    airQuality,
  ])

  useEffect(() => {
    if (!revisionKey || !assetsReady) return
    const delay = window.setTimeout(() => {
      void fetchAiSummary()
    }, 480)
    return () => window.clearTimeout(delay)
  }, [revisionKey, assetsReady, fetchAiSummary])

  useEffect(() => {
    if (typewriterRef.current) window.clearInterval(typewriterRef.current)
    if (!aiSummary) {
      setDisplayedSummary("")
      return
    }
    let index = 0
    setDisplayedSummary("")
    typewriterRef.current = window.setInterval(() => {
      index += 2
      setDisplayedSummary(aiSummary.slice(0, index))
      if (index >= aiSummary.length && typewriterRef.current) {
        window.clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }
    }, 16)
    return () => {
      if (typewriterRef.current) window.clearInterval(typewriterRef.current)
    }
  }, [aiSummary])

  const current = environment?.weather?.current
  const units = environment?.weather?.units
  const forecastDaily = environment?.weather?.forecastDaily

  const analysisMentions = useMemo((): AnalysisMention[] => {
    const mentions: AnalysisMention[] = []

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
    viewportCenter,
    mapZoom,
    latestViewportEvents,
    visibleFungalObservations,
    eagleSources,
    aircraftCount,
    vesselCount,
    satelliteCount,
  ])

  // Clicked "worth mentioning" chips are remembered for the session so the
  // same item is not surfaced again (per-session dedupe, sessionStorage-backed).
  const [dismissedMentions, setDismissedMentions] = useState<Set<string>>(loadDismissedMentions)

  const dismissMention = useCallback((id: string) => {
    setDismissedMentions((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      try {
        window.sessionStorage.setItem(DISMISSED_MENTIONS_KEY, JSON.stringify([...next]))
      } catch {
        /* sessionStorage unavailable — keep in-memory only */
      }
      return next
    })
  }, [])

  // Stable list (no auto-rotation): rotating/fading chips were stealing taps,
  // so every chip is now a fixed, single-tap fly-to target.
  const shownMentions = useMemo(
    () => analysisMentions.filter((m) => !dismissedMentions.has(m.id)).slice(0, 10),
    [analysisMentions, dismissedMentions],
  )

  const handleMentionClick = useCallback(
    (mention: AnalysisMention) => {
      dismissMention(mention.id)
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
    [onFlyTo, dismissMention],
  )

  return (
    <ScrollArea className="h-full">
      <div className="flex min-h-full flex-col gap-2 p-2">
        {/* Environment + species */}
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/10 p-1.5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Leaf className="h-3 w-3 text-emerald-400" />
              <span className="text-[9px] font-bold text-emerald-200">Environment</span>
            </div>
            <span className={cn("text-[7px]", envLoading ? "text-cyan-300" : "text-gray-500")}>
              {envLoading ? "live…" : "Open-Meteo"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <div className="rounded bg-black/35 p-1 text-center">
              <Thermometer className="mx-auto h-3 w-3 text-orange-300" />
              <div className="text-[11px] font-bold text-orange-200">
                {formatMetric(current?.temperature_2m, 0, units?.temperature_2m || "°")}
              </div>
              <div className="text-[6px] uppercase text-gray-500">Temp</div>
            </div>
            <div className="rounded bg-black/35 p-1 text-center">
              <Cloud className="mx-auto h-3 w-3 text-sky-300" />
              <div className="text-[11px] font-bold text-sky-200">
                {cloudCover != null ? `${Math.round(cloudCover)}%` : "—"}
              </div>
              <div className="text-[6px] uppercase text-gray-500">Cloud</div>
            </div>
            <div className="rounded bg-black/35 p-1 text-center">
              <Wind className="mx-auto h-3 w-3 text-cyan-300" />
              <div className="text-[11px] font-bold text-cyan-200">
                {formatMetric(current?.relative_humidity_2m, 0, "%")}
              </div>
              <div className="text-[6px] uppercase text-gray-500">Humidity</div>
            </div>
            <div className="rounded bg-black/35 p-1 text-center">
              <div className="text-[11px] font-bold text-lime-300">{formatMetric(airQuality?.us_aqi, 0)}</div>
              <div className="text-[6px] uppercase text-gray-500">AQI</div>
            </div>
            <div className="rounded bg-black/35 p-1 text-center">
              <div className="text-[11px] font-bold text-green-300">{visibleFungalObservations.length}</div>
              <div className="text-[6px] uppercase text-gray-500">Species obs</div>
            </div>
            <div className="rounded bg-black/35 p-1 text-center">
              <div className="text-[11px] font-bold text-amber-300">{aircraftCount + vesselCount}</div>
              <div className="text-[6px] uppercase text-gray-500">Traffic</div>
            </div>
          </div>

          {topSpecies.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-0.5">
              {topSpecies.map((name) => (
                <span key={name} className="rounded border border-green-500/20 bg-black/30 px-1 py-0.5 text-[7px] text-green-200">
                  {name}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setForecastOpen((o) => !o)}
            className="mt-1.5 flex w-full items-center justify-between rounded border border-emerald-500/20 bg-black/25 px-1.5 py-1 text-[8px] text-emerald-100"
          >
            <span>14-day forecast</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", forecastOpen && "rotate-180")} />
          </button>
          {forecastOpen && forecastDaily?.time && (
            <div className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
              {(forecastDaily.time as string[]).slice(0, 7).map((day, i) => (
                <div key={day} className="flex items-center justify-between rounded bg-black/20 px-1 py-0.5 text-[7px]">
                  <span className="text-gray-400">{day}</span>
                  <span className="text-orange-200">
                    {formatMetric((forecastDaily.temperature_2m_max as number[])?.[i], 0, "°")} /
                    {formatMetric((forecastDaily.temperature_2m_min as number[])?.[i], 0, "°")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MYCA Analysis room — narrative + clickable assets (no stats grid) */}
        <div className="flex min-h-[280px] flex-1 flex-col rounded-lg border border-purple-500/35 bg-gradient-to-b from-purple-950/25 to-black/50 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20">
                <Bot className="h-3.5 w-3.5 text-purple-200" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-100">MYCA Analysis</span>
                <p className="text-[7px] text-purple-300/70">Viewport intelligence · tap icons to fly</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-300" />}
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            </div>
          </div>

          <div className="min-h-[140px] flex-1 overflow-y-auto rounded-lg border border-purple-500/25 bg-black/45 p-2.5">
            {aiError && !aiLoading && (
              <p className="text-[9px] text-red-400">{aiError}</p>
            )}
            {!aiError && !displayedSummary && !aiLoading && (
              <p className="text-[9px] leading-relaxed text-gray-500">
                MYCA will analyze this viewport after the map finishes rendering. Events, species, cameras, and traffic in view will appear as fly-to chips below.
              </p>
            )}
            {aiLoading && !displayedSummary && (
              <div className="flex items-center gap-2 text-[9px] text-purple-300">
                <Bot className="h-3.5 w-3.5 shrink-0" />
                <span>Reading viewport context…</span>
              </div>
            )}
            {displayedSummary && (
              <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-gray-100">{displayedSummary}</p>
            )}
          </div>

          {shownMentions.length > 0 && (
            <div className="mt-1.5 shrink-0">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-[7px] font-semibold uppercase tracking-wider text-purple-300/70">
                  Worth mentioning
                </span>
                <span className="text-[7px] text-purple-400/45">tap to fly</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {shownMentions.map((mention) => {
                  const Icon = mentionIcon(mention.kind)
                  const clickable = (mention.lng != null && mention.lat != null) || mention.kind === "camera"
                  return (
                    <button
                      key={mention.id}
                      type="button"
                      disabled={!clickable}
                      onClick={() => handleMentionClick(mention)}
                      title={mention.detail ? `${mention.label} · ${mention.detail}` : mention.label}
                      className={cn(
                        "inline-flex min-h-[26px] max-w-full items-center gap-1 rounded border px-1.5 py-1 text-left transition-colors touch-manipulation",
                        mentionTone(mention.kind),
                        !clickable && "cursor-default opacity-45",
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0 opacity-90" />
                      <span className="truncate text-[8px] font-medium leading-tight">{mention.label}</span>
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
