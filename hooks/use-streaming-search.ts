/**
 * useStreamingSearch — SSE /api/search/stream + unified payload (May 03 2026)
 * Drop-in shape compatible with useUnifiedSearch for FluidSearchCanvas.
 */

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FluidSearchContext } from "@/lib/search/fluid-search-context"
import type { ResultBucketKey } from "@/lib/search/unified-search-sdk"
import {
  EMPTY_RESULTS,
  type UnifiedSearchResponse,
  type SpeciesResult,
  type CompoundResult,
  type GeneticsResult,
  type ResearchResult,
  type LiveResult,
  type EventResult,
  type AircraftResult,
  type VesselResult,
  type SatelliteResult,
  type WeatherResult,
  type EmissionsResult,
  type InfrastructureResult,
  type DeviceResult,
  type SpaceWeatherResult,
  type CameraResult,
} from "@/lib/search/unified-search-sdk"
import type { IntentPlan } from "@/lib/search/compute-blended-intent"

export type {
  SpeciesResult,
  CompoundResult,
  GeneticsResult,
  ResearchResult,
  LiveResult,
  EventResult,
  AircraftResult,
  VesselResult,
  SatelliteResult,
  WeatherResult,
  EmissionsResult,
  InfrastructureResult,
  DeviceResult,
  SpaceWeatherResult,
  CameraResult,
  UnifiedSearchResponse,
}

interface UseStreamingSearchOptions {
  debounceMs?: number
  enabled?: boolean
  types?: ResultBucketKey[]
  limit?: number
  includeAI?: boolean
  lat?: number
  lng?: number
  fluidContext?: FluidSearchContext
  sessionId?: string
}

function encodeFluidForQuery(fluid: FluidSearchContext | undefined): string | null {
  if (!fluid) return null
  try {
    const json = JSON.stringify(fluid)
    if (json.length > 14_000) return null
    const utf8 = new TextEncoder().encode(json)
    let bin = ""
    utf8.forEach((b) => {
      bin += String.fromCharCode(b)
    })
    return btoa(bin)
  } catch {
    return null
  }
}

/** Match server partial-token: skip heavy Exa / MAS when user is mid-token */
function shouldSendPartialWordFlag(query: string): boolean {
  const t = query.trim()
  if (t.length < 2) return true
  if (/[\s.!?,;:\n\t]$/.test(query)) return false
  const parts = t.split(/\s+/)
  return parts.length === 1 && parts[0].length < 24
}

function normalizeUnifiedPayload(raw: unknown): UnifiedSearchResponse {
  if (!raw || typeof raw !== "object") {
    return {
      query: "",
      results: { ...EMPTY_RESULTS.results },
      totalCount: 0,
      timing: { total: 0, mindex: 0 },
      source: "live",
    }
  }
  const o = raw as Record<string, unknown>
  const results = (o.results as UnifiedSearchResponse["results"]) || { ...EMPTY_RESULTS.results }
  const merged = { ...EMPTY_RESULTS.results, ...results }
  const bucketKeys: (keyof UnifiedSearchResponse["results"])[] = [
    "species",
    "compounds",
    "genetics",
    "research",
    "events",
    "aircraft",
    "vessels",
    "satellites",
    "weather",
    "emissions",
    "infrastructure",
    "devices",
    "space_weather",
    "cameras",
  ]
  for (const k of bucketKeys) {
    const v = merged[k]
    if (!Array.isArray(v)) (merged as Record<string, unknown[]>)[k] = []
  }
  const aiRaw = o.aiAnswer ?? o.ai_answer
  let aiAnswer: string | undefined
  if (typeof aiRaw === "string") aiAnswer = aiRaw
  else if (aiRaw && typeof aiRaw === "object" && "answer" in (aiRaw as object)) {
    aiAnswer = String((aiRaw as { answer?: string }).answer || "")
  }
  return {
    query: String(o.query || ""),
    results: merged,
    totalCount: Number(o.totalCount) || 0,
    timing: (o.timing as UnifiedSearchResponse["timing"]) || { total: 0, mindex: 0 },
    source: (o.source as UnifiedSearchResponse["source"]) || "live",
    message: typeof o.message === "string" ? o.message : undefined,
    aiAnswer,
    live_results: Array.isArray(o.live_results) ? (o.live_results as LiveResult[]) : undefined,
    error: typeof o.error === "string" ? o.error : undefined,
  }
}

