"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { Brain, ExternalLink, Loader2, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMYCA } from "@/contexts/myca-context"
import { useStreamingSearch } from "@/hooks/use-streaming-search"
import { classifyAndRoute } from "@/lib/search/search-intelligence-router"
import { searchRouteToFluidSnapshot } from "@/lib/search/fluid-search-context"
import { WIDGET_REGISTRY, type WidgetType } from "@/lib/search/widget-registry"
import type { EarthContextFilters } from "@/lib/search/earth-context-filters"
import type { ResearchResult, SpeciesResult } from "@/lib/search/unified-search-sdk"
import { useSearchContext } from "../SearchContextProvider"
import { ChatInput } from "./ChatInput"
import { ChatMessage } from "./ChatMessage"
import type { DataCard, MobileChatMessage } from "./MobileSearchChat"
import type { MapObservation, EventObservation } from "../fluid/widgets/EarthWidget"
import { FallbackWidget } from "../fluid/widgets/FallbackWidget"

const EarthWidget = dynamic(() => import("../fluid/widgets/EarthWidget"), {
  ssr: false,
  loading: () => <WidgetLoader label="Loading Earth Simulator" />,
})

const SpeciesWidget = dynamic(() => import("../fluid/widgets/SpeciesWidget"), {
  ssr: false,
  loading: () => <WidgetLoader label="Loading species" />,
})
const ResearchWidget = dynamic(() => import("../fluid/widgets/ResearchWidget"), {
  ssr: false,
  loading: () => <WidgetLoader label="Loading research" />,
})
interface MobileSearchViewportProps {
  initialQuery?: string
}

const MOBILE_EARTH_WIDGETS = new Set<WidgetType>([
  "crep",
  "location",
  "weather",
  "events",
  "aircraft",
  "vessels",
  "satellites",
  "infrastructure",
  "devices",
  "emissions",
  "space_weather",
  "flights",
])

const MOBILE_DATA_WIDGETS = new Set<WidgetType>([
  "earth",
  "species",
  "research",
  "cameras",
])

function uniqueWidgets(widgets: Array<WidgetType | null | undefined>): WidgetType[] {
  const out: WidgetType[] = []
  for (const widget of widgets) {
    if (!widget) continue
    const normalized = MOBILE_EARTH_WIDGETS.has(widget) ? "earth" : widget
    if (!MOBILE_DATA_WIDGETS.has(normalized)) continue
    if (!out.includes(normalized)) out.push(normalized)
  }
  return out
}

function shouldForceEarth(filters?: EarthContextFilters | null): boolean {
  return Boolean(filters?.isContextual || filters?.enabledFilters.length)
}

function widgetTitle(widget: WidgetType): string {
  return WIDGET_REGISTRY[widget]?.label || widget.replace(/_/g, " ")
}

function WidgetLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[140px] items-center justify-center text-xs text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  )
}

function extractDataCards(content: string, nlqData?: Array<{ id: string; type: string; title: string; subtitle?: string }>): DataCard[] {
  const cards: DataCard[] = []
  if (!nlqData) return cards
  for (const item of nlqData) {
    const type = mapNlqTypeToCardType(item.type)
    if (!type) continue
    cards.push({
      type,
      data: {
        id: item.id,
        name: item.title,
        subtitle: item.subtitle,
      },
    })
  }
  return cards
}

function mapNlqTypeToCardType(nlqType: string): DataCard["type"] | null {
  const mapping: Record<string, DataCard["type"]> = {
    species: "species",
    compound: "chemistry",
    genetics: "genetics",
    location: "location",
    research: "research",
    news: "news",
    paper: "research",
  }
  return mapping[nlqType.toLowerCase()] || null
}

function extractSuggestions(content: unknown): string[] {
  if (typeof content !== "string") return []
  const suggestions: string[] = []
  const patterns = [
    /you (?:might|could|can) (?:also )?(?:ask|try|search)[:\s]+(.+?)(?:\n|$)/gi,
    /related (?:questions|searches)[:\s]+(.+?)(?:\n|$)/gi,
  ]
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      suggestions.push(...match[1].split(/[,\n\-]/).map((s) => s.trim()).filter(Boolean).slice(0, 3))
    }
  }
  return suggestions.slice(0, 4)
}

