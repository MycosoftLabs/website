/**
 * FluidSearchCanvas - Feb 2026
 *
 * Enhanced with physics-based animations:
 * - Floating/drifting effect for widgets
 * - Magnetic attraction to cursor
 * - Parallax depth layers
 * - Mycelium particle connections
 * - Draggable, saveable layouts
 * - Glassmorphism design
 * - Passes focusedId to widgets for correct item selection
 */

"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { useUnifiedSearch, type SpeciesResult, type CompoundResult, type GeneticsResult, type ResearchResult, type EventResult, type AircraftResult, type VesselResult, type SatelliteResult, type WeatherResult, type EmissionsResult, type InfrastructureResult, type DeviceResult, type SpaceWeatherResult } from "@/hooks/use-unified-search"
import { usePackery } from "@/hooks/use-packery"
import { useSearchContext } from "@/components/search/SearchContextProvider"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Mic,
  Loader2,
  Sparkles,
  MessageCircle,
  History,
  Minimize2,
  X,
  MapPin,
  Film,
  Newspaper,
  Brain,
  GripVertical,
  Radar,
} from "lucide-react"
import nextDynamic from "next/dynamic"
import {
  getWidgetFloatVariants,
  getParallaxDepth,
  widgetEnterAnimation,
  glowPulseAnimation,
  initializeParticles,
  updateParticles,
  findParticleConnections,
  type Particle,
} from "@/lib/search/widget-physics"
import { detectWorldviewIntent } from "@/lib/search/world-view-suggestions"
import { classifyAndRoute, type SearchRoute } from "@/lib/search/search-intelligence-router"
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder"
import { useVoiceSearch } from "@/hooks/use-voice-search"
import { useMYCAContext } from "@/hooks/use-myca-context"
import { useSearchMemory } from "@/hooks/use-search-memory"
import { useVoice } from "@/components/voice/UnifiedVoiceProvider"
import { useMYCA } from "@/contexts/myca-context"
import { useAuth } from "@/contexts/auth-context"

const SpeciesWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.SpeciesWidget })), { ssr: false })
const ChemistryWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.ChemistryWidget })), { ssr: false })
const GeneticsWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.GeneticsWidget })), { ssr: false })
const ResearchWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.ResearchWidget })), { ssr: false })
const AnswersWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.AnswersWidget })), { ssr: false })
const MediaWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.MediaWidget })), { ssr: false })
const LocationWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.LocationWidget })), { ssr: false })
const NewsWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.NewsWidget })), { ssr: false })
const EarthWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.EarthWidget })), { ssr: false })
const CrepWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.CrepWidget })), { ssr: false })
const FallbackWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.FallbackWidget })), { ssr: false })
const EmbeddingAtlasWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.EmbeddingAtlasWidget })), { ssr: false })
const CameraWidget = nextDynamic(() => import("./widgets").then((m) => ({ default: m.CameraWidget })), { ssr: false })
const CREPDashboardClient = nextDynamic(() => import("@/app/dashboard/crep/CREPDashboardClient"), { ssr: false })

export type WidgetType = "species" | "chemistry" | "genetics" | "research" | "answers" | "media" | "location" | "news"
  | "crep" | "earth" | "fallback" | "embedding_atlas" | "cameras"
  | "events" | "aircraft" | "vessels" | "satellites" | "weather" | "emissions" | "infrastructure" | "devices" | "space_weather"

interface WidgetConfig {
  type: WidgetType
  label: string
  icon: React.ReactNode
  gradient: string
  hasData: boolean
  depth: number
  /** For type "fallback": result bucket key and items (Mar 14, 2026). */
  fallbackBucketKey?: string
  fallbackItems?: Array<Record<string, unknown>>
}

/** Typed observation for map display (combined from location + CREP data) */
interface MapObservation {
  id: string; lat: number; lng: number; species: string;
  scientificName: string; timestamp: string; source: string; thumbnailUrl?: string;
}

// Mycelium particle background component
function MyceliumBackground({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!width || !height) return
    particlesRef.current = initializeParticles(width, height)
  }, [width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width || !height) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      
      // Update particles
      particlesRef.current = updateParticles(particlesRef.current, width, height)
      
      // Draw connections
      const connections = findParticleConnections(particlesRef.current)
      ctx.strokeStyle = "rgba(34, 197, 94, 0.15)"
      ctx.lineWidth = 1
      
      for (const [i, j, opacity] of connections) {
        ctx.globalAlpha = opacity * 0.3
        ctx.beginPath()
        ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y)
        ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y)
        ctx.stroke()
      }
      
      // Draw particles
      ctx.fillStyle = "rgba(34, 197, 94, 0.4)"
      for (const p of particlesRef.current) {
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none opacity-40"
    />
  )
}