export interface UseStreamingSearchResult {
  results: UnifiedSearchResponse["results"]
  species: SpeciesResult[]
  compounds: CompoundResult[]
  genetics: GeneticsResult[]
  research: ResearchResult[]
  liveResults: LiveResult[]
  events: EventResult[]
  aircraft: AircraftResult[]
  vessels: VesselResult[]
  satellites: SatelliteResult[]
  weather: WeatherResult[]
  emissions: EmissionsResult[]
  infrastructure: InfrastructureResult[]
  devices: DeviceResult[]
  spaceWeather: SpaceWeatherResult[]
  cameras: CameraResult[]
  totalCount: number
  aiAnswer?: UnifiedSearchResponse["aiAnswer"]
  isLoading: boolean
  isValidating: boolean
  error: string | null
  isEmpty: boolean
  isSpeciesEmpty: boolean
  isCompoundsEmpty: boolean
  isGeneticsEmpty: boolean
  isResearchEmpty: boolean
  timing: UnifiedSearchResponse["timing"]
  source: UnifiedSearchResponse["source"]
  message?: string
  refresh: () => void
  prefetch: (query: string) => void
  /** Last blended intent from SSE `route` event */
  intentPlan: IntentPlan | null
}

export function useStreamingSearch(
  query: string,
  options: UseStreamingSearchOptions = {},
): UseStreamingSearchResult {
  const {
    debounceMs = 250,
    enabled = true,
    types = [
      "species",
      "compounds",
      "genetics",
      "research",
      "events",
      "aircraft",
      "vessels",
      "satellites",
      "weather",
      "emissions",
      "infrastructure",
      "devices",
      "space_weather",
      "cameras",
    ],
    limit = 20,
    includeAI = false,
    lat,
    lng,
    fluidContext,
    sessionId,
  } = options

  const [debounced, setDebounced] = useState("")
  const [data, setData] = useState<UnifiedSearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intentPlan, setIntentPlan] = useState<IntentPlan | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  const normalizedQuery = (query || "").trim()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!enabled || normalizedQuery.length < 2) {
      setDebounced("")
      return
    }
    timerRef.current = setTimeout(() => setDebounced(normalizedQuery), debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [normalizedQuery, debounceMs, enabled])

  const fluidB64 = useMemo(() => encodeFluidForQuery(fluidContext), [fluidContext])

  useEffect(() => {
    if (!enabled || debounced.length < 2) {
      setData(null)
      setIntentPlan(null)
      setError(null)
      setIsLoading(false)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      return
    }

    const mySeq = ++seqRef.current
    setData(null)
    setIsLoading(true)
    setError(null)

    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const params = new URLSearchParams()
    params.set("q", debounced)
    params.set("types", types.join(","))
    params.set("limit", String(limit))
    if (includeAI) params.set("ai", "1")
    if (sessionId) params.set("sessionId", sessionId)
    if (shouldSendPartialWordFlag(debounced)) params.set("partialWord", "1")
    if (typeof lat === "number" && !Number.isNaN(lat) && typeof lng === "number" && !Number.isNaN(lng)) {
      params.set("lat", String(lat))
      params.set("lng", String(lng))
    }
    if (fluidB64) params.set("fluidB64", fluidB64)

    const es = new EventSource(`/api/search/stream?${params.toString()}`)
    esRef.current = es
    const fallbackController = new AbortController()

    async function fetchUnifiedFallback(reason: string) {
      if (seqRef.current !== mySeq || fallbackController.signal.aborted) return

      const fallbackParams = new URLSearchParams()
      fallbackParams.set("q", debounced)
      fallbackParams.set("types", types.join(","))
      fallbackParams.set("limit", String(limit))
      if (includeAI) fallbackParams.set("ai", "true")
      if (typeof lat === "number" && !Number.isNaN(lat) && typeof lng === "number" && !Number.isNaN(lng)) {
        fallbackParams.set("lat", String(lat))
        fallbackParams.set("lng", String(lng))
      }

      try {
        const response = await fetch(`/api/search/unified?${fallbackParams.toString()}`, {
          headers: fluidB64 ? { "x-fluid-search-context": fluidB64 } : undefined,
          signal: fallbackController.signal,
        })
        if (!response.ok) throw new Error(`Unified search failed (${response.status})`)

        const payload = await response.json()
        if (seqRef.current !== mySeq || fallbackController.signal.aborted) return

        setData(normalizeUnifiedPayload(payload))
        setError(null)
      } catch (error) {
        if (fallbackController.signal.aborted || seqRef.current !== mySeq) return
        const message = error instanceof Error ? error.message : reason
        setError(message)
      } finally {
        if (seqRef.current === mySeq && !fallbackController.signal.aborted) setIsLoading(false)
      }
    }

    es.addEventListener("route", (ev) => {
      if (seqRef.current !== mySeq) return
      try {
        const plan = JSON.parse((ev as MessageEvent).data) as IntentPlan
        setIntentPlan(plan)
      } catch {
        /* ignore */
      }
    })

    es.addEventListener("widget-data", (ev) => {
      if (seqRef.current !== mySeq) return
      try {
        const wrap = JSON.parse((ev as MessageEvent).data) as { payload?: unknown; error?: string }
        if (wrap.error) {
          setError(wrap.error)
          return
        }
        if (wrap.payload) setData(normalizeUnifiedPayload(wrap.payload))
      } catch (e) {
        setError(e instanceof Error ? e.message : "widget-data parse error")
      }
    })

    es.addEventListener("stream-error", (ev) => {
      if (seqRef.current !== mySeq) return
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as { message?: string }
        void fetchUnifiedFallback(msg?.message || "stream error")
      } catch {
        void fetchUnifiedFallback("stream error")
      }
    })

    es.addEventListener("done", () => {
      if (seqRef.current !== mySeq) return
      setIsLoading(false)
      es.close()
      if (esRef.current === es) esRef.current = null
    })

    es.onerror = () => {
      if (seqRef.current !== mySeq) return
      es.close()
      if (esRef.current === es) esRef.current = null
      void fetchUnifiedFallback("EventSource connection error")
    }

    return () => {
      fallbackController.abort()
      es.close()
      if (esRef.current === es) esRef.current = null
    }
  }, [debounced, enabled, types, limit, includeAI, lat, lng, fluidB64, sessionId, refreshTick])

  const results = useMemo(() => {
    if (!data?.results) return { ...EMPTY_RESULTS.results }
    return { ...EMPTY_RESULTS.results, ...data.results }
  }, [data])

  const species = useMemo(() => results.species || [], [results.species])
  const compounds = useMemo(() => results.compounds || [], [results.compounds])
  const genetics = useMemo(() => results.genetics || [], [results.genetics])
  const research = useMemo(() => results.research || [], [results.research])
  const events = useMemo(() => results.events || [], [results.events])
  const aircraft = useMemo(() => results.aircraft || [], [results.aircraft])
  const vessels = useMemo(() => results.vessels || [], [results.vessels])
  const satellites = useMemo(() => results.satellites || [], [results.satellites])
  const weather = useMemo(() => results.weather || [], [results.weather])
  const emissions = useMemo(() => results.emissions || [], [results.emissions])
  const infrastructure = useMemo(() => results.infrastructure || [], [results.infrastructure])
  const devices = useMemo(() => results.devices || [], [results.devices])
  const spaceWeather = useMemo(() => results.space_weather || [], [results.space_weather])
  const cameras = useMemo(
    () => (Array.isArray(results.cameras) ? results.cameras : []),
    [results.cameras],
  )

  const totalCount = data?.totalCount || 0
  const liveResults = data?.live_results || []
  const aiAnswer = data?.aiAnswer
  const timing = data?.timing || { total: 0, mindex: 0 }
  const source = data?.source || "live"
  const message = data?.message

  const isSpeciesEmpty = species.length === 0
  const isCompoundsEmpty = compounds.length === 0
  const isGeneticsEmpty = genetics.length === 0
  const isResearchEmpty = research.length === 0
  const isEmpty =
    isSpeciesEmpty &&
    isCompoundsEmpty &&
    isGeneticsEmpty &&
    isResearchEmpty &&
    events.length === 0 &&
    aircraft.length === 0 &&
    vessels.length === 0 &&
    satellites.length === 0 &&
    weather.length === 0 &&
    emissions.length === 0 &&
    infrastructure.length === 0 &&
    devices.length === 0 &&
    spaceWeather.length === 0 &&
    cameras.length === 0

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1)
  }, [])

  const prefetch = useCallback((_prefetchQuery: string) => {
    /* SSE does not prefetch; unified client cache unused here */
  }, [])

  return {
    results,
    species,
    compounds,
    genetics,
    research,
    liveResults,
    events,
    aircraft,
    vessels,
    satellites,
    weather,
    emissions,
    infrastructure,
    devices,
    spaceWeather,
    cameras,
    totalCount,
    aiAnswer,
    isLoading: isLoading && !data && debounced.length >= 2,
    isValidating,
    error: error || data?.error || null,
    isEmpty,
    isSpeciesEmpty,
    isCompoundsEmpty,
    isGeneticsEmpty,
    isResearchEmpty,
    timing,
    source,
    message,
    refresh,
    prefetch,
    intentPlan,
  }
}