export function MobileSearchViewport({ initialQuery = "" }: MobileSearchViewportProps) {
  const ctx = useSearchContext()
  const { messages, isLoading: mycaLoading, sendMessage, consciousness } = useMYCA()
  const [query, setQuery] = useState(initialQuery)
  const [activeSlide, setActiveSlide] = useState(0)
  const didSendInitialRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const predictedRoute = useMemo(() => (query.trim().length >= 2 ? classifyAndRoute(query) : null), [query])
  const fluidContext = useMemo(
    () => predictedRoute ? { route: searchRouteToFluidSnapshot(predictedRoute) } : undefined,
    [predictedRoute]
  )
  const search = useStreamingSearch(query, {
    enabled: query.trim().length >= 2,
    debounceMs: 350,
    limit: 12,
    includeAI: false,
    fluidContext,
  })
  const route = search.intentPlan?.route ?? predictedRoute
  const earthContextFilters = search.intentPlan?.route.earthContextFilters ?? predictedRoute?.earthContextFilters ?? null

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  useEffect(() => {
    if (!initialQuery || didSendInitialRef.current) return
    didSendInitialRef.current = true
    ctx.setQuery(initialQuery)
    void sendMessage(initialQuery, {
      source: "web",
      contextText: `Current mobile search: ${initialQuery}`,
    })
  }, [ctx, initialQuery, sendMessage])

  useEffect(() => {
    ctx.setQuery(query)
  }, [ctx, query])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
  }, [messages.length, mycaLoading])

  const localMessages = useMemo<MobileChatMessage[]>(() => {
    return messages
      .filter((m) => m.role !== "system")
      .slice(-40)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        dataCards: extractDataCards(m.content, m.nlqData),
        suggestions: extractSuggestions(m.content),
      }))
  }, [messages])

  const rankedWidgets = useMemo(() => {
    const fromRoute = uniqueWidgets([
      route?.primaryWidget,
      ...(route?.secondaryWidgets ?? []),
    ])
    if (shouldForceEarth(earthContextFilters)) {
      const existingEarth = fromRoute.indexOf("earth")
      if (existingEarth >= 0) fromRoute.splice(existingEarth, 1)
      fromRoute.unshift("earth")
    }

    const withData = uniqueWidgets([
      search.species.length > 0 ? "species" : null,
      search.research.length > 0 ? "research" : null,
      search.events.length > 0 ? "events" : null,
      search.aircraft.length > 0 ? "aircraft" : null,
      search.vessels.length > 0 ? "vessels" : null,
      search.weather.length > 0 ? "weather" : null,
      search.infrastructure.length > 0 ? "infrastructure" : null,
      search.devices.length > 0 ? "devices" : null,
    ])

    const widgets = uniqueWidgets([...fromRoute, ...withData])
    if (widgets.length === 0) return ["species"] as WidgetType[]
    return widgets.slice(0, 3)
  }, [earthContextFilters, route, search.aircraft.length, search.devices.length, search.events.length, search.infrastructure.length, search.research.length, search.species.length, search.vessels.length, search.weather.length])

  useEffect(() => {
    setActiveSlide((prev) => Math.min(prev, Math.max(rankedWidgets.length - 1, 0)))
  }, [rankedWidgets.length])

  const mapObservations = useMemo<MapObservation[]>(() => {
    return search.liveResults
      .filter((item) => typeof item.lat === "number" && typeof item.lng === "number")
      .slice(0, 80)
      .map((item) => ({
        id: item.id,
        lat: item.lat!,
        lng: item.lng!,
        species: item.species,
        scientificName: item.species,
        timestamp: item.date,
        source: "Search",
        thumbnailUrl: item.imageUrl,
      }))
  }, [search.liveResults])

  const eventObservations = useMemo<EventObservation[]>(() => {
    return search.events
      .filter((event) => typeof event.lat === "number" && typeof event.lng === "number")
      .slice(0, 40)
      .map((event) => ({
        id: event.id,
        title: event.title,
        type: event.type,
        severity: event.severity,
        lat: event.lat,
        lng: event.lng,
        timestamp: event.timestamp,
        magnitude: event.magnitude,
      }))
  }, [search.events])

  const handleSend = useCallback(async (text: string) => {
    const nextQuery = text.trim()
    if (!nextQuery) return
    setQuery(nextQuery)
    ctx.setQuery(nextQuery)
    await sendMessage(nextQuery, {
      source: "web",
      contextText: `Mobile search query: ${nextQuery}`,
    })
  }, [ctx, sendMessage])

  const handleSaveToNotes = useCallback((message: MobileChatMessage, card?: DataCard) => {
    if (card) {
      ctx.addNotepadItem({
        type: card.type as any,
        title: (card.data.name || card.data.title || card.type) as string,
        content: JSON.stringify(card.data, null, 2).slice(0, 300),
        source: "Mobile Search",
        searchQuery: query,
      })
      return
    }
    ctx.addNotepadItem({
      type: "ai",
      title: message.content.slice(0, 60),
      content: message.content,
      source: "Mobile Search",
      searchQuery: query,
    })
  }, [ctx, query])

  return (
    <main className="h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] overflow-hidden bg-background text-foreground flex flex-col sm:h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-64px)]">
      <section className="h-[46%] min-h-0 border-b bg-card/30 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide">Context Widgets</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {query || "Search to focus the data"}
              </div>
            </div>
          </div>
          {earthContextFilters?.isContextual && (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[10px]">
              <Link href={`/apps/earth-simulator?q=${encodeURIComponent(query)}`}>
                Globe <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>

        <div className="flex gap-1 px-3 pb-2 shrink-0">
          {rankedWidgets.map((widget, index) => (
            <button
              key={widget}
              onClick={() => setActiveSlide(index)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index === activeSlide ? "bg-emerald-500" : "bg-muted"
              )}
              aria-label={`Show ${widgetTitle(widget)}`}
            />
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={rankedWidgets[activeSlide] || "empty"}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
              className="h-full px-3 pb-3"
            >
              <div className="h-full overflow-hidden rounded-lg border bg-background/80">
                <MobileTopWidget
                  widget={rankedWidgets[activeSlide] || "species"}
                  query={query}
                  isLoading={search.isLoading}
                  species={search.species}
                  research={search.research}
                  mapObservations={mapObservations}
                  eventObservations={eventObservations}
                  earthContextFilters={earthContextFilters}
                  buckets={{
                    events: search.events,
                    aircraft: search.aircraft.slice(0, 25),
                    vessels: search.vessels.slice(0, 25),
                    satellites: search.satellites.slice(0, 25),
                    weather: search.weather.slice(0, 25),
                    infrastructure: search.infrastructure.slice(0, 25),
                    devices: search.devices.slice(0, 25),
                    emissions: search.emissions.slice(0, 25),
                    space_weather: search.spaceWeather.slice(0, 25),
                    cameras: search.cameras.slice(0, 25),
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="h-[54%] min-h-0 flex flex-col bg-background">
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 text-violet-500" />
              {consciousness?.is_conscious && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-500" />}
            </div>
            <span className="text-sm font-semibold">Answers</span>
            {consciousness?.is_conscious && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-green-500 border-green-500/20">
                conscious
              </Badge>
            )}
          </div>
          {(search.isLoading || mycaLoading) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
          {localMessages.length === 0 && !mycaLoading ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground px-8">
              Ask a question or search the world. The latest answer stays in view here.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {localMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onSaveToNotes={handleSaveToNotes}
                  onSuggestionClick={handleSend}
                />
              ))}
            </AnimatePresence>
          )}
          {mycaLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              MYCA is answering...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
          <ChatInput onSend={handleSend} isLoading={mycaLoading} placeholder="Search or ask MYCA..." />
        </div>
      </section>
    </main>
  )
}

function MobileTopWidget({
  widget,
  query,
  isLoading,
  species,
  research,
  mapObservations,
  eventObservations,
  earthContextFilters,
  buckets,
}: {
  widget: WidgetType
  query: string
  isLoading: boolean
  species: SpeciesResult[]
  research: ResearchResult[]
  mapObservations: MapObservation[]
  eventObservations: EventObservation[]
  earthContextFilters: EarthContextFilters | null
  buckets: Record<string, any[]>
}) {
  const bodyClass = "h-full overflow-y-auto p-2"

  if (widget === "earth") {
    return (
      <MobileEarthSummary
        query={query}
        filters={earthContextFilters}
        mapObservations={mapObservations}
        eventObservations={eventObservations}
        buckets={buckets}
        isLoading={isLoading}
      />
    )
  }

  if (widget === "species") {
    return (
      <div className={bodyClass}>
        <SpeciesWidget data={species as any} isFocused isLoading={isLoading && (species as any[]).length === 0} />
      </div>
    )
  }

  if (widget === "research") {
    return (
      <div className={bodyClass}>
        <ResearchWidget data={research as any} isFocused isLoading={isLoading && research.length === 0} />
      </div>
    )
  }

  const bucketKey = widget === "space_weather" ? "space_weather" : widget
  const items = buckets[bucketKey] || []
  return (
    <div className={bodyClass}>
      <FallbackWidget
        bucketKey={bucketKey}
        title={widgetTitle(widget)}
        items={items}
        widgetType={widget}
      />
      {items.length === 0 && isLoading ? (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading {widgetTitle(widget).toLowerCase()} for {query}
        </div>
      ) : null}
    </div>
  )
}

function MobileEarthSummary({
  query,
  filters,
  mapObservations,
  eventObservations,
  buckets,
  isLoading,
}: {
  query: string
  filters: EarthContextFilters | null
  mapObservations: MapObservation[]
  eventObservations: EventObservation[]
  buckets: Record<string, any[]>
  isLoading: boolean
}) {
  const enabledLayers = filters
    ? Object.entries(filters.layerState).filter(([, enabled]) => enabled).map(([key]) => key)
    : []
  const liveEntities = useMemo(() => [
    ...(buckets.aircraft ?? []).map((item) => ({ ...item, type: "aircraft" })),
    ...(buckets.vessels ?? []).map((item) => ({ ...item, type: "vessel" })),
    ...(buckets.satellites ?? []).map((item) => ({ ...item, type: "satellite" })),
    ...(buckets.devices ?? []).map((item) => ({ ...item, type: "device" })),
    ...(buckets.weather ?? []).map((item) => ({ ...item, type: "event" })),
    ...(buckets.infrastructure ?? []).map((item) => ({ ...item, type: "event" })),
    ...(buckets.emissions ?? []).map((item) => ({ ...item, type: "event" })),
    ...(buckets.space_weather ?? []).map((item) => ({ ...item, type: "event" })),
  ], [buckets])

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="flex items-start justify-between gap-3 px-3 py-2 shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Earth Context</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {query || "No active Earth query"}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="h-7 shrink-0 px-2 text-[10px]">
          <Link href={`/apps/earth-simulator?q=${encodeURIComponent(query)}`}>
            Full globe <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="mx-3 mb-2 flex flex-wrap gap-1 shrink-0">
        {filters?.enabledFilters.length ? (
          filters.enabledFilters.map((filter) => (
            <Badge key={`${filter.category}:${filter.key}`} variant="outline" className="h-5 text-[10px] bg-background/80">
              {filter.label}
            </Badge>
          ))
        ) : (
          <Badge variant="outline" className="h-5 text-[10px] bg-background/80">
            filters off
          </Badge>
        )}
      </div>

      <div className="relative flex-1 min-h-0 bg-black">
        <EarthWidget
          data={mapObservations}
          eventsData={eventObservations}
          searchQuery={query}
          liveEntities={liveEntities}
          isFocused
          isLoading={isLoading}
        />
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[401] flex items-center justify-between rounded-md bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur">
          <span>{filters?.enabledFilters.length ?? 0} filters</span>
          <span>{mapObservations.length} points</span>
          <span>{eventObservations.length} events</span>
        </div>
      </div>

      <div className="px-3 py-1.5 shrink-0 text-[10px] text-muted-foreground">
        {enabledLayers.length > 0 ? (
          <span className="line-clamp-1">Active layers: {enabledLayers.join(", ")}</span>
        ) : (
          <span>Earth layers stay off until search context turns on only what matters.</span>
        )}
      </div>
    </div>
  )
}
