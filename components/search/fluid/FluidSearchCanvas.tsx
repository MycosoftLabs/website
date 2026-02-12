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
import { useUnifiedSearch } from "@/hooks/use-unified-search"
import { useSearchContext } from "@/components/search/SearchContextProvider"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Mic,
  Loader2,
  Sparkles,
  History,
  Minimize2,
  X,
  MapPin,
  Film,
  Newspaper,
} from "lucide-react"
import {
  SpeciesWidget,
  ChemistryWidget,
  GeneticsWidget,
  ResearchWidget,
  AIWidget,
  MediaWidget,
  LocationWidget,
  NewsWidget,
} from "./widgets"
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
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder"
import { useVoiceSearch } from "@/hooks/use-voice-search"

export type WidgetType = "species" | "chemistry" | "genetics" | "research" | "ai" | "media" | "location" | "news"

interface WidgetConfig {
  type: WidgetType
  label: string
  icon: React.ReactNode
  gradient: string
  hasData: boolean
  depth: number
}

// Mycelium particle background component
function MyceliumBackground({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

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

interface FluidSearchCanvasProps {
  initialQuery?: string
  onNavigate?: (url: string) => void
  voiceEnabled?: boolean
  className?: string
}

export function FluidSearchCanvas({
  initialQuery = "",
  onNavigate,
  voiceEnabled = true,
  className,
}: FluidSearchCanvasProps) {
  const ctx = useSearchContext()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [localQuery, setLocalQuery] = useState(initialQuery || "")
  // Multi-widget grid: track multiple expanded widgets instead of single focused
  const [expandedWidgets, setExpandedWidgets] = useState<Set<WidgetType>>(new Set(["species"]))
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [minimizedTypes, setMinimizedTypes] = useState<Set<WidgetType>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isInputFocused, setIsInputFocused] = useState(false)
  
  // Animated typing placeholder
  const { placeholder: animatedPlaceholder, pause, resume } = useTypingPlaceholder({
    enabled: !localQuery && !isInputFocused,
  })

  // Voice search integration
  const voiceSearch = useVoiceSearch({
    onSearch: (query) => {
      setLocalQuery(query)
      ctx.setQuery(query)
    },
    onFocusWidget: (widgetId) => {
      const widgetType = widgetId as WidgetType
      setExpandedWidgets((prev) => new Set(prev).add(widgetType))
      setMinimizedTypes((prev) => { const n = new Set(prev); n.delete(widgetType); return n })
    },
    onAIQuestion: (question) => {
      // Focus AI widget and send question
      setExpandedWidgets((prev) => new Set(prev).add("ai"))
      ctx.addChatMessage("user", question)
    },
    enabled: voiceEnabled,
  })

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

  // Search hook - fetch ALL data types
  const {
    species, compounds, genetics, research, aiAnswer,
    liveResults,
    isLoading, isValidating, totalCount, error, message,
  } = useUnifiedSearch(localQuery, {
    types: ["species", "compounds", "genetics", "research"],
    includeAI: true,
    limit: 20,
  })
  
  // Debounced query for additional endpoints
  const debouncedQuery = useDebounce(localQuery, 300)
  
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
  
  // News widget data fetcher
  const { data: newsData } = useSWR(
    debouncedQuery && debouncedQuery.length >= 2 ? `/api/search/news?q=${encodeURIComponent(debouncedQuery)}&limit=10` : null,
    async (url) => { const res = await fetch(url); return res.json() },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )
  
  // Extract results from new endpoints
  const mediaResults = mediaData?.results || []
  const locationResults = locationData?.results || []
  const newsResults = newsData?.results || []

  // Push results to context
  useEffect(() => {
    if (!isLoading && (species.length > 0 || compounds.length > 0 || research.length > 0)) {
      ctx.setResults({
        query: localQuery,
        results: { species, compounds, genetics, research },
        totalCount,
        timing: { total: 0, mindex: 0 },
        source: "live",
        aiAnswer,
      })
    }
  }, [species, compounds, genetics, research, aiAnswer, isLoading]) // eslint-disable-line

  // Push live observations to context for LiveResultsWidget
  useEffect(() => {
    if (liveResults.length > 0) {
      ctx.setLiveObservations(liveResults.map((obs: any) => ({
        id: obs.id,
        species: obs.species,
        location: obs.location || "Unknown location",
        date: obs.date || "",
        photoUrl: obs.imageUrl,
        lat: obs.lat,
        lng: obs.lng,
      })))
      return
    }
    // Keep compatibility fallback while live_results propagates through all environments
    if (locationResults.length > 0) {
      ctx.setLiveObservations(locationResults.map((obs: any) => ({
        id: obs.id,
        species: obs.commonName || obs.speciesName,
        location: obs.placeName || "Unknown location",
        date: obs.observedAt?.split("T")[0] || "",
        photoUrl: obs.imageUrl,
        lat: obs.lat,
        lng: obs.lng,
      })))
      return
    }
    ctx.setLiveObservations([])
  }, [liveResults, locationResults]) // eslint-disable-line
  
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

  // Widget configs with depth layers - ALL widget types enabled
  const widgetConfigs: WidgetConfig[] = useMemo(() => [
    { type: "species", label: "Species", icon: "🍄", gradient: "from-green-500/30 to-emerald-500/20", hasData: species.length > 0, depth: getParallaxDepth("species") },
    { type: "chemistry", label: "Chemistry", icon: "⚗️", gradient: "from-purple-500/30 to-violet-500/20", hasData: compounds.length > 0, depth: getParallaxDepth("chemistry") },
    { type: "genetics", label: "Genetics", icon: "🧬", gradient: "from-blue-500/30 to-cyan-500/20", hasData: genetics.length > 0, depth: getParallaxDepth("genetics") },
    { type: "research", label: "Research", icon: "📄", gradient: "from-orange-500/30 to-amber-500/20", hasData: research.length > 0, depth: getParallaxDepth("research") },
    { type: "ai", label: "AI", icon: <Sparkles className="h-4 w-4" />, gradient: "from-violet-500/30 to-fuchsia-500/20", hasData: !!aiAnswer, depth: getParallaxDepth("ai") },
    { type: "media", label: "Media", icon: <Film className="h-4 w-4" />, gradient: "from-pink-500/30 to-rose-500/20", hasData: mediaResults.length > 0, depth: getParallaxDepth("media") },
    { type: "location", label: "Location", icon: <MapPin className="h-4 w-4" />, gradient: "from-teal-500/30 to-cyan-500/20", hasData: locationResults.length > 0, depth: getParallaxDepth("location") },
    { type: "news", label: "News", icon: <Newspaper className="h-4 w-4" />, gradient: "from-yellow-500/30 to-orange-500/20", hasData: newsResults.length > 0, depth: getParallaxDepth("news") },
  ], [species.length, compounds.length, genetics.length, research.length, aiAnswer, mediaResults.length, locationResults.length, newsResults.length])

  // Show ALL widgets regardless of whether they have data - users should see the full widget grid
  // Widgets without data will show an appropriate empty/loading state
  const activeWidgets = widgetConfigs  // No filter - show all widgets
  // Expanded widgets shown in the grid
  const gridWidgets = activeWidgets.filter((w) => expandedWidgets.has(w.type) && !minimizedTypes.has(w.type))
  // Context widgets shown as clickable pills (not expanded and not minimized)
  const contextWidgets = activeWidgets.filter((w) => !expandedWidgets.has(w.type) && !minimizedTypes.has(w.type))
  // Minimized widgets shown as icon buttons
  const minimizedWidgetConfigs = activeWidgets.filter((w) => minimizedTypes.has(w.type))

  // Auto-expand Species on first load if nothing expanded
  useEffect(() => {
    if (expandedWidgets.size === 0 && activeWidgets.length > 0) {
      setExpandedWidgets(new Set(["species"]))
    }
  }, [activeWidgets.length]) // eslint-disable-line

  const handleFocusWidget = useCallback((target: { type: string; id?: string }) => {
    const t = target.type as WidgetType
    // ADD widget to expanded set (multi-widget grid), not replace
    setExpandedWidgets((prev) => new Set(prev).add(t))
    setMinimizedTypes((prev) => { const n = new Set(prev); n.delete(t); return n })
    if (target.id) setFocusedItemId(target.id)
    ctx.focusWidget(target as any)
  }, [ctx])

  const handleMinimize = useCallback((type: WidgetType) => {
    // Remove from expanded and add to minimized
    setExpandedWidgets((prev) => { const n = new Set(prev); n.delete(type); return n })
    setMinimizedTypes((prev) => new Set(prev).add(type))
  }, [])
  
  const handleCollapseWidget = useCallback((type: WidgetType) => {
    // Remove from expanded but don't minimize (goes back to context pills)
    setExpandedWidgets((prev) => { const n = new Set(prev); n.delete(type); return n })
  }, [])

  const handleAddToNotepad = useCallback((item: any) => {
    // Include the current search query so notepad restore can re-search
    ctx.addNotepadItem({ ...item, searchQuery: localQuery })
  }, [ctx, localQuery])

  // Drag start -- include searchQuery for notepad restore
  // Note: Framer Motion's onDragStart doesn't provide dataTransfer, only native HTML5 drag does
  // So we check if dataTransfer exists before using it
  const handleWidgetDragStart = useCallback((e: any, config: WidgetConfig) => {
    // Framer Motion drag events don't have dataTransfer - only native HTML5 drag does
    if (!e?.dataTransfer) return
    
    const labels: Record<string, string> = {
      species: species[0]?.commonName || species[0]?.scientificName || "Species",
      chemistry: compounds[0]?.name || "Compounds",
      genetics: "Genetics Data",
      research: research[0]?.title || "Research",
      ai: "MYCA AI Answer",
      media: "Media",
      location: "Location",
      news: "News",
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
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => { setIsInputFocused(true); pause() }}
            onBlur={() => { setIsInputFocused(false); if (!localQuery) resume() }}
            placeholder={animatedPlaceholder || "Search fungi, compounds..."}
            className="pl-8 sm:pl-9 pr-16 sm:pr-20 h-10 sm:h-9 text-base sm:text-sm rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm focus:shadow-md transition-shadow"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 rounded-full" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button
              type="button"
              variant={voiceSearch.isListening ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8 sm:h-7 sm:w-7 rounded-full transition-colors",
                voiceSearch.isListening && "bg-green-600 text-white hover:bg-green-500"
              )}
              onClick={() => voiceSearch.isListening ? voiceSearch.stopListening() : voiceSearch.startListening()}
              title={voiceSearch.isListening ? "Stop listening" : "Start voice search"}
            >
              <Mic className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", voiceSearch.isListening && "animate-pulse")} />
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
      {voiceEnabled && (
        <Button
          type="button"
          size="icon"
          className={cn(
            "absolute bottom-4 right-4 z-30 h-12 w-12 rounded-full shadow-xl",
            voiceSearch.isListening
              ? "bg-green-600 text-white hover:bg-green-500"
              : "bg-violet-600 text-white hover:bg-violet-500"
          )}
          onClick={() => voiceSearch.isListening ? voiceSearch.stopListening() : voiceSearch.startListening()}
          title={voiceSearch.isListening ? "Stop listening" : "Start voice search"}
        >
          <Mic className={cn("h-5 w-5", voiceSearch.isListening && "animate-pulse")} />
        </Button>
      )}

      {/* === MULTI-WIDGET GRID LAYOUT: grid -> context pills -> minimized bar === */}
      <div className="flex-1 flex flex-col overflow-hidden px-2 sm:px-4 pb-2 gap-2 sm:gap-3">

        {/* Multi-widget grid with enhanced physics animations */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {gridWidgets.map((config) => (
                <motion.div
                  key={`expanded-${config.type}`}
                  layout
                  initial={widgetEnterAnimation.initial}
                  animate={{
                    ...widgetEnterAnimation.animate,
                    ...getWidgetFloatVariants(config.type),
                  }}
                  exit={widgetEnterAnimation.exit}
                  whileHover={{ 
                    boxShadow: "0 20px 50px rgba(34, 197, 94, 0.3)",
                  }}
                  transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
                  className="w-full z-20"
                  drag
                  dragConstraints={canvasRef}
                  dragElastic={0.1}
                  dragMomentum={true}
                  whileDrag={{ 
                    scale: 1.02, 
                    boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
                    zIndex: 100,
                  }}
                  onDragStart={(e: any) => handleWidgetDragStart(e, config)}
                >
                  <motion.div 
                    className="bg-card/90 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl h-full"
                    animate={glowPulseAnimation.animate}
                  >
                    <div className={cn("flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10", `bg-gradient-to-r ${config.gradient}`)}>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-sm sm:text-base">{typeof config.icon === 'string' ? config.icon : config.icon}</span>
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-6 sm:w-6 rounded-full" onClick={() => handleCollapseWidget(config.type)} title="Collapse">
                          <Minimize2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-6 sm:w-6 rounded-full" onClick={() => handleMinimize(config.type)} title="Minimize">
                          <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <WidgetContent
                        type={config.type}
                        species={species} compounds={compounds} genetics={genetics}
                        research={research} aiAnswer={aiAnswer}
                        media={mediaResults} location={locationResults} news={newsResults}
                        isFocused={gridWidgets.length === 1}
                        focusedItemId={focusedItemId}
                        onFocusWidget={handleFocusWidget}
                        onAddToNotepad={handleAddToNotepad}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Context widget pills with floating animations */}
        {contextWidgets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 shrink-0 py-1.5 sm:py-2">
            {contextWidgets.map((config, i) => {
              const floatVariants = getWidgetFloatVariants(config.type)
              return (
                <motion.button
                  key={config.type}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    ...floatVariants,
                  }}
                  whileHover={{ 
                    boxShadow: "0 15px 35px rgba(34, 197, 94, 0.35)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleFocusWidget({ type: config.type })}
                  drag
                  dragConstraints={canvasRef}
                  dragElastic={0.2}
                  whileDrag={{ 
                    scale: 1.1, 
                    zIndex: 50,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                  }}
                  onDragStart={(e: any) => handleWidgetDragStart(e, config)}
                  style={{ zIndex: 10 - i }}
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
                whileTap={{ scale: 0.95 }}
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
    </div>
  )
}

// Empty state component for widgets without data
function EmptyWidgetState({ type, label }: { type: string; label: string }) {
  const icons: Record<string, string> = {
    species: "🍄", chemistry: "⚗️", genetics: "🧬", research: "📄",
    ai: "✨", media: "🎬", location: "📍", news: "📰",
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
function WidgetContent({
  type, species, compounds, genetics, research, aiAnswer,
  media, location, news,
  isFocused, focusedItemId, onFocusWidget, onAddToNotepad,
}: {
  type: WidgetType
  species: any[]; compounds: any[]; genetics: any[]; research: any[]; aiAnswer: any
  media: any[]; location: any[]; news: any[]
  isFocused: boolean
  focusedItemId?: string | null
  onFocusWidget: (target: { type: string; id?: string }) => void
  onAddToNotepad: (item: { type: string; title: string; content: string; source?: string }) => void
}) {
  switch (type) {
    case "species":
      if (species.length === 0) return <EmptyWidgetState type="species" label="Species" />
      return <SpeciesWidget data={species} isFocused={isFocused} focusedId={focusedItemId || undefined} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "chemistry":
      if (compounds.length === 0) return <EmptyWidgetState type="chemistry" label="Compounds" />
      return <ChemistryWidget data={compounds} isFocused={isFocused} focusedId={focusedItemId || undefined} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "genetics":
      if (genetics.length === 0) return <EmptyWidgetState type="genetics" label="Genetics" />
      return <GeneticsWidget data={genetics[0] || { id: "", accession: "", speciesName: "", geneRegion: "", sequenceLength: 0, source: "" }} isFocused={isFocused} />
    case "research":
      if (research.length === 0) return <EmptyWidgetState type="research" label="Research Papers" />
      return <ResearchWidget data={research} isFocused={isFocused} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "ai":
      if (!aiAnswer) return <EmptyWidgetState type="ai" label="AI Insights" />
      return <AIWidget answer={aiAnswer} isFocused={isFocused} onAddToNotepad={onAddToNotepad} />
    case "media":
      if (media.length === 0) return <EmptyWidgetState type="media" label="Media" />
      return <MediaWidget data={media} isFocused={isFocused} onAddToNotepad={onAddToNotepad} />
    case "location":
      if (location.length === 0) return <EmptyWidgetState type="location" label="Location" />
      return <LocationWidget data={location} isFocused={isFocused} onAddToNotepad={onAddToNotepad} />
    case "news":
      if (news.length === 0) return <EmptyWidgetState type="news" label="News" />
      return <NewsWidget data={news} isFocused={isFocused} onAddToNotepad={onAddToNotepad} />
    default:
      return <EmptyWidgetState type={type} label={type} />
  }
}

export default FluidSearchCanvas
