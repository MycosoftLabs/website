/**
 * FluidSearchCanvas - Feb 2026
 * 
 * Revolutionary search interface with:
 * - Parallax mycelium network background
 * - Fluid widget transitions with 60fps animations
 * - Contextual exploration (rabbit hole navigation)
 * - Voice integration ready
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence, useScroll, useTransform, LayoutGroup } from "framer-motion"
import { cn } from "@/lib/utils"
import { useUnifiedSearch } from "@/hooks/use-unified-search"
import { useSessionMemory, useEntityTracking } from "@/hooks/use-session-memory"
import { useVoiceSearch } from "@/hooks/use-voice-search"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Mic, 
  MicOff, 
  X, 
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
  History,
  MessageSquare,
} from "lucide-react"

// Import widget components
import { 
  SpeciesWidget, 
  ChemistryWidget, 
  GeneticsWidget, 
  ResearchWidget, 
  TaxonomyWidget, 
  GalleryWidget, 
  AIWidget,
} from "./widgets"

// Widget types for the fluid interface
export type WidgetType = 
  | "species" 
  | "chemistry" 
  | "genetics" 
  | "research" 
  | "taxonomy" 
  | "gallery" 
  | "ai"

export interface WidgetState {
  type: WidgetType
  id: string
  data: any
  position: "focused" | "context" | "minimized"
  order: number
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [activeWidgets, setActiveWidgets] = useState<WidgetState[]>([])
  const [focusedWidget, setFocusedWidget] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Session memory for conversational context
  const {
    recentSearches,
    addSearch,
    trackSelection,
    getSearchSuggestions,
    contextSummary,
    sessionInfo,
  } = useSessionMemory()

  // Entity tracking for exploration context
  const { trackSpecies, trackCompound, trackResearch } = useEntityTracking()

  // Search hook with AI integration
  const {
    species,
    compounds,
    genetics,
    research,
    aiAnswer,
    isLoading,
    isValidating,
    totalCount,
  } = useUnifiedSearch(query, {
    types: ["species", "compounds", "genetics", "research"],
    includeAI: true,
    limit: 20,
  })

  // Voice search integration
  const {
    isListening: isVoiceActive,
    isConnected: isVoiceConnected,
    lastTranscript,
    startListening,
    stopListening,
    availableCommands,
  } = useVoiceSearch({
    enabled: voiceEnabled,
    onSearch: (searchQuery) => setQuery(searchQuery),
    onFocusWidget: (widgetId) => handleFocusWidget(widgetId),
    onNavigate,
    onAIQuestion: (question) => {
      // Focus AI widget and ask question
      const aiWidget = activeWidgets.find((w) => w.type === "ai")
      if (aiWidget) {
        handleFocusWidget(aiWidget.id)
      }
    },
  })

  // Track search in session memory when results change
  useEffect(() => {
    if (query && totalCount > 0 && !isLoading) {
      addSearch(query, {
        speciesCount: species.length,
        compoundCount: compounds.length,
        researchCount: research.length,
      })
    }
  }, [query, totalCount, isLoading, species.length, compounds.length, research.length, addSearch])

  // Parallax effect based on scroll
  const { scrollY } = useScroll({ container: containerRef })
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150])
  const backgroundScale = useTransform(scrollY, [0, 500], [1, 1.1])

  // Create initial widgets from search results
  useEffect(() => {
    if (species.length === 0 && compounds.length === 0 && research.length === 0) {
      setActiveWidgets([])
      setFocusedWidget(null)
      return
    }

    const widgets: WidgetState[] = []
    let order = 0

    // Add species widgets
    species.slice(0, 5).forEach((s) => {
      widgets.push({
        type: "species",
        id: `species-${s.id}`,
        data: s,
        position: order === 0 ? "focused" : "context",
        order: order++,
      })
    })

    // Add compound widgets
    compounds.slice(0, 3).forEach((c) => {
      widgets.push({
        type: "chemistry",
        id: `compound-${c.id}`,
        data: c,
        position: "context",
        order: order++,
      })
    })

    // Add research widgets
    research.slice(0, 3).forEach((r) => {
      widgets.push({
        type: "research",
        id: `research-${r.id}`,
        data: r,
        position: "context",
        order: order++,
      })
    })

    // Add AI widget if we have an answer
    if (aiAnswer) {
      widgets.push({
        type: "ai",
        id: "ai-answer",
        data: aiAnswer,
        position: "context",
        order: order++,
      })
    }

    setActiveWidgets(widgets)
    setFocusedWidget(widgets[0]?.id || null)
  }, [species, compounds, research, aiAnswer])

  // Focus a widget (brings it to center)
  const handleFocusWidget = useCallback((widgetId: string) => {
    setFocusedWidget(widgetId)
    setActiveWidgets((prev) =>
      prev.map((w) => ({
        ...w,
        position: w.id === widgetId ? "focused" : "context",
      }))
    )
  }, [])

  // Minimize a widget
  const handleMinimizeWidget = useCallback((widgetId: string) => {
    setActiveWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId ? { ...w, position: "minimized" } : w
      )
    )
    // Focus next available widget
    setFocusedWidget((current) => {
      if (current === widgetId) {
        const next = activeWidgets.find(
          (w) => w.id !== widgetId && w.position !== "minimized"
        )
        return next?.id || null
      }
      return current
    })
  }, [activeWidgets])

  // Close a widget
  const handleCloseWidget = useCallback((widgetId: string) => {
    setActiveWidgets((prev) => prev.filter((w) => w.id !== widgetId))
  }, [])

  // Handle search submit
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    // Query is already being searched via the hook
  }, [])

  // Voice toggle
  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      stopListening()
    } else {
      startListening()
    }
  }, [isVoiceActive, startListening, stopListening])

  // Handle entity exploration with tracking
  const handleExplore = useCallback((type: string, id: string) => {
    // Track the exploration in session memory
    if (type === "species") {
      trackSpecies(id, id)
    } else if (type === "compound" || type === "chemistry") {
      trackCompound(id, id)
    } else if (type === "research") {
      trackResearch(id, id)
    }
    // Update search query to explore
    setQuery(`${type}:${id}`)
  }, [trackSpecies, trackCompound, trackResearch])

  // Get search suggestions from history
  const suggestions = getSearchSuggestions(query)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-screen overflow-hidden bg-background",
        className
      )}
    >
      {/* Parallax Background - Mycelium Network */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          y: backgroundY,
          scale: backgroundScale,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div 
          className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Animated connection lines (simulated mycelium) */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.5" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 10,20 Q 30,40 50,30 T 90,50"
            stroke="url(#lineGrad)"
            strokeWidth="0.2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 20,80 Q 40,60 60,70 T 100,40"
            stroke="url(#lineGrad)"
            strokeWidth="0.15"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, delay: 1, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </motion.div>

      {/* Search Header */}
      <div className="relative z-10 pt-8 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fungi, compounds, genetics, research..."
                className="pl-12 pr-32 h-14 text-lg rounded-2xl border-2 focus:border-primary shadow-lg"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Search history button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setShowHistory(!showHistory)}
                  title={`${recentSearches.length} recent searches`}
                >
                  <History className="h-5 w-5" />
                </Button>
                {/* Voice button */}
                {voiceEnabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-full",
                      isVoiceActive && "bg-red-500/10 text-red-500",
                      !isVoiceConnected && "opacity-50"
                    )}
                    onClick={toggleVoice}
                    disabled={!isVoiceConnected}
                    title={isVoiceConnected ? (isVoiceActive ? "Stop listening" : "Start voice search") : "Voice not available"}
                  >
                    {isVoiceActive ? (
                      <MicOff className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                )}
                {/* AI indicator */}
                {aiAnswer && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">AI</span>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Voice transcript feedback */}
          <AnimatePresence>
            {isVoiceActive && lastTranscript && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
              >
                <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  "{lastTranscript}"
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search suggestions from history */}
          <AnimatePresence>
            {query && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute mt-2 w-full max-w-3xl bg-card border rounded-xl shadow-xl z-50 p-2"
              >
                <p className="text-xs text-muted-foreground px-2 mb-1">Recent:</p>
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search history panel */}
          <AnimatePresence>
            {showHistory && recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mt-4 p-4 bg-card border rounded-xl shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Search History</h4>
                  <Badge variant="secondary" className="text-xs">
                    {sessionInfo.searchCount} this session
                  </Badge>
                </div>
                <div className="space-y-2">
                  {recentSearches.slice(0, 5).map((search) => (
                    <button
                      key={search.id}
                      onClick={() => {
                        setQuery(search.query)
                        setShowHistory(false)
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <span className="text-sm">{search.query}</span>
                      <span className="text-xs text-muted-foreground">
                        {search.results.speciesCount + search.results.compoundCount + search.results.researchCount} results
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading indicator */}
          {(isLoading || isValidating) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-4 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isLoading ? "Searching..." : "Refreshing..."}</span>
            </motion.div>
          )}

          {/* Results count with session context */}
          {!isLoading && totalCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 mt-4 text-sm text-muted-foreground"
            >
              <span>Found {totalCount} results</span>
              {contextSummary && (
                <Badge variant="outline" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Context active
                </Badge>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Widget Canvas - Fluid Layout with coordinated animations */}
      <div className="relative z-10 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {/* Focused Widget - Large Center */}
              {focusedWidget && (
                <motion.div
                  key={`focused-${focusedWidget}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    type: "spring", 
                    damping: 30, 
                    stiffness: 400,
                    mass: 0.8,
                  }}
                  className="mb-8"
                >
                  {activeWidgets
                    .filter((w) => w.id === focusedWidget)
                    .map((widget) => (
                      <WidgetRenderer
                        key={widget.id}
                        widget={widget}
                        isFocused
                        onFocus={() => {}}
                        onMinimize={() => handleMinimizeWidget(widget.id)}
                        onClose={() => handleCloseWidget(widget.id)}
                        onExplore={handleExplore}
                        onNavigate={onNavigate}
                        onSelect={(itemId) => {
                          // Track selection for session memory
                          const searchEntry = recentSearches[0]
                          if (searchEntry) {
                            trackSelection(searchEntry.id, itemId)
                          }
                        }}
                      />
                    ))}
                </motion.div>
              )}

              {/* Context Widgets - Responsive Grid with staggered entry */}
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {activeWidgets
                  .filter((w) => w.position === "context" && w.id !== focusedWidget)
                  .map((widget, index) => (
                    <motion.div
                      key={widget.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: {
                          type: "spring",
                          damping: 25,
                          stiffness: 300,
                          delay: index * 0.05, // Staggered entry
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: -20,
                        transition: { duration: 0.15 }
                      }}
                    >
                      <WidgetRenderer
                        widget={widget}
                        isFocused={false}
                        onFocus={() => handleFocusWidget(widget.id)}
                        onMinimize={() => handleMinimizeWidget(widget.id)}
                        onClose={() => handleCloseWidget(widget.id)}
                        onExplore={handleExplore}
                        onNavigate={onNavigate}
                        onSelect={(itemId) => {
                          const searchEntry = recentSearches[0]
                          if (searchEntry) {
                            trackSelection(searchEntry.id, itemId)
                          }
                        }}
                      />
                    </motion.div>
                  ))}
              </motion.div>

              {/* Minimized Widgets - Floating Bottom Bar */}
              {activeWidgets.filter((w) => w.position === "minimized").length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-card/95 backdrop-blur-sm border rounded-full shadow-xl z-50"
                >
                  <span className="text-xs text-muted-foreground px-2">
                    Minimized:
                  </span>
                  {activeWidgets
                    .filter((w) => w.position === "minimized")
                    .map((widget) => {
                      const typeConfig: Record<WidgetType, string> = {
                        species: "🍄",
                        chemistry: "⚗️",
                        genetics: "🧬",
                        research: "📄",
                        taxonomy: "🌳",
                        gallery: "🖼️",
                        ai: "✨",
                      }
                      return (
                        <Button
                          key={widget.id}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-full hover:bg-primary/10"
                          onClick={() => handleFocusWidget(widget.id)}
                        >
                          <span className="mr-1">{typeConfig[widget.type]}</span>
                          {widget.type}
                        </Button>
                      )
                    })}
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>
    </div>
  )
}

// Animation variants for 60fps smooth transitions
const widgetVariants = {
  focused: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 400,
      mass: 0.8,
    },
  },
  context: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
  minimized: {
    scale: 0.95,
    opacity: 0.8,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 250,
    },
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

// Widget renderer with actual components
interface WidgetRendererProps {
  widget: WidgetState
  isFocused: boolean
  onFocus: () => void
  onMinimize: () => void
  onClose: () => void
  onExplore?: (type: string, id: string) => void
  onNavigate?: (url: string) => void
  onSelect?: (itemId: string) => void
}

function WidgetRenderer({
  widget,
  isFocused,
  onFocus,
  onMinimize,
  onClose,
  onExplore,
  onSelect,
}: WidgetRendererProps) {
  // Widget type icons and colors
  const typeConfig: Record<WidgetType, { icon: string; color: string }> = {
    species: { icon: "🍄", color: "from-green-500/20 to-emerald-500/20" },
    chemistry: { icon: "⚗️", color: "from-purple-500/20 to-violet-500/20" },
    genetics: { icon: "🧬", color: "from-blue-500/20 to-cyan-500/20" },
    research: { icon: "📄", color: "from-orange-500/20 to-amber-500/20" },
    taxonomy: { icon: "🌳", color: "from-emerald-500/20 to-teal-500/20" },
    gallery: { icon: "🖼️", color: "from-pink-500/20 to-rose-500/20" },
    ai: { icon: "✨", color: "from-violet-500/20 to-fuchsia-500/20" },
  }

  const config = typeConfig[widget.type]

  return (
    <motion.div
      layout
      layoutId={widget.id}
      variants={widgetVariants}
      initial="context"
      animate={isFocused ? "focused" : "context"}
      exit="exit"
      className={cn(
        "relative bg-card border rounded-xl overflow-hidden",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        isFocused && "ring-2 ring-primary shadow-lg"
      )}
      onClick={!isFocused ? onFocus : undefined}
      style={{
        cursor: !isFocused ? "pointer" : "default",
        willChange: "transform, opacity", // Hint for GPU acceleration
      }}
      whileHover={!isFocused ? { 
        scale: 1.02,
        transition: { type: "spring", damping: 30, stiffness: 500 }
      } : undefined}
      whileTap={!isFocused ? { scale: 0.98 } : undefined}
    >
      {/* Widget Header with gradient */}
      <div className={cn(
        "flex items-center justify-between p-3 border-b",
        `bg-gradient-to-r ${config.color}`
      )}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {widget.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
            title="Minimize"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          {isFocused && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                // Toggle focus could restore to context
              }}
              title="Restore"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Widget Content - Using actual widget components */}
      <motion.div 
        className="p-4"
        layout
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
      >
        {widget.type === "species" && (
          <SpeciesWidget
            data={widget.data}
            isFocused={isFocused}
            onExplore={onExplore}
          />
        )}

        {widget.type === "chemistry" && (
          <ChemistryWidget
            data={widget.data}
            isFocused={isFocused}
            onExplore={onExplore}
          />
        )}

        {widget.type === "genetics" && (
          <GeneticsWidget
            data={widget.data}
            isFocused={isFocused}
            onExplore={onExplore}
          />
        )}

        {widget.type === "research" && (
          <ResearchWidget
            data={widget.data}
            isFocused={isFocused}
            onExplore={onExplore}
          />
        )}

        {widget.type === "taxonomy" && (
          <TaxonomyWidget
            data={widget.data}
            isFocused={isFocused}
            onExplore={onExplore}
          />
        )}

        {widget.type === "gallery" && (
          <GalleryWidget
            photos={widget.data.photos || []}
            title={widget.data.title}
            isFocused={isFocused}
          />
        )}

        {widget.type === "ai" && (
          <AIWidget
            answer={widget.data}
            isFocused={isFocused}
            onFollowUp={(question) => {
              // Handle AI follow-up questions
              console.log("Follow-up:", question)
            }}
          />
        )}
      </motion.div>
    </motion.div>
  )
}

export default FluidSearchCanvas