function LazyWidgetMount({
  children,
  rootMargin = "250px",
}: {
  children: React.ReactNode
  rootMargin?: string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = hostRef.current
    if (!element || isVisible || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  return (
    <div ref={hostRef} className="h-full">
      {isVisible ? children : <div className="h-full min-h-[120px]" />}
    </div>
  )
}

interface FluidSearchCanvasProps {
  initialQuery?: string
  onNavigate?: (url: string) => void
  voiceEnabled?: boolean
  className?: string
}

// Default widget sizes - aligned with lib/search/widget-registry.ts
// Primary widgets (species, answers) start at 2x2.
// Map/CREP/Earth2 start at 2x3 to fill viewport when relevant.
// Earth Intelligence widgets (aircraft, vessels, events) start at 2x2 when data arrives.
const DEFAULT_WIDGET_SIZES: Record<WidgetType, { width: 1 | 2; height: 1 | 2 | 3 }> = {
  species: { width: 2, height: 2 },
  chemistry: { width: 1, height: 1 },
  genetics: { width: 1, height: 1 },
  research: { width: 1, height: 2 },
  answers: { width: 2, height: 2 },
  media: { width: 1, height: 1 },
  location: { width: 1, height: 1 },
  news: { width: 1, height: 1 },
  crep: { width: 2, height: 3 },
  earth: { width: 2, height: 3 },
  fallback: { width: 1, height: 1 },
  embedding_atlas: { width: 2, height: 2 },
  events: { width: 2, height: 2 },
  aircraft: { width: 2, height: 2 },
  vessels: { width: 2, height: 2 },
  satellites: { width: 1, height: 1 },
  weather: { width: 2, height: 1 },
  emissions: { width: 1, height: 1 },
  infrastructure: { width: 1, height: 1 },
  devices: { width: 1, height: 1 },
  space_weather: { width: 1, height: 1 },
  cameras: { width: 2, height: 2 },
}

export function FluidSearchCanvas({
  initialQuery = "",
  onNavigate,
  voiceEnabled = true,
  className,
}: FluidSearchCanvasProps) {
  const ctx = useSearchContext()
  const { user } = useAuth()
  const canvasRef = useRef<HTMLDivElement>(null)
  const prevLiveCountRef = useRef(0)
  // Stable ref for setLiveObservations to avoid infinite re-renders
  const setLiveObservationsRef = useRef(ctx.setLiveObservations)
  // Track previous results key to prevent infinite update loops
  const prevResultsKeyRef = useRef("")
  const [localQuery, setLocalQuery] = useState(initialQuery || "")
  // Multi-widget grid: track multiple expanded widgets instead of single focused
  const [expandedWidgets, setExpandedWidgets] = useState<Set<WidgetType>>(new Set(["species"]))
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [minimizedTypes, setMinimizedTypes] = useState<Set<WidgetType>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showCrepDashboard, setShowCrepDashboard] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // MYCA Memory integration — only when logged in; no persistence for anonymous
  const searchMemory = useSearchMemory({ 
    userId: user?.id ?? "",
    autoStart: !!user?.id,
  })
  
  // Widget sizes state - user can resize widgets
  const [widgetSizes, setWidgetSizes] = useState<Record<WidgetType, { width: 1 | 2; height: 1 | 2 | 3 }>>({ ...DEFAULT_WIDGET_SIZES })

  // Responsive column count — tracked via ResizeObserver on the grid container
  const [containerWidth, setContainerWidth] = useState(800)
  const containerWidthRef = useRef(800)
  const GUTTER = 12

  // ── Packery MUST be declared before the effects and callbacks that use it ──
  const { 
    containerRef: packeryContainerRef, 
    layout: packeryLayout, 
    reloadItems, 
    isReady: packeryReady,
    updateWidgetSize,
  } = usePackery({
    columnWidth: ".grid-sizer", // Use a sizer element for responsive column width
    gutter: 12,
    itemSelector: ".packery-widget",
    horizontalOrder: true,
    transitionDuration: 500, // Slower transition for smoother animations
    draggable: true,
    dragHandle: ".widget-drag-handle",
    percentPosition: true,
    onLayoutComplete: (items) => {
      // Persist widget order to sessionStorage
      try {
        const order = items.map((el) => el.dataset.widgetId || "").filter(Boolean)
        if (order.length > 0) {
          sessionStorage.setItem("search-widget-order", JSON.stringify(order))
        }
      } catch {
        // Ignore storage errors (e.g., private browsing)
      }
    },
  })

  // Breakpoints: how many Packery columns to use at each container width
  const columns = useMemo(() => {
    if (containerWidth < 480)  return 1
    if (containerWidth < 780)  return 2
    if (containerWidth < 1180) return 3
    return 4
  }, [containerWidth])

  // Watch the grid container width with ResizeObserver
  useEffect(() => {
    const el = packeryContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      if (w !== containerWidthRef.current) {
        containerWidthRef.current = w
        setContainerWidth(w)
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [packeryContainerRef])

  // Re-layout Packery whenever column count changes
  useEffect(() => {
    if (!packeryReady) return
    requestAnimationFrame(() => {
      reloadItems()
      packeryLayout()
    })
  }, [columns, packeryReady, reloadItems, packeryLayout])

  // Compute CSS width for a widget given its column span
  const getWidgetWidth = useCallback((span: number): string => {
    const s = Math.min(span, columns)
    if (s >= columns) return "100%"
    const pct = (100 * s / columns).toFixed(4)
    const sub = (GUTTER * (1 - s / columns)).toFixed(2)
    return `calc(${pct}% - ${sub}px)`
  }, [columns])

  // CSS width for the .grid-sizer element — tells Packery the base column unit
  const gridSizerWidth = useMemo(() => getWidgetWidth(1), [getWidgetWidth])

  // Cycle widget size: 1x1 → 1x2 → 1x3 → 2x1 → 2x2 → 2x3 → 1x1
  // Width=1 = 1 column, Width=2 = 2 columns (adapts to whatever column count is active)
  const cycleWidgetSize = useCallback((type: WidgetType) => {
    setWidgetSizes(prev => {
      const cur = prev[type] || { width: 1, height: 1 }
      let next: { width: 1 | 2; height: 1 | 2 | 3 }
      if      (cur.width === 1 && cur.height === 1) next = { width: 1, height: 2 }
      else if (cur.width === 1 && cur.height === 2) next = { width: 1, height: 3 }
      else if (cur.width === 1 && cur.height === 3) next = { width: 2, height: 1 }
      else if (cur.width === 2 && cur.height === 1) next = { width: 2, height: 2 }
      else if (cur.width === 2 && cur.height === 2) next = { width: 2, height: 3 }
      else                                          next = { width: 1, height: 1 }
      return { ...prev, [type]: next }
    })
    setTimeout(() => { reloadItems(); packeryLayout() }, 50)
  }, [reloadItems, packeryLayout])
  
  // Get CSS classes for widget size
  const getWidgetSizeClasses = useCallback((type: WidgetType) => {
    const size = widgetSizes[type] || DEFAULT_WIDGET_SIZES[type] || { width: 1, height: 1 }
    return `widget-w-${size.width} widget-h-${size.height}`
  }, [widgetSizes])
  
  // Animated typing placeholder
  const { placeholder: animatedPlaceholder, pause, resume } = useTypingPlaceholder({
    enabled: !localQuery && !isInputFocused,
  })

  // MYCA intention tracking
  const { trackSearch, trackWidgetFocus, trackNotepadAdd, trackVoice, suggestions } = useMYCAContext({ enabled: true })
  const { sendMessage: sendMycaMessage, messages: mycaMessages } = useMYCA()

  // Unified voice context (global, driven by UnifiedVoiceProvider in layout)
  const unifiedVoice = useVoice()

  // Voice search integration — PersonaPlex speech → search commands
  const voiceSearch = useVoiceSearch({
    onSearch: (query) => {
      setLocalQuery(query)
      ctx.setQuery(query)
      trackVoice(query)
      trackSearch(query, undefined, { current_query: query })
    },
    onFocusWidget: (widgetId) => {
      const widgetType = widgetId as WidgetType
      setExpandedWidgets((prev) => new Set(prev).add(widgetType))
      setMinimizedTypes((prev) => { const n = new Set(prev); n.delete(widgetType); return n })
    },
    onAIQuestion: (question) => {
      setLocalQuery(question)
      ctx.setQuery(question)
      setExpandedWidgets((prev) => new Set(prev).add("answers"))
      const contextParts: string[] = []
      if (ctx.query) contextParts.push(`current search: ${ctx.query}`)
      if (ctx.species.length) {
        contextParts.push(`species in view: ${ctx.species.slice(0, 3).map((s) => s.scientificName).join(", ")}`)
      }
      if (ctx.compounds.length) {
        contextParts.push(`compounds in view: ${ctx.compounds.slice(0, 3).map((c) => c.name).join(", ")}`)
      }
      if (ctx.genetics.length) {
        contextParts.push(`genetics in view: ${ctx.genetics.slice(0, 3).map((g) => g.speciesName || "Sequence").join(", ")}`)
      }
      if (ctx.research.length) {
        contextParts.push(`papers in view: ${ctx.research.slice(0, 3).map((r) => r.title).join(", ")}`)
      }
      sendMycaMessage(question, {
        contextText: contextParts.length ? `Search context: ${contextParts.join("; ")}` : undefined,
      })
      trackVoice(question)
      trackSearch(question, undefined, { current_query: question, source: "voice_ai" })
    },
    enabled: voiceEnabled,
  })

  // The search page mic button drives the UNIFIED voice context so it stays in sync
  // with everything else (nav bar, MYCA widgets, etc.).
  const isMicActive = unifiedVoice.isListening || voiceSearch.isListening
  const handleMicClickRef = useRef<(() => void) | undefined>(undefined)
  handleMicClickRef.current = () => {
    if (unifiedVoice.isListening || voiceSearch.isListening) {
      unifiedVoice.stopListening()
      voiceSearch.stopListening()
      ctx.setVoiceListening(false)
    } else {
      unifiedVoice.startListening()
      voiceSearch.startListening()
      ctx.setVoiceListening(true)
    }
  }
  const handleMicClick = () => handleMicClickRef.current?.()

  // Sync voice state to context for MYCA panel
  useEffect(() => {
    ctx.setVoiceListening(isMicActive)
  }, [isMicActive, ctx])

  // Let MYCA panel trigger voice via event bus (toggle)
  useEffect(() => {
    const unsub = ctx.on("voice:toggle", () => handleMicClickRef.current?.())
    return unsub
  }, [ctx])

  // When MYCA triggers a search action, update localQuery so results refresh
  useEffect(() => {
    const unsub = ctx.on("search:execute", (payload: { query?: string }) => {
      if (payload?.query) setLocalQuery(payload.query)
    })
    return unsub
  }, [ctx])

  // Sync initialQuery
  useEffect(() => {
    if (initialQuery) {
      setLocalQuery(initialQuery)
      ctx.setQuery(initialQuery)
    }
  }, [initialQuery]) // eslint-disable-line

  useEffect(() => {
    ctx.setQuery(localQuery)
  }, [localQuery]) // eslint-disable-line

  // Request user location for Earth2 and location-based features
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        // Fall back to default if geolocation denied
        // Don't set anything - let the Earth2 fetcher use default coords
      },
      { timeout: 5000, maximumAge: 300000 } // 5s timeout, cache for 5 min
    )
  }, [])

  // Search hook - fetch ALL data types across all Earth Intelligence domains
  const {
    species, compounds, genetics, research, aiAnswer,
    liveResults,
    events, aircraft, vessels, satellites, weather,
    emissions, infrastructure, devices, spaceWeather, cameras,
    isLoading: rawIsLoading, isValidating, totalCount, error, message,
    refresh: searchRefresh,
  } = useUnifiedSearch(localQuery, {
    types: ["species", "compounds", "genetics", "research",
      "events", "aircraft", "vessels", "satellites", "weather",
      "emissions", "infrastructure", "devices", "space_weather", "cameras"],
    includeAI: true,
    limit: 20,
    lat: userLocation?.lat,
    lng: userLocation?.lng,
  })

  // Timeout guard: if loading takes longer than 15s, stop showing skeleton
  // loaders and show empty states instead. This prevents infinite skeletons
  // when backend APIs (MAS/MINDEX) are unreachable.
  const [searchTimedOut, setSearchTimedOut] = useState(false)
  useEffect(() => {
    if (!rawIsLoading) {
      setSearchTimedOut(false)
      return
    }
    const timer = setTimeout(() => setSearchTimedOut(true), 15000)
    return () => clearTimeout(timer)
  }, [rawIsLoading])
  const isLoading = rawIsLoading && !searchTimedOut

  // Empty-widget policy: when a widget emits "refresh-search", re-fetch (triggers background ingest)
  useEffect(() => {
    return ctx.on("refresh-search", () => searchRefresh())
  }, [ctx, searchRefresh])

  // Debounced query for additional endpoints
  const debouncedQuery = useDebounce(localQuery, 300)

  // ── Context-aware news query ─────────────────────────────────────────────
  // Combines the current query, species/compound/genetics names from visible
  // widgets, and recent search history so the news feed is always relevant
  // to everything the user has seen or said.
  const newsQuery = useMemo(() => {
    const seen = new Set<string>()
    const push = (t: string) => { const v = t?.trim(); if (v && v.length > 1 && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); terms.push(v) } }
    const terms: string[] = []

    // 1. Current typed/spoken query (highest priority)
    if (debouncedQuery?.trim()) push(debouncedQuery.trim())

    // 2. Species: prefer common name for readable headlines, fallback scientific
    species.slice(0, 3).forEach(s => push(s.commonName || s.scientificName))

    // 3. Chemistry: compound names (e.g. "psilocybin", "ergosterol")
    compounds.slice(0, 2).forEach(c => push(c.name))

    // 4. Genetics: species the gene belongs to + gene region if short
    genetics.slice(0, 2).forEach(g => {
      push(g.speciesName)
      if (g.geneRegion && g.geneRegion.length < 20) push(g.geneRegion)
    })

    // 5. Research paper titles → extract first 3 words as context term
    research.slice(0, 2).forEach(r => {
      const firstWords = r.title?.split(/\s+/).slice(0, 3).join(" ")
      if (firstWords && firstWords.length > 4) push(firstWords)
    })

    // 6. Recent searches (last 3, excluding current)
    recentSearches
      .filter(q => q !== debouncedQuery)
      .slice(0, 3)
      .forEach(q => push(q))

    // Build NewsAPI boolean OR query, quoted phrases for multi-word terms
    // Cap at 6 terms and keep total URL-friendly (< 300 chars unencoded)
    const finalTerms = terms
      .slice(0, 6)
      .map(t => (t.includes(" ") ? `"${t}"` : t))

    return finalTerms.length > 0 ? finalTerms.join(" OR ") : ""
  }, [debouncedQuery, species, compounds, genetics, research, recentSearches])
  
  // Media widget data fetcher
  const { data: mediaData } = useSWR(
    debouncedQuery && debouncedQuery.length >= 2 ? `/api/search/media?q=${encodeURIComponent(debouncedQuery)}&limit=10` : null,
    async (url) => { const res = await fetch(url); return res.json() },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )
  
  // Location widget data fetcher
  const { data: locationData } = useSWR(
    debouncedQuery && debouncedQuery.length >= 2 ? `/api/search/location?q=${encodeURIComponent(debouncedQuery)}&limit=20` : null,
    async (url) => { const res = await fetch(url); return res.json() },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )
  
  // News widget data fetcher — uses context-aware query (species + compounds + genetics + recent searches)
  const { data: newsData } = useSWR(
    newsQuery ? `/api/search/news?q=${encodeURIComponent(newsQuery)}&limit=15` : null,
    async (url) => { const res = await fetch(url); return res.json() },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  
  // CREP data fetcher - uses CREP search API with live auto-refresh (30s)
  const { data: crepData } = useSWR(
    debouncedQuery && debouncedQuery.length >= 2 ? `/api/search/crep?q=${encodeURIComponent(debouncedQuery)}&limit=50` : null,
    async (url) => { const res = await fetch(url); return res.json() },
    { revalidateOnFocus: false, dedupingInterval: 10000, refreshInterval: 30000 }
  )
  
  // Earth2 weather/spore data fetcher - use user location or default to San Francisco
  const earth2Coords = userLocation || { lat: 37.7749, lng: -122.4194 }
  const { data: earth2RawData } = useSWR(
    debouncedQuery && debouncedQuery.length >= 2 ? `/api/earth2/forecast?lat=${earth2Coords.lat}&lon=${earth2Coords.lng}` : null,
    async (url) => { const res = await fetch(url); return res.json() },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  
  // Extract results from new endpoints — ensure arrays are always defined
  const mediaResults = Array.isArray(mediaData?.results) ? mediaData.results : []
  const mediaError = mediaData?.error
  const locationResults = useMemo(() => Array.isArray(locationData?.results) ? locationData.results : [], [locationData])
  const newsResults = Array.isArray(newsData?.results) ? newsData.results : []
  const newsError = newsData?.error
  const newsQueryUsed = newsData?.queryUsed as string | undefined
  const crepResults = useMemo(() => {
    // Pass through full CREPSearchResult objects to preserve domain-specific properties
    // for the compartmentalized CrepWidget (aircraft speed/altitude, vessel heading, etc.)
    const raw = crepData?.results || crepData?.observations
    const results = Array.isArray(raw) ? raw : []
    return results.map((r: Record<string, unknown>) => ({
      // Full CREPSearchResult fields (used by new compartmentalized widget)
      id: r.id,
      type: r.type || "fungal",
      title: r.title || r.species,
      description: r.description || r.location || "",
      latitude: r.latitude || r.lat || 0,
      longitude: r.longitude || r.lng || 0,
      altitude: r.altitude,
      timestamp: r.timestamp || r.observed_on,
      source: r.source || "CREP",
      properties: r.properties || {},
      relevance: r.relevance || 0.5,
      crepMapUrl: r.crepMapUrl || "",
      // Legacy CrepObservation fields (backwards compat for map observations)
      species: r.title || r.species,
      scientificName: (r.properties as Record<string, unknown>)?.scientificName || r.scientificName || r.title,
      commonName: (r.properties as Record<string, unknown>)?.commonName || r.commonName,
      verified: (r.properties as Record<string, unknown>)?.qualityGrade === "research",
      imageUrl: (r.properties as Record<string, unknown>)?.imageUrl || r.imageUrl || r.image_url,
      thumbnailUrl: (r.properties as Record<string, unknown>)?.thumbnailUrl || r.thumbnailUrl || r.thumbnail_url,
      location: r.description || r.location,
      sourceUrl: (r.properties as Record<string, unknown>)?.sourceUrl || r.sourceUrl || r.crepMapUrl,
      isToxic: (r.properties as Record<string, unknown>)?.isToxic || r.isToxic,
    }))
  }, [crepData])

  // Merge CREP search results with Earth Intelligence data from useUnifiedSearch.
  // This ensures the CrepWidget shows compartmentalized live data from ALL domains
  // (aircraft altitude/speed, vessel heading, device sensors, etc.) — not just the
  // results from /api/search/crep but also the unified search Earth Intelligence feeds.
  const mergedCrepData = useMemo(() => {
    const seenIds = new Set<string>()
    const merged: Record<string, unknown>[] = []

    // Primary: CREP search results (already typed with domain info)
    for (const r of crepResults) {
      const id = String((r as Record<string, unknown>).id || "")
      if (id && seenIds.has(id)) continue
      if (id) seenIds.add(id)
      merged.push(r as Record<string, unknown>)
    }

    // Supplement: Earth Intelligence domain data from useUnifiedSearch
    // Convert each domain's raw data into CrepSearchResult format for the CrepWidget
    const domainSources: { items: unknown[] | undefined; type: string; titleFn: (i: Record<string, unknown>) => string; propsFn: (i: Record<string, unknown>) => Record<string, unknown> }[] = [
      {
        items: aircraft, type: "aircraft",
        titleFn: (a) => String(a.callsign || a.flightNumber || a.id || "Unknown"),
        propsFn: (a) => ({ callsign: a.callsign, aircraftType: a.type || a.aircraftType, origin: a.origin, destination: a.destination, speed: a.speed || a.velocity, heading: a.heading }),
      },
      {
        items: vessels, type: "vessel",
        titleFn: (v) => String(v.name || v.mmsi || "Unknown"),
        propsFn: (v) => ({ mmsi: v.mmsi, shipType: v.type || v.shipType, destination: v.destination, flag: v.flag, speed: v.speed || v.sog }),
      },
      {
        items: events, type: "event",
        titleFn: (e) => String(e.title || e.type || "Event"),
        propsFn: (e) => ({ severity: e.severity, eventType: e.type, magnitude: e.magnitude, sourceUrl: e.sourceUrl || e.link }),
      },
      {
        items: satellites, type: "satellite",
        titleFn: (s) => String(s.name || s.noradId || "Satellite"),
        propsFn: (s) => ({ noradId: s.noradId || s.id, orbitType: s.orbitType, category: s.category, inclination: s.inclination, velocity: s.velocity }),
      },
      {
        items: devices, type: "device",
        titleFn: (d) => String(d.name || d.id || "Device"),
        propsFn: (d) => ({ deviceType: d.type, status: d.status, firmware: d.firmware, sensorData: d.sensorData }),
      },
      {
        items: spaceWeather, type: "space_weather",
        titleFn: (sw) => String(sw.title || "Space Weather"),
        propsFn: (sw) => ({ kpIndex: sw.kpIndex, flareClass: sw.flareClass, solarWindSpeed: sw.solarWindSpeed }),
      },
    ]

    for (const { items, type, titleFn, propsFn } of domainSources) {
      if (!Array.isArray(items)) continue
      for (const raw of items) {
        const item = raw as Record<string, unknown>
        const id = String(item.id || `${type}-${item.lat || item.latitude}-${item.lng || item.longitude}`)
        if (seenIds.has(id)) continue
        seenIds.add(id)
        merged.push({
          id,
          type,
          title: titleFn(item),
          description: String(item.description || ""),
          latitude: Number(item.lat || item.latitude || 0),
          longitude: Number(item.lng || item.longitude || 0),
          altitude: item.altitude != null ? Number(item.altitude) : undefined,
          timestamp: String(item.timestamp || item.lastSeen || new Date().toISOString()),
          source: String(item.source || type),
          properties: propsFn(item),
          relevance: 0.5,
          crepMapUrl: `/dashboard/crep?lat=${item.lat || item.latitude}&lng=${item.lng || item.longitude}&zoom=8&highlight=${id}`,
        })
      }
    }

    return merged
  }, [crepResults, aircraft, vessels, events, satellites, devices, spaceWeather])

  const earth2Data = earth2RawData?.available ? earth2RawData : null
  
  // Map observations from location and CREP data
  interface LocationResult {
    id?: string; lat: number; lng: number; species?: string; commonName?: string;
    scientificName?: string; observedOn?: string; timestamp?: string;
    source?: string; imageUrl?: string;
    speciesName?: string; placeName?: string; observedAt?: string;
  }
  interface CrepResult {
    id?: string; latitude: number; longitude: number; commonName?: string; species?: string;
    scientificName?: string; timestamp?: string; source?: string;
    thumbnailUrl?: string; imageUrl?: string;
  }
  const mapObservations = useMemo((): MapObservation[] => {
    const locations = (locationResults as LocationResult[]).map((loc) => ({
      id: loc.id || `loc-${loc.lat}-${loc.lng}`,
      lat: loc.lat,
      lng: loc.lng,
      species: loc.species || loc.commonName || "Unknown",
      scientificName: loc.scientificName || "",
      timestamp: loc.observedOn || loc.timestamp || new Date().toISOString(),
      source: loc.source || "iNaturalist",
      thumbnailUrl: loc.imageUrl,
    }))
    const creps = (crepResults as any[]).map((obs) => ({
      id: obs.id || `crep-${obs.latitude}-${obs.longitude}`,
      lat: obs.latitude,
      lng: obs.longitude,
      species: obs.commonName || obs.species || "Unknown",
      scientificName: obs.scientificName || "",
      timestamp: obs.timestamp || new Date().toISOString(),
      source: obs.source || "CREP",
      thumbnailUrl: obs.thumbnailUrl || obs.imageUrl,
    }))
    return [...locations, ...creps]
  }, [locationResults, crepResults])

  const eventObservations = useMemo(() => {
    if (!events || !Array.isArray(events)) return []
    return (events as unknown as Array<Record<string, unknown>>).map((ev) => ({
      id: String(ev.id || Math.random().toString(36).slice(2)),
      title: String(ev.title || ev.type || "Event"),
      type: String(ev.type || "event"),
      severity: ev.severity ? String(ev.severity) : undefined,
      lat: Number(ev.lat || ev.latitude || 0),
      lng: Number(ev.lng || ev.longitude || 0),
      timestamp: ev.timestamp ? String(ev.timestamp) : undefined,
      magnitude: ev.magnitude ? Number(ev.magnitude) : undefined,
    }))
  }, [events])
  
  // Handler to view an observation on the map
  const handleViewOnMap = useCallback((observation: MapObservation) => {
    // Expand the map widget and set focus
    setExpandedWidgets((prev) => new Set(prev).add("earth"))
    setMinimizedTypes((prev) => { const n = new Set(prev); n.delete("earth"); return n })
  }, [])

  // Track search to MYCA intention when results arrive
  useEffect(() => {
    if (
      !isLoading &&
      localQuery &&
      (species.length > 0 || compounds.length > 0 || genetics.length > 0 || research.length > 0)
    ) {
      trackSearch(localQuery, totalCount, {
        current_query: localQuery,
        focused_widget: [...expandedWidgets][0],
        recent_interactions: recentSearches.slice(0, 5),
      })
    }
  }, [isLoading, localQuery, totalCount, species.length, compounds.length, genetics.length, research.length, expandedWidgets, recentSearches]) // eslint-disable-line

  // Record search query to MYCA memory system for long-term storage and personalization
  useEffect(() => {
    if (
      !isLoading &&
      localQuery &&
      localQuery.length >= 2 &&
      (species.length > 0 || compounds.length > 0 || genetics.length > 0 || research.length > 0)
    ) {
      // Record the query with result counts by type
      searchMemory.recordQuery(localQuery, totalCount, {
        species: species.length,
        compounds: compounds.length,
        genetics: genetics.length,
        research: research.length,
      }, "text")
    }
  }, [isLoading, localQuery, totalCount, species.length, compounds.length, genetics.length, research.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Push results to context - use a key to prevent infinite updates
  useEffect(() => {
    if (!isLoading && (species.length > 0 || compounds.length > 0 || research.length > 0)) {
      // Create a stable key from result counts and query to prevent re-triggering
      const resultsKey = `${localQuery}-${species.length}-${compounds.length}-${genetics.length}-${research.length}-${aiAnswer ? "ai" : ""}`
      if (resultsKey === prevResultsKeyRef.current) return
      prevResultsKeyRef.current = resultsKey
      
      ctx.setResults({
        query: localQuery,
        results: { species, compounds, genetics, research } as unknown as any,
        totalCount,
        timing: { total: 0, mindex: 0 },
        source: "live",
        aiAnswer,
      })
    }
  }, [species.length, compounds.length, genetics.length, research.length, aiAnswer, isLoading, localQuery]) // eslint-disable-line

  // Keep setLiveObservations ref updated
  useEffect(() => {
    setLiveObservationsRef.current = ctx.setLiveObservations
  }, [ctx.setLiveObservations])

  // Push live results to context for LiveResultsWidget.
  // Now includes ALL result types (observations, events, aircraft, vessels, news)
  // with type metadata so the panel can render type-specific icons and badges.
  // NOTE: ctx removed from deps to prevent infinite re-renders - using ref instead
  useEffect(() => {
    const allLiveItems: Array<Record<string, unknown>> = []

    // 1. Species observations from unified search
    if (liveResults.length > 0) {
      for (const obs of liveResults) {
        allLiveItems.push({
          id: obs.id,
          species: obs.species,
          location: obs.location || "Unknown location",
          date: obs.date || "",
          photoUrl: obs.imageUrl,
          lat: obs.lat,
          lng: obs.lng,
          type: "observation",
          title: obs.species,
          source: "iNaturalist",
        })
      }
    } else if (locationResults.length > 0) {
      // Fallback to location results
      for (const obs of (locationResults as LocationResult[])) {
        allLiveItems.push({
          id: obs.id || `loc-${obs.lat}-${obs.lng}`,
          species: obs.commonName || obs.speciesName || obs.species || "Unknown",
          location: obs.placeName || "Unknown location",
          date: obs.observedAt?.split("T")[0] || "",
          photoUrl: obs.imageUrl,
          lat: obs.lat,
          lng: obs.lng,
          type: "observation",
          title: obs.commonName || obs.speciesName || obs.species || "Unknown",
          source: "iNaturalist",
        })
      }
    }

    // 2. Events (earthquakes, volcanoes, storms)
    if (events && len(events) > 0) {
      for (const ev of (events as unknown as Array<Record<string, unknown>>).slice(0, 5)) {
        allLiveItems.push({
          id: `event-${ev.id || Math.random().toString(36).slice(2)}`,
          species: (ev.title as string) || (ev.type as string) || "Event",
          location: (ev.location as string) || (ev.place as string) || "",
          date: (ev.timestamp as string) || (ev.date as string) || "",
          photoUrl: ev.imageUrl as string,
          lat: ev.lat as number,
          lng: ev.lng as number,
          type: "event",
          title: (ev.title as string) || (ev.type as string) || "Event",
          subtitle: ev.magnitude ? `Magnitude ${ev.magnitude}` : (ev.severity as string),
          source: (ev.source as string) || "EONET",
          url: ev.url as string,
        })
      }
    }

    // 3. Aircraft
    if (aircraft && len(aircraft) > 0) {
      for (const ac of (aircraft as unknown as Array<Record<string, unknown>>).slice(0, 5)) {
        allLiveItems.push({
          id: `aircraft-${ac.callsign || ac.id || Math.random().toString(36).slice(2)}`,
          species: (ac.callsign as string) || "Aircraft",
          location: "",
          date: (ac.timestamp as string) || "",
          lat: ac.lat as number,
          lng: ac.lng as number,
          type: "aircraft",
          title: (ac.callsign as string) || (ac.registration as string) || "Aircraft",
          subtitle: `Alt: ${ac.altitude}ft`,
          source: "OpenSky",
        })
      }
    }

    // 4. Vessels
    if (vessels && len(vessels) > 0) {
      for (const v of (vessels as unknown as Array<Record<string, unknown>>).slice(0, 5)) {
        allLiveItems.push({
          id: `vessel-${v.mmsi || v.id || Math.random().toString(36).slice(2)}`,
          species: (v.name as string) || "Vessel",
          location: "",
          date: (v.timestamp as string) || "",
          lat: v.lat as number,
          lng: v.lng as number,
          type: "vessel",
          title: (v.name as string) || (v.callsign as string) || "Vessel",
          subtitle: (v.type as string) || `MMSI: ${v.mmsi}`,
          source: "AIS",
        })
      }
    }

    // 5. News
    if (newsResults && len(newsResults) > 0) {
      for (const item of (newsResults as Array<Record<string, unknown>>).slice(0, 5)) {
        allLiveItems.push({
          id: `news-${item.id || Math.random().toString(36).slice(2)}`,
          species: (item.title as string) || "News",
          location: "",
          date: (item.publishedAt as string) || (item.published_at as string) || "",
          photoUrl: (item.urlToImage as string) || (item.imageUrl as string) || (item.image_url as string),
          type: "news",
          title: (item.title as string) || "News",
          subtitle: (item.source as Record<string, unknown>)?.name as string || (item.source as string),
          source: "News",
          url: item.url as string,
        })
      }
    }

    const totalCount = allLiveItems.length
    if (totalCount > 0 && prevLiveCountRef.current !== totalCount) {
      prevLiveCountRef.current = totalCount
      // Sort: photo-attached first, then newest
      allLiveItems.sort((a, b) => {
        const aPhoto = a.photoUrl ? 1 : 0
        const bPhoto = b.photoUrl ? 1 : 0
        if (aPhoto !== bPhoto) return bPhoto - aPhoto
        const aDate = new Date((a.date as string) || "1970").getTime()
        const bDate = new Date((b.date as string) || "1970").getTime()
        return bDate - aDate
      })
      setLiveObservationsRef.current(allLiveItems.slice(0, 30) as unknown as Array<{
        id: string; species: string; location: string; date: string;
        photoUrl?: string; lat?: number; lng?: number
      }>)
    } else if (totalCount === 0 && prevLiveCountRef.current !== 0) {
      prevLiveCountRef.current = 0
      setLiveObservationsRef.current([])
    }
  }, [liveResults, locationResults, events, aircraft, vessels, newsResults])
  
  // Track history
  useEffect(() => {
    if (localQuery && totalCount > 0 && !isLoading) {
      setRecentSearches((prev) => {
        const d = prev.filter((q) => q !== localQuery)
        return [localQuery, ...d].slice(0, 10)
      })
    }
  }, [localQuery, totalCount, isLoading])

  // Cross-widget focus from context (including notepad restore with id)
  useEffect(() => {
    if (ctx.widgetFocusTarget) {
      const t = ctx.widgetFocusTarget.type as WidgetType
      // Add widget to expanded set instead of replacing
      setExpandedWidgets((prev) => new Set(prev).add(t))
      setMinimizedTypes((prev) => { const n = new Set(prev); n.delete(t); return n })
      // If a specific item ID was passed, set it so the widget pre-selects it
      if ("id" in ctx.widgetFocusTarget && ctx.widgetFocusTarget.id) {
        setFocusedItemId(ctx.widgetFocusTarget.id)
      }
    }
  }, [ctx.widgetFocusTarget])

  // Clear focusedItemId after widget has had time to pick it up
  useEffect(() => {
    if (focusedItemId) {
      const timer = setTimeout(() => setFocusedItemId(null), 1000)
      return () => clearTimeout(timer)
    }
  }, [focusedItemId])

  // Track cursor for magnetic effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  // Track mouse for magnetic effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }, [mouseX, mouseY])

  // Defensive length helper — handles undefined/null arrays gracefully
  const len = (arr: unknown[] | undefined | null) => (Array.isArray(arr) ? arr.length : 0)

  // Widget configs with depth layers - ALL widget types enabled (including worldview: CREP, Earth2, map)
  const widgetConfigs: WidgetConfig[] = useMemo(() => {
    // Dynamic icon for species based on first result's kingdom
    const firstKingdom = (species[0]?.taxonomy?.kingdom || "").toLowerCase()
    const firstPhylum = (species[0]?.taxonomy?.phylum || "").toLowerCase()
    const speciesIcon = firstKingdom === "fungi" ? "🍄" :
                        firstKingdom === "plantae" ? "🌳" :
                        firstKingdom === "animalia" && firstPhylum === "chordata" ? "🦅" :
                        firstKingdom === "animalia" && firstPhylum === "arthropoda" ? "🦋" :
                        firstKingdom === "animalia" ? "🐠" : "🔬"

    return [
    { type: "answers", label: "Answers", icon: <MessageCircle className="h-4 w-4" />, gradient: "from-violet-500/30 to-fuchsia-500/20", hasData: len(mycaMessages?.filter((m) => m.role !== "system")) > 0 || len(suggestions?.widgets) > 0 || len(suggestions?.queries) > 0, depth: getParallaxDepth("answers") },
    { type: "species", label: "Species", icon: speciesIcon, gradient: "from-green-500/30 to-emerald-500/20", hasData: len(species) > 0, depth: getParallaxDepth("species") },
    { type: "chemistry", label: "Chemistry", icon: "⚗️", gradient: "from-purple-500/30 to-violet-500/20", hasData: len(compounds) > 0, depth: getParallaxDepth("chemistry") },
    { type: "genetics", label: "Genetics", icon: "🧬", gradient: "from-blue-500/30 to-cyan-500/20", hasData: len(genetics) > 0, depth: getParallaxDepth("genetics") },
    { type: "research", label: "Research", icon: "📄", gradient: "from-orange-500/30 to-amber-500/20", hasData: len(research) > 0, depth: getParallaxDepth("research") },
    { type: "media", label: "Media", icon: <Film className="h-4 w-4" />, gradient: "from-pink-500/30 to-rose-500/20", hasData: len(mediaResults) > 0, depth: getParallaxDepth("media") },
    { type: "location", label: "Location", icon: <MapPin className="h-4 w-4" />, gradient: "from-teal-500/30 to-cyan-500/20", hasData: len(locationResults) > 0, depth: getParallaxDepth("location") },
    { type: "news", label: "News", icon: <Newspaper className="h-4 w-4" />, gradient: "from-yellow-500/30 to-orange-500/20", hasData: len(newsResults) > 0, depth: getParallaxDepth("news") },
    { type: "crep", label: "CREP", icon: "✈️", gradient: "from-sky-500/30 to-blue-500/20", hasData: mergedCrepData.length > 0, depth: getParallaxDepth("crep") },
    { type: "earth", label: "Earth", icon: "🌍", gradient: "from-emerald-500/30 to-green-500/20", hasData: mapObservations.length > 0 || !!earth2Data, depth: getParallaxDepth("earth") },
    // Earth Intelligence widgets
    { type: "events", label: "Events", icon: "⚡", gradient: "from-red-500/30 to-orange-500/20", hasData: len(events) > 0, depth: getParallaxDepth("events") },
    { type: "aircraft", label: "Aircraft", icon: "✈️", gradient: "from-sky-500/30 to-indigo-500/20", hasData: len(aircraft) > 0, depth: getParallaxDepth("aircraft") },
    { type: "vessels", label: "Vessels", icon: "🚢", gradient: "from-blue-500/30 to-slate-500/20", hasData: len(vessels) > 0, depth: getParallaxDepth("vessels") },
    { type: "satellites", label: "Satellites", icon: "🛰️", gradient: "from-indigo-500/30 to-purple-500/20", hasData: len(satellites) > 0, depth: getParallaxDepth("satellites") },
    { type: "weather", label: "Weather", icon: "🌦️", gradient: "from-cyan-500/30 to-blue-500/20", hasData: len(weather) > 0, depth: getParallaxDepth("weather") },
    { type: "emissions", label: "Emissions", icon: "🏭", gradient: "from-gray-500/30 to-red-500/20", hasData: len(emissions) > 0, depth: getParallaxDepth("emissions") },
    { type: "infrastructure", label: "Infrastructure", icon: "🏗️", gradient: "from-amber-500/30 to-yellow-500/20", hasData: len(infrastructure) > 0, depth: getParallaxDepth("infrastructure") },
    { type: "devices", label: "Devices", icon: "📡", gradient: "from-green-500/30 to-lime-500/20", hasData: len(devices) > 0, depth: getParallaxDepth("devices") },
    { type: "space_weather", label: "Space Weather", icon: "☀️", gradient: "from-yellow-500/30 to-red-500/20", hasData: len(spaceWeather) > 0, depth: getParallaxDepth("space_weather") },
    { type: "embedding_atlas", label: "Atlas", icon: "🔮", gradient: "from-violet-500/30 to-purple-500/20", hasData: true, depth: getParallaxDepth("embedding_atlas") },
  ]}, [len(species), len(compounds), len(genetics), len(research), len(mediaResults), len(locationResults), len(newsResults), mergedCrepData.length, earth2Data, len(mapObservations), suggestions?.widgets, suggestions?.queries, mycaMessages, len(events), len(aircraft), len(vessels), len(satellites), len(weather), len(emissions), len(infrastructure), len(devices), len(spaceWeather), species])

  // Always show all widgets in the dock/pills so users can explore or open them before a data-driven search
  const activeWidgets = widgetConfigs
  
  // Get saved widget order from sessionStorage
  const savedWidgetOrder = useMemo(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = sessionStorage.getItem("search-widget-order")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }, [])
  
  // Expanded widgets shown in the grid, sorted by saved order
  const gridWidgets = useMemo(() => {
    const filtered = activeWidgets.filter((w) => expandedWidgets.has(w.type) && !minimizedTypes.has(w.type))
    if (savedWidgetOrder.length === 0) return filtered
    
    // Sort by saved order, putting unsaved widgets at the end
    return [...filtered].sort((a, b) => {
      const aIndex = savedWidgetOrder.indexOf(a.type)
      const bIndex = savedWidgetOrder.indexOf(b.type)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [activeWidgets, expandedWidgets, minimizedTypes, savedWidgetOrder])
  // Context widgets shown as clickable pills (not expanded and not minimized)
  const contextWidgets = activeWidgets.filter((w) => !expandedWidgets.has(w.type) && !minimizedTypes.has(w.type))
  // Minimized widgets shown as icon buttons
  const minimizedWidgetConfigs = activeWidgets.filter((w) => minimizedTypes.has(w.type))

  // Trigger Packery relayout when widgets change or new data arrives that might resize them
  useEffect(() => {
    if (packeryReady) {
      // Small delay to allow DOM to update
      const timeoutId = setTimeout(() => {
        reloadItems()
        packeryLayout()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [
    gridWidgets.length, expandedWidgets.size, packeryReady, reloadItems, packeryLayout,
    species.length, compounds.length, genetics.length, research.length,
    mediaResults.length, locationResults.length, newsResults.length,
    mergedCrepData.length, mapObservations.length,
    events.length, aircraft.length, vessels.length, satellites.length, weather.length,
    emissions.length, infrastructure.length, devices.length, spaceWeather.length,
    aiAnswer
  ])

  // Auto-expand Species and Answers on first load if nothing expanded (Answers is primary for conversational search)
  useEffect(() => {
    if (expandedWidgets.size === 0 && activeWidgets.length > 0) {
      setExpandedWidgets(new Set(["species", "answers"]))
    }
  }, [activeWidgets.length]) // eslint-disable-line

  // ── Intelligence Router: classify query and auto-expand/resize widgets ──
  // Routes through Myca's brain: conversational → Myca LLM + widgets,
  // data queries → auto-expand primary widget to fill viewport.
  const prevAutoExpandKeyRef = useRef("")
  const [searchRoute, setSearchRoute] = useState<SearchRoute | null>(null)

  // Classify query on change to show contextual suggestions, but DO NOT send to Myca yet
  useEffect(() => {
    if (!localQuery || localQuery.length < 2) {
      setSearchRoute(null)
      return
    }
    const route = classifyAndRoute(localQuery)
    setSearchRoute(route)
  }, [localQuery])

  // Handle explicit search submit (Enter key)
  const handleSubmitSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!localQuery || localQuery.length < 2) return

    setIsInputFocused(false)
    const route = classifyAndRoute(localQuery)
    setSearchRoute(route)
    
    // Instantly layout widgets based on the predicted route before data even arrives
    setExpandedWidgets((prev) => {
      const next = new Set<WidgetType>()
      if (route.primaryWidget) next.add(route.primaryWidget as WidgetType)
      for (const sw of route.secondaryWidgets) next.add(sw as WidgetType)
      if (route.worldview.crep) next.add("crep" as WidgetType)
      if (route.worldview.earth2 || route.worldview.map) next.add("earth" as WidgetType)
      if (route.useMycaLLM) next.add("answers" as WidgetType)
      if (next.size === 0) {
        next.add("species" as WidgetType)
        next.add("answers" as WidgetType)
      }
      return next
    })

    if (route.primaryWidget) {
      setWidgetSizes(prev => ({
        ...prev,
        [route.primaryWidget!]: route.primaryWidgetSize,
      }))
    }
    
    // Trigger packery layout adjustment instantly
    if (packeryReady) {
      setTimeout(() => { reloadItems(); packeryLayout() }, 10)
    }

    // Send to Myca LLM instantly
    if (route.useMycaLLM && route.classification !== "data_query") {
      const contextParts: string[] = []
      if (species.length) contextParts.push(`species: ${species.slice(0, 3).map(s => s.scientificName).join(", ")}`)
      if (compounds.length) contextParts.push(`compounds: ${compounds.slice(0, 3).map(c => c.name).join(", ")}`)
      sendMycaMessage(localQuery, {
        contextText: contextParts.length ? `Context: ${contextParts.join("; ")}` : undefined,
      })
    }

    ctx.emit("search:route", {
      query: localQuery,
      classification: route.classification,
      primaryWidget: route.primaryWidget,
      intent: route.intent.type,
      useMycaLLM: route.useMycaLLM,
      liveResultTypes: route.liveResultTypes,
    })
    
    ctx.setQuery(localQuery)
  }, [localQuery, species, compounds, sendMycaMessage, ctx, packeryReady, reloadItems, packeryLayout])

  // Smart auto-expand: uses intelligence router + data availability.
  // Primary widget gets resized to fill viewport; secondary widgets arranged around it.
  useEffect(() => {
    if (isLoading) return
    if (!localQuery || localQuery.length < 2) return

    const route = searchRoute || classifyAndRoute(localQuery)

    // Build data signature including all Earth Intelligence domains
    const dataMap: Record<string, number> = {
      species: species.length,
      chemistry: compounds.length,
      genetics: genetics.length,
      research: research.length,
      crep: mergedCrepData.length,
      earth: (mapObservations.length > 0 || !!earth2Data) ? 1 : 0,
      events: len(events),
      aircraft: len(aircraft),
      vessels: len(vessels),
      satellites: len(satellites),
      weather: len(weather),
      emissions: len(emissions),
      infrastructure: len(infrastructure),
      devices: len(devices),
      space_weather: len(spaceWeather),
    }
    const key = `${localQuery}|${Object.values(dataMap).join(",")}`
    if (key === prevAutoExpandKeyRef.current) return
    prevAutoExpandKeyRef.current = key

    const total = Object.values(dataMap).reduce((a, b) => a + b, 0)
    const hasIntentOrData = total > 0 || route.worldview.crep || route.worldview.earth2 || route.worldview.map
    if (!hasIntentOrData) return

    // ── Primary widget gets maximum viewport size ──
    if (route.primaryWidget) {
      setWidgetSizes(prev => ({
        ...prev,
        [route.primaryWidget!]: route.primaryWidgetSize,
      }))
    }

    setExpandedWidgets((prev) => {
      const next = new Set(prev)

      // Clear species-only default if something else is primary
      const hasNonSpeciesData = Object.entries(dataMap)
        .filter(([k]) => k !== "species")
        .some(([, v]) => v > 0)
      if (dataMap.species === 0 && hasNonSpeciesData && next.has("species" as WidgetType) && next.size === 1) {
        next.delete("species" as WidgetType)
      }

      // Expand primary widget from router
      if (route.primaryWidget) next.add(route.primaryWidget as WidgetType)

      // Expand secondary widgets from router
      for (const sw of route.secondaryWidgets) {
        next.add(sw as WidgetType)
      }

      // Expand every type that has data
      for (const [wType, count] of Object.entries(dataMap)) {
        if (count > 0) next.add(wType as WidgetType)
      }

      // Intent-based: expand worldview widgets even before data arrives
      if (route.worldview.crep) next.add("crep" as WidgetType)
      if (route.worldview.earth2 || route.worldview.map) next.add("earth" as WidgetType)

      // Always show Answers for conversational/hybrid queries
      if (route.useMycaLLM) next.add("answers" as WidgetType)

      // If still empty, default to species and answers
      if (next.size === 0) next.add("species" as WidgetType).add("answers" as WidgetType)

      return next
    })

    // Remove newly expanded types from minimized
    setMinimizedTypes((prev) => {
      const next = new Set(prev)
      if (route.primaryWidget) next.delete(route.primaryWidget as WidgetType)
      for (const sw of route.secondaryWidgets) next.delete(sw as WidgetType)
      for (const [wType, count] of Object.entries(dataMap)) {
        if (count > 0) next.delete(wType as WidgetType)
      }
      if (route.worldview.crep) next.delete("crep" as WidgetType)
      if (route.worldview.earth2 || route.worldview.map) next.delete("earth" as WidgetType)
      return next
    })
  }, [isLoading, localQuery, species.length, compounds.length, genetics.length, research.length, mergedCrepData.length, earth2Data, mapObservations.length, searchRoute, len(events), len(aircraft), len(vessels), len(satellites), len(weather), len(emissions), len(infrastructure), len(devices), len(spaceWeather)]) // eslint-disable-line

  // Map from widgetType → DOM element for auto-scroll-into-view
  const widgetElRefs = useRef<Partial<Record<WidgetType, HTMLDivElement | null>>>({})

  const handleFocusWidget = useCallback(
    (target: { type: string; id?: string }) => {
      const t = target.type as WidgetType
      setExpandedWidgets((prev) => new Set(prev).add(t))
      setMinimizedTypes((prev) => {
        const n = new Set(prev)
        n.delete(t)
        return n
      })
      if (target.id) setFocusedItemId(target.id)
      else setFocusedItemId(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SearchContext.focusWidget accepts a broader event payload
      ctx.focusWidget(target as any)
      trackWidgetFocus(t, target.id, {
        current_query: localQuery,
        focused_widget: t,
        recent_interactions: recentSearches.slice(0, 5),
      })
      // After Packery finishes laying out the new widget, scroll to it.
      // Packery positions items with transform: translate3d(x, y, 0).
      // Read the matrix to get the actual rendered Y position.
      const scrollToWidget = () => {
        const el = widgetElRefs.current[t]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom __scrollContainer property attached to ref map at runtime
        const container = (widgetElRefs.current as any).__scrollContainer as HTMLElement | null
        if (!el || !container) return

        // Extract Y from Packery's CSS transform: matrix(a,b,c,d,tx,ty)
        const transform = window.getComputedStyle(el).transform
        let packeryY = 0
        if (transform && transform !== "none") {
          const match = transform.match(/matrix.*\((.+)\)/)
          if (match) {
            const vals = match[1].split(", ")
            packeryY = parseFloat(vals[5] ?? "0") // ty in matrix(a,b,c,d,tx,ty)
          }
        }

        // Fallback: use offsetTop if transform gave 0
        const targetY = packeryY > 0 ? packeryY : el.offsetTop
        container.scrollTo({ top: targetY - 8, behavior: "smooth" })
      }
      // Two passes: Packery first layout ~200ms, then after framer-motion animate ~500ms
      setTimeout(scrollToWidget, 250)
      setTimeout(scrollToWidget, 600)
    },
    [ctx, localQuery, recentSearches, trackWidgetFocus]
  )

  const handleMinimize = useCallback((type: WidgetType) => {
    // Remove from expanded and add to minimized
    setExpandedWidgets((prev) => { const n = new Set(prev); n.delete(type); return n })
    setMinimizedTypes((prev) => new Set(prev).add(type))
  }, [])
  
  const handleCollapseWidget = useCallback((type: WidgetType) => {
    // Remove from expanded but don't minimize (goes back to context pills)
    setExpandedWidgets((prev) => { const n = new Set(prev); n.delete(type); return n })
  }, [])

  const handleAddToNotepad = useCallback(
    (item: { type: string; title: string; content: string; source?: string; meta?: Record<string, unknown> }) => {
      // meta carries the full article/paper data so notepad can re-open the reading modal
      ctx.addNotepadItem({ ...item, type: item.type as any, searchQuery: localQuery })
      trackNotepadAdd(item.type || "note", item.title || item.content?.slice(0, 50) || "Item")
    },
    [ctx, localQuery, trackNotepadAdd]
  )

  // State for re-opening news/research reading modals from the notepad
  const [notepadOpenArticle, setNotepadOpenArticle] = useState<Record<string, unknown> | null>(null)
  const [notepadOpenPaper, setNotepadOpenPaper] = useState<Record<string, unknown> | null>(null)

  // Pinned species: a specific species name to show in the Species widget
  // when a user clicks a species name in Chemistry or Genetics widget.
  const [pinnedSpeciesName, setPinnedSpeciesName] = useState<string | null>(null)

  // Bridge window custom event from Genetics modal (portal can't access ctx directly)
  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent).detail?.name
      if (name) ctx.emit("navigate-to-species", { name })
    }
    window.addEventListener("mycosoft:navigate-to-species", handler)
    return () => window.removeEventListener("mycosoft:navigate-to-species", handler)
  }, [ctx])

  // Listen for navigate-to-species events from Chemistry/Genetics widgets
  useEffect(() => {
    const unsub = ctx.on("navigate-to-species", ({ name }: { name: string }) => {
      setPinnedSpeciesName(name)
      // Auto-expand species widget and scroll to it
      setExpandedWidgets((prev) => new Set(prev).add("species" as WidgetType))
      setMinimizedTypes((prev) => { const n = new Set(prev); n.delete("species" as WidgetType); return n })
      // Small delay to let Packery place the widget before scrolling
      setTimeout(() => {
        const el = widgetElRefs.current["species"]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom __scrollContainer property attached to ref map at runtime
        const container = (widgetElRefs.current as any).__scrollContainer as HTMLElement | null
        if (el && container) container.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" })
      }, 400)
    })
    return unsub
  }, [ctx])

  // Listen for read-item events emitted by NotepadWidget
  useEffect(() => {
    const unsub = ctx.on("read-item", ({ type, item }: { type: string; item: Record<string, unknown> }) => {
      if (type === "news") {
        setNotepadOpenArticle(item)
        setExpandedWidgets((prev) => new Set(prev).add("news" as WidgetType))
      } else if (type === "research") {
        setNotepadOpenPaper(item)
        setExpandedWidgets((prev) => new Set(prev).add("research" as WidgetType))
      }
    })
    return unsub
  }, [ctx])

  // Drag start -- include searchQuery for notepad restore
  // Note: Framer Motion's onDragStart doesn't provide dataTransfer, only native HTML5 drag does
  // So we check if dataTransfer exists before using it
  const handleWidgetDragStart = useCallback((e: DragEvent | { dataTransfer?: DataTransfer | null }, config: WidgetConfig) => {
    // Framer Motion drag events don't have dataTransfer - only native HTML5 drag does
    if (!e?.dataTransfer) return
    
    const labels: Record<string, string> = {
      species: species[0]?.commonName || species[0]?.scientificName || "Species",
      chemistry: compounds[0]?.name || "Compounds",
      genetics: "Genetics Data",
      research: research[0]?.title || "Research",
      answers: "Answers",
      media: "Media",
      location: "Location",
      news: "News",
      crep: "CREP Observations",
      earth: "Earth Simulator",
    }
    try {
      e.dataTransfer.setData("application/search-widget", JSON.stringify({
        type: config.type === "chemistry" ? "compound" : config.type,
        title: labels[config.type] || config.label,
        content: `${config.label} results from search "${localQuery}"`,
        source: "Search",
        searchQuery: localQuery,
      }))
      e.dataTransfer.effectAllowed = "copy"
    } catch {
      // Ignore errors if dataTransfer methods fail
    }
  }, [species, compounds, research, localQuery])

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      className={cn("h-full overflow-hidden flex flex-col relative", className)}
    >
      {/* Mycelium particle background */}
      <MyceliumBackground width={canvasSize.width} height={canvasSize.height} />
      {/* Compact Search Bar */}
      <div className="relative z-20 px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 shrink-0">
        <form onSubmit={handleSubmitSearch} className="flex-1 relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => { setIsInputFocused(true); pause() }}
            onBlur={() => { setIsInputFocused(false); if (!localQuery) resume() }}
            placeholder={animatedPlaceholder || "Search species, weather, flights..."}
            className="pl-8 sm:pl-9 pr-16 sm:pr-20 h-10 sm:h-9 text-base sm:text-sm rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm focus:shadow-md transition-shadow"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-7 sm:w-7 rounded-full"
              onClick={() => setShowHistory(!showHistory)}
              title="Recent searches"
            >
              <History className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Button>
            {/* Single mic — drives UnifiedVoice + PersonaPlex search commands */}
            <Button
              type="button"
              size="icon"
              className={cn(
                "h-8 w-8 sm:h-7 sm:w-7 rounded-full transition-all duration-200",
                isMicActive
                  ? "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/40"
                  : "bg-violet-600/80 text-white hover:bg-violet-600 shadow-sm"
              )}
              onClick={handleMicClick}
              title={isMicActive ? "Stop listening" : "Voice search (speak to search)"}
              aria-label={isMicActive ? "Stop voice search" : "Start voice search"}
            >
              {isMicActive
                ? <Mic className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-pulse" />
                : <Mic className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              }
            </Button>
          </div>
        </form>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          {(isLoading || isValidating) && <Loader2 className="h-3 w-3 animate-spin" />}
          {!isLoading && totalCount > 0 && <span>{totalCount} results</span>}
          {!!aiAnswer && <Sparkles className="h-3 w-3 text-violet-500" />}
        </div>
        <AnimatePresence>
          {showHistory && recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-2 right-2 sm:left-4 sm:right-auto sm:max-w-xl sm:w-full mt-1 bg-card/95 backdrop-blur-md border rounded-xl shadow-2xl z-50 p-1.5 sm:p-2"
            >
              {recentSearches.map((q, i) => (
                <button key={i} onClick={() => { setLocalQuery(q); setShowHistory(false) }}
                  className="w-full text-left px-2.5 sm:px-3 py-2 sm:py-1.5 text-sm sm:text-xs rounded-lg hover:bg-muted active:bg-muted/80 transition-colors">{q}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Voice mic is in the search bar above — no second floating button needed */}

      {/* === MULTI-WIDGET GRID LAYOUT: grid -> context pills -> minimized bar === */}
      <div className="flex-1 flex flex-col overflow-hidden px-2 sm:px-4 pb-2 gap-2 sm:gap-3">

        {/* Grid scrolls inside viewport so widgets never sit below the fold */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom __scrollContainer property attached to ref map at runtime */}
        <div className="flex-1 min-h-0 overflow-auto" ref={(el) => { (widgetElRefs.current as any).__scrollContainer = el }}>
          <div 
            ref={packeryContainerRef}
            className="packery-container relative w-full"
            style={{ minHeight: 200 }}
          >
            {/* Grid sizer — width drives Packery's column unit, updates on resize */}
            <div className="grid-sizer" style={{ width: gridSizerWidth }} />
            
            <AnimatePresence mode="popLayout" onExitComplete={() => packeryLayout()}>
              {gridWidgets.map((config) => {
                const sizeClasses = getWidgetSizeClasses(config.type)
                const currentSize = widgetSizes[config.type] || DEFAULT_WIDGET_SIZES[config.type as WidgetType] || { width: 1, height: 1 }
                
                return (
                <div
                  key={`expanded-${config.type}`}
                  data-widget-id={config.type}
                  ref={(el) => { widgetElRefs.current[config.type] = el }}
                  className={cn(
                    "packery-widget z-20 mb-3",
                    sizeClasses,
                  )}
                  style={{ 
                    width: getWidgetWidth(currentSize.width),
                    order: config.hasData || expandedWidgets.has(config.type) ? -1 : 0
                  }}
                  draggable
                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    const labels: Record<string, string> = {
                      species: species[0]?.commonName || species[0]?.scientificName || "Species",
                      chemistry: compounds[0]?.name || "Compounds",
                      genetics: "Genetics Data",
                      research: research[0]?.title || "Research",
                      answers: "Answers",
                      media: "Media",
                      location: "Location",
                      news: "News",
                      crep: "CREP Observations",
                      earth2: "Earth2 Weather",
                      map: "Map",
                    }
                    e.dataTransfer.setData("application/search-widget", JSON.stringify({
                      type: (config.type === "chemistry" ? "compound" : config.type) as any,
                      title: labels[config.type] || config.label,
                      content: `${config.label} results from search "${localQuery}"`,
                      source: "Search",
                      searchQuery: localQuery,
                    }))
                    e.dataTransfer.effectAllowed = "copy"
                    // Visual feedback
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = "0.5"
                    }
                  }}
                  onDragEnd={(e: React.DragEvent<HTMLDivElement>) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = "1"
                    }
                  }}
                >
                  <motion.div
                    /* layout prop removed - Packery manages positioning */
                    initial={widgetEnterAnimation.initial}
                    animate={widgetEnterAnimation.animate}
                    exit={widgetEnterAnimation.exit}
                    whileHover={{ 
                      boxShadow: "0 20px 50px rgba(34, 197, 94, 0.3)",
                    }}
                    transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.9 }}
                    className={cn(
                      "bg-card/90 backdrop-blur-md border border-border rounded-xl sm:rounded-2xl overflow-hidden shadow-xl h-full flex flex-col",
                      // Height classes based on widget size
                      currentSize.height === 1 && "min-h-[200px]",
                      currentSize.height === 2 && "min-h-[350px]",
                      currentSize.height === 3 && "min-h-[500px]",
                    )}
                  >
                    <div className={cn("flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border shrink-0", `bg-gradient-to-r ${config.gradient}`)}>
                      {/* Drag handle - users can drag by this */}
                      <div className="flex items-center gap-1.5 sm:gap-2 widget-drag-handle cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                        <span className="text-sm sm:text-base">{typeof config.icon === 'string' ? config.icon : config.icon}</span>
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{config.label}</span>
                        {/* Size indicator */}
                        <span className="text-[9px] text-muted-foreground/60 hidden sm:inline">
                          {currentSize.width}x{currentSize.height}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {/* Resize button - cycles through sizes */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 sm:h-6 sm:w-6 rounded-full" 
                          onClick={() => cycleWidgetSize(config.type)} 
                          title={`Resize (current: ${currentSize.width}x${currentSize.height})`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-3 sm:w-3">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                          </svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-6 sm:w-6 rounded-full" onClick={() => handleCollapseWidget(config.type)} title="Collapse">
                          <Minimize2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-6 sm:w-6 rounded-full" onClick={() => handleMinimize(config.type)} title="Minimize">
                          <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3 overflow-auto flex-1 flex flex-col min-h-0">
                      <WidgetContent
                        type={config.type}
                        species={species} compounds={compounds} genetics={genetics}
                        research={research} aiAnswer={aiAnswer as any}
                        searchContext={{
                          species: species.slice(0, 5).map((s) => s.scientificName || s.commonName).filter(Boolean),
                          compounds: compounds.slice(0, 5).map((c) => c.name).filter(Boolean),
                          genetics: genetics.slice(0, 5).map((g) => g.speciesName || g.geneRegion).filter(Boolean),
                          research: research.slice(0, 5).map((r) => r.title).filter(Boolean),
                        }}
                        media={mediaResults} mediaError={mediaError} location={locationResults} news={newsResults} newsError={newsError} newsQueryUsed={newsQueryUsed}
                        crep={mergedCrepData} earth2={earth2Data} mapObservations={mapObservations} eventObservations={eventObservations}
                        mycaSuggestions={suggestions}
                        onSelectSuggestionWidget={(w) => handleFocusWidget({ type: w })}
                        onSelectSuggestionQuery={(q) => {
                          setLocalQuery(q)
                          ctx.setQuery(q)
                        }}
                        isLoading={isLoading}
                        isFocused={true}
                        focusedItemId={focusedItemId}
                        onFocusWidget={handleFocusWidget}
                        onAddToNotepad={handleAddToNotepad}
                        onViewOnMap={handleViewOnMap}
                        onExplore={(widgetType, itemId) => handleFocusWidget({ type: widgetType, id: itemId })}
                        onOpenDashboard={() => setShowCrepDashboard(true)}
                        openArticle={config.type === "news" ? notepadOpenArticle : undefined}
                        openPaper={config.type === "research" ? notepadOpenPaper : undefined}
                        pinnedSpeciesName={config.type === "species" ? pinnedSpeciesName : undefined}
                        query={debouncedQuery}
                      />
                    </div>
                  </motion.div>
                </div>
              )})}
            </AnimatePresence>
          </div>
        </div>

        {/* Context widget pills with floating animations */}
        {contextWidgets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 shrink-0 py-1.5 sm:py-2">
            {contextWidgets.map((config, i) => {
              const floatVariants = getWidgetFloatVariants(config.type)
              return (
                <div
                  key={config.type}
                  draggable
                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    const labels: Record<string, string> = {
                      species: species[0]?.commonName || species[0]?.scientificName || "Species",
                      chemistry: compounds[0]?.name || "Compounds",
                      genetics: "Genetics Data",
                      research: research[0]?.title || "Research",
                      answers: "Answers",
                      media: "Media",
                      location: "Location",
                      news: "News",
                      crep: "CREP Observations",
                      earth2: "Earth2 Weather",
                      map: "Map",
                    }
                    e.dataTransfer.setData("application/search-widget", JSON.stringify({
                      type: (config.type === "chemistry" ? "compound" : config.type) as any,
                      title: labels[config.type] || config.label,
                      content: `${config.label} results from search "${localQuery}"`,
                      source: "Search",
                      searchQuery: localQuery,
                    }))
                    e.dataTransfer.effectAllowed = "copy"
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = "0.5"
                    }
                  }}
                  onDragEnd={(e: React.DragEvent<HTMLDivElement>) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = "1"
                    }
                  }}
                  style={{ zIndex: 10 - i }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      ...floatVariants,
                    }}
                    whileHover={{ 
                      boxShadow: "0 15px 35px rgba(34, 197, 94, 0.35)",
                    }}
                    onClick={() => handleFocusWidget({ type: config.type })}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl cursor-pointer",
                      "bg-card/80 backdrop-blur-md border border-white/10 dark:border-white/5",
                      "shadow-lg hover:shadow-xl active:shadow-md transition-all duration-300",
                      `bg-gradient-to-br ${config.gradient}`
                    )}
                  >
                    <span className="text-sm sm:text-base">{typeof config.icon === 'string' ? config.icon : config.icon}</span>
                    <span className="text-[10px] sm:text-xs font-medium text-foreground/80">{config.label}</span>
                  </motion.button>
                </div>
              )
            })}
          </div>
        )}

        {/* Minimized widget icon bar */}
        {minimizedWidgetConfigs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-1.5 sm:gap-2 py-1 shrink-0"
          >
            <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">Minimized:</span>
            {minimizedWidgetConfigs.map((w) => (
              <motion.button
                key={w.type}
                whileHover={{ boxShadow: "0 8px 20px rgba(34, 197, 94, 0.3)" }}
                onClick={() => handleFocusWidget({ type: w.type })}
                className={cn(
                  "w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br shadow-md hover:shadow-lg active:shadow-sm transition-shadow border border-white/10",
                  w.gradient
                )}
                title={`Restore ${w.label}`}
              >
                <span className="text-base sm:text-sm">{typeof w.icon === 'string' ? w.icon : w.icon}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {activeWidgets.length === 0 && !isLoading && localQuery.length >= 2 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs sm:text-sm px-4 text-center">
            {message || error || "No results found."}
          </div>
        )}
      </div>

      {/* CREP Widescreen Overlay */}
      <AnimatePresence>
        {showCrepDashboard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[100] bg-background flex flex-col"
          >
            <div className="flex items-center justify-between p-2 sm:p-4 border-b shrink-0 bg-card/90 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-cyan-400" />
                <h2 className="text-sm font-bold tracking-wider uppercase">CREP Operational Dashboard</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCrepDashboard(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 relative">
              <CREPDashboardClient />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Empty state component for widgets without data
function EmptyWidgetState({ type, label }: { type: string; label: string }) {
  const icons: Record<string, string> = {
    species: "🍄", chemistry: "⚗️", genetics: "🧬", research: "📄",
    answers: "💬", media: "🎬", location: "📍", news: "📰",
    crep: "✈️", earth: "🌍",
    events: "⚡", aircraft: "✈️", vessels: "🚢", satellites: "🛰️",
    weather: "🌦️", emissions: "🏭", infrastructure: "🏗️",
    devices: "📡", space_weather: "☀️",
    embedding_atlas: "🔮",
  }
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-muted-foreground text-center p-4">
      <span className="text-3xl mb-2">{icons[type] || "📦"}</span>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs opacity-70">No data available yet</p>
    </div>
  )
}

// Widget content renderer -- now accepts focusedItemId and all data types
function ComponentWrapper(props: any) {
  const { Element, ...rest } = props
  return <Element {...rest} />
}

function WidgetContent({
  type, species, compounds, genetics, research, aiAnswer,
  searchContext,
  media, mediaError, location, news, newsError, newsQueryUsed,
  crep, earth2, mapObservations, eventObservations,
  events, aircraft, vessels, satellites, weather, emissions, infrastructure, devices, spaceWeather,
  mycaSuggestions,
  onSelectSuggestionWidget,
  onSelectSuggestionQuery,
  isLoading, isFocused, focusedItemId, onFocusWidget, onAddToNotepad, onViewOnMap, onExplore, onOpenDashboard,
  openArticle, openPaper, pinnedSpeciesName, query: searchQuery,
}: {
  type: WidgetType
  species: SpeciesResult[]; compounds: CompoundResult[]; genetics: GeneticsResult[]; research: ResearchResult[]; aiAnswer: string | undefined
  searchContext?: { species?: string[]; compounds?: string[]; genetics?: string[]; research?: string[] }
  media: Record<string, unknown>[]; mediaError?: string; location: Record<string, unknown>[]; news: Record<string, unknown>[]; newsError?: string; newsQueryUsed?: string
  crep: Record<string, unknown>[]; earth2: Record<string, unknown> | null; mapObservations: MapObservation[]; eventObservations: any[]
  events?: Record<string, unknown>[]; aircraft?: Record<string, unknown>[]; vessels?: Record<string, unknown>[]; satellites?: Record<string, unknown>[]; weather?: Record<string, unknown>[]; emissions?: Record<string, unknown>[]; infrastructure?: Record<string, unknown>[]; devices?: Record<string, unknown>[]; spaceWeather?: Record<string, unknown>[]; cameras?: Record<string, unknown>[];
  mycaSuggestions: { widgets: string[]; queries: string[] }
  onSelectSuggestionWidget: (widgetType: string) => void
  onSelectSuggestionQuery: (query: string) => void
  isLoading?: boolean
  isFocused: boolean
  query?: string
  focusedItemId?: string | null
  onFocusWidget: (target: { type: string; id?: string }) => void
  onAddToNotepad: (item: { type: string; title: string; content: string; source?: string; meta?: Record<string, unknown> }) => void
  onViewOnMap?: (observation: MapObservation) => void
  onExplore?: (type: string, id: string) => void
  onOpenDashboard?: () => void
  /** Article/paper to immediately open in the reading modal (from notepad restore) */
  openArticle?: Record<string, unknown> | null
  openPaper?: Record<string, unknown> | null
  /** Species name from Chemistry/Genetics widget click — show it in Species widget */
  pinnedSpeciesName?: string | null
}) {
  switch (type) {
    case "answers":
      return (
        <AnswersWidget
          isFocused={isFocused}
          getContextText={() => {
            const parts: string[] = []
            if (species.length) parts.push(`species: ${species.slice(0, 3).map((s) => s.scientificName || s.commonName).join(", ")}`)
            if (compounds.length) parts.push(`compounds: ${compounds.slice(0, 3).map((c) => c.name).join(", ")}`)
            if (genetics.length) parts.push(`genetics: ${genetics.slice(0, 3).map((g) => g.speciesName || g.geneRegion).join(", ")}`)
            if (research.length) parts.push(`research: ${research.slice(0, 3).map((r) => r.title).join(", ")}`)
            return parts.length ? `Search context: ${parts.join("; ")}` : ""
          }}
          searchContext={searchContext}
          suggestions={mycaSuggestions}
          onSelectWidget={onSelectSuggestionWidget}
          onSelectQuery={onSelectSuggestionQuery}
          onAddToNotepad={onAddToNotepad}
          onFocusWidget={onFocusWidget}
        />
      )
    case "species":
      if (isLoading && species.length === 0 && !pinnedSpeciesName) return <SpeciesWidget data={[]} isLoading isFocused={isFocused} />
      if (species.length === 0 && !pinnedSpeciesName) return <EmptyWidgetState type="species" label="Species" />
      return <SpeciesWidget data={species} isFocused={isFocused} focusedId={focusedItemId || undefined} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} pinnedSpeciesName={pinnedSpeciesName} />
    case "chemistry":
      if (isLoading && compounds.length === 0) return <ChemistryWidget data={[]} isLoading isFocused={isFocused} />
      if (compounds.length === 0) return <EmptyWidgetState type="chemistry" label="Compounds" />
      return <ChemistryWidget data={compounds} isFocused={isFocused} focusedId={focusedItemId || undefined} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "genetics":
      if (isLoading && genetics.length === 0) return <GeneticsWidget data={[]} isLoading isFocused={isFocused} />
      if (genetics.length === 0) return <EmptyWidgetState type="genetics" label="Genetics" />
      return <GeneticsWidget data={genetics} isFocused={isFocused} focusedId={focusedItemId ?? undefined} onExplore={onExplore} />
    case "research":
      if (isLoading && research.length === 0) return <ResearchWidget data={[]} isLoading isFocused={isFocused} />
      if (research.length === 0) return <EmptyWidgetState type="research" label="Research Papers" />
      return <ComponentWrapper Element={ResearchWidget} data={research} isFocused={isFocused} onAddToNotepad={onAddToNotepad} onExplore={onExplore} openPaper={openPaper} />
    case "media":
      return <ComponentWrapper Element={MediaWidget} data={media as any} isFocused={isFocused} onAddToNotepad={onAddToNotepad} error={mediaError} />
    case "location":
      return <ComponentWrapper Element={LocationWidget} data={location as any} isFocused={isFocused} onAddToNotepad={onAddToNotepad} />
    case "news":
      return <ComponentWrapper Element={NewsWidget} data={news as any} query={searchQuery} contextQuery={newsQueryUsed} isLoading={isLoading} isFocused={isFocused} onAddToNotepad={onAddToNotepad} openArticle={openArticle} error={newsError} />
    case "crep":
      if (isLoading && crep.length === 0) return <CrepWidget data={[]} isLoading isFocused={isFocused} onAddToNotepad={onAddToNotepad} onOpenDashboard={onOpenDashboard} />
      return <CrepWidget data={crep as any} isLoading={isLoading} isFocused={isFocused} query={searchQuery} onAddToNotepad={onAddToNotepad} onViewOnMap={onViewOnMap as any} onOpenDashboard={onOpenDashboard} />
    case "earth":
      if (mapObservations.length === 0 && eventObservations.length === 0 && !earth2) return <EmptyWidgetState type="earth" label="Earth Simulator" />
      return <EarthWidget data={mapObservations} earth2Data={earth2} eventsData={eventObservations} isFocused={isFocused} onAddToNotepad={onAddToNotepad} />
    case "embedding_atlas":
      return <EmbeddingAtlasWidget query={searchQuery} isFocused={isFocused} onAddToNotepad={onAddToNotepad} onViewOnMap={onViewOnMap as any} />
    case "events":
      if (!events?.length) return <EmptyWidgetState type="events" label="Global Events" />
      return <FallbackWidget bucketKey="events" title="Global Events" items={events} />
    case "aircraft":
      if (!aircraft?.length) return <EmptyWidgetState type="aircraft" label="Aircraft Tracker" />
      return <FallbackWidget bucketKey="aircraft" title="Aircraft Tracker" items={aircraft} />
    case "vessels":
      if (!vessels?.length) return <EmptyWidgetState type="vessels" label="Vessel Tracker" />
      return <FallbackWidget bucketKey="vessels" title="Vessel Tracker" items={vessels} />
    case "satellites":
      if (!satellites?.length) return <EmptyWidgetState type="satellites" label="Satellites" />
      return <FallbackWidget bucketKey="satellites" title="Satellites" items={satellites} />
    case "weather":
      if (!weather?.length) return <EmptyWidgetState type="weather" label="Weather" />
      return <FallbackWidget bucketKey="weather" title="Weather" items={weather} />
    case "emissions":
      if (!emissions?.length) return <EmptyWidgetState type="emissions" label="Emissions" />
      return <FallbackWidget bucketKey="emissions" title="Emissions" items={emissions} />
    case "infrastructure":
      if (!infrastructure?.length) return <EmptyWidgetState type="infrastructure" label="Infrastructure" />
      return <FallbackWidget bucketKey="infrastructure" title="Infrastructure" items={infrastructure} />
    case "devices":
      if (!devices?.length) return <EmptyWidgetState type="devices" label="MycoBrain Devices" />
      return <FallbackWidget bucketKey="devices" title="MycoBrain Devices" items={devices} />
    case "space_weather":
      if (!spaceWeather?.length) return <EmptyWidgetState type="space_weather" label="Space Weather" />
      return <FallbackWidget bucketKey="space_weather" title="Space Weather" items={spaceWeather} />
    case "cameras":
      if (!cameras?.length) return <EmptyWidgetState type="cameras" label="Live Cameras" />
      return <CameraWidget data={cameras as any} />
    case "fallback":
      return (
        <FallbackWidget
          bucketKey={"unknown"}
          items={[]}
          title={"Fallback"}
          widgetType="fallback"
        />
      )
    default:
      return <EmptyWidgetState type={type} label={type} />
  }
}

export default FluidSearchCanvas
