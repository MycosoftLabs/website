/**
 * FluidSearchCanvas - Feb 2026
 *
 * Flex-column layout (NO absolute overlap):
 * - Compact search bar (top)
 * - Focused widget (center, constrained height)
 * - Context widget pills row (always visible below)
 * - Minimized icon bar (bottom)
 * - Draggable, animated, glassmorphism
 * - Passes focusedId to widgets for correct item selection
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useUnifiedSearch } from "@/hooks/use-unified-search"
import { useSearchContext } from "@/components/search/SearchContextProvider"
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
} from "lucide-react"
import {
  SpeciesWidget,
  ChemistryWidget,
  GeneticsWidget,
  ResearchWidget,
  AIWidget,
} from "./widgets"

export type WidgetType = "species" | "chemistry" | "genetics" | "research" | "ai"

interface WidgetConfig {
  type: WidgetType
  label: string
  icon: string
  gradient: string
  hasData: boolean
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
  className,
}: FluidSearchCanvasProps) {
  const ctx = useSearchContext()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [localQuery, setLocalQuery] = useState(initialQuery || "")
  const [focusedType, setFocusedType] = useState<WidgetType | null>(null)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [minimizedTypes, setMinimizedTypes] = useState<Set<WidgetType>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

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

  // Search hook
  const {
    species, compounds, genetics, research, aiAnswer,
    isLoading, isValidating, totalCount, error, message,
  } = useUnifiedSearch(localQuery, {
    types: ["species", "compounds", "genetics", "research"],
    includeAI: true,
    limit: 20,
  })

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
      setFocusedType(t)
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

  // Widget configs
  const widgetConfigs: WidgetConfig[] = [
    { type: "species", label: "Species", icon: "🍄", gradient: "from-green-500/30 to-emerald-500/20", hasData: species.length > 0 },
    { type: "chemistry", label: "Chemistry", icon: "⚗️", gradient: "from-purple-500/30 to-violet-500/20", hasData: compounds.length > 0 },
    { type: "genetics", label: "Genetics", icon: "🧬", gradient: "from-blue-500/30 to-cyan-500/20", hasData: genetics.length > 0 },
    { type: "research", label: "Research", icon: "📄", gradient: "from-orange-500/30 to-amber-500/20", hasData: research.length > 0 },
    { type: "ai", label: "AI", icon: "✨", gradient: "from-violet-500/30 to-fuchsia-500/20", hasData: !!aiAnswer },
  ]

  const activeWidgets = widgetConfigs.filter((w) => w.hasData)
  const contextWidgets = activeWidgets.filter((w) => w.type !== focusedType && !minimizedTypes.has(w.type))
  const minimizedWidgets = activeWidgets.filter((w) => minimizedTypes.has(w.type) && w.type !== focusedType)

  // Auto-focus first
  useEffect(() => {
    if (!focusedType && activeWidgets.length > 0) {
      setFocusedType(activeWidgets[0].type)
    }
  }, [activeWidgets.length]) // eslint-disable-line

  const handleFocusWidget = useCallback((target: { type: string; id?: string }) => {
    const t = target.type as WidgetType
    setFocusedType(t)
    setMinimizedTypes((prev) => { const n = new Set(prev); n.delete(t); return n })
    if (target.id) setFocusedItemId(target.id)
    ctx.focusWidget(target as any)
  }, [ctx])

  const handleMinimize = useCallback((type: WidgetType) => {
    setMinimizedTypes((prev) => new Set(prev).add(type))
    if (focusedType === type) {
      const next = activeWidgets.find((w) => w.type !== type && !minimizedTypes.has(w.type))
      setFocusedType(next?.type || null)
    }
  }, [focusedType, activeWidgets, minimizedTypes])

  const handleAddToNotepad = useCallback((item: any) => {
    // Include the current search query so notepad restore can re-search
    ctx.addNotepadItem({ ...item, searchQuery: localQuery })
  }, [ctx, localQuery])

  // Drag start -- include searchQuery for notepad restore
  const handleWidgetDragStart = useCallback((e: React.DragEvent, config: WidgetConfig) => {
    const labels: Record<WidgetType, string> = {
      species: species[0]?.commonName || species[0]?.scientificName || "Species",
      chemistry: compounds[0]?.name || "Compounds",
      genetics: "Genetics Data",
      research: research[0]?.title || "Research",
      ai: "MYCA AI Answer",
    }
    e.dataTransfer.setData("application/search-widget", JSON.stringify({
      type: config.type === "chemistry" ? "compound" : config.type,
      title: labels[config.type],
      content: `${config.label} results from search "${localQuery}"`,
      source: "Search",
      searchQuery: localQuery,
    }))
    e.dataTransfer.effectAllowed = "copy"
  }, [species, compounds, research, localQuery])

  const focusedConfig = focusedType ? activeWidgets.find((w) => w.type === focusedType) : null

  return (
    <div
      ref={canvasRef}
      className={cn("h-full overflow-hidden flex flex-col", className)}
    >
      {/* Compact Search Bar */}
      <div className="relative z-20 px-4 py-2 flex items-center gap-3 shrink-0">
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search fungi, compounds, genetics..."
            className="pl-9 pr-20 h-9 text-sm rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm focus:shadow-md transition-shadow"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-40">
              <Mic className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
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
              className="absolute top-full left-4 mt-1 max-w-xl w-full bg-card/95 backdrop-blur-md border rounded-xl shadow-2xl z-50 p-2"
            >
              {recentSearches.map((q, i) => (
                <button key={i} onClick={() => { setLocalQuery(q); setShowHistory(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors">{q}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* === FLEX COLUMN LAYOUT: focused -> context pills -> minimized bar === */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 pb-2 gap-3">

        {/* Focused widget -- normal flow, NOT absolute */}
        <AnimatePresence mode="popLayout">
          {focusedConfig && (
            <motion.div
              key={`focused-${focusedConfig.type}`}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
              className="w-full shrink-0"
              draggable
              onDragStart={(e) => handleWidgetDragStart(e, focusedConfig)}
            >
              <div className="bg-card/90 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl ring-1 ring-primary/20">
                <div className={cn("flex items-center justify-between px-4 py-2 border-b border-white/10", `bg-gradient-to-r ${focusedConfig.gradient}`)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{focusedConfig.icon}</span>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{focusedConfig.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleMinimize(focusedConfig.type)} title="Minimize">
                      <Minimize2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleMinimize(focusedConfig.type)} title="Close">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <WidgetContent
                    type={focusedConfig.type}
                    species={species} compounds={compounds} genetics={genetics}
                    research={research} aiAnswer={aiAnswer}
                    isFocused
                    focusedItemId={focusedItemId}
                    onFocusWidget={handleFocusWidget}
                    onAddToNotepad={handleAddToNotepad}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context widget pills -- always visible row below focused */}
        {contextWidgets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 shrink-0">
            {contextWidgets.map((config, i) => (
              <motion.button
                key={config.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -3, 0],
                  transition: {
                    opacity: { duration: 0.2, delay: i * 0.05 },
                    scale: { duration: 0.2, delay: i * 0.05 },
                    y: { duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" },
                  },
                }}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFocusWidget({ type: config.type })}
                draggable
                onDragStart={(e: any) => handleWidgetDragStart(e, config)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer",
                  "bg-card/80 backdrop-blur-md border border-white/10 dark:border-white/5",
                  "shadow-md hover:shadow-lg transition-shadow"
                )}
              >
                <span className="text-base">{config.icon}</span>
                <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Minimized widget icon bar */}
        {minimizedWidgets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 py-1 shrink-0"
          >
            <span className="text-[10px] text-muted-foreground">Minimized:</span>
            {minimizedWidgets.map((w) => (
              <motion.button
                key={w.type}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleFocusWidget({ type: w.type })}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br shadow-md hover:shadow-lg transition-shadow border border-white/10",
                  w.gradient
                )}
                title={`Restore ${w.label}`}
              >
                <span className="text-sm">{w.icon}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {activeWidgets.length === 0 && !isLoading && localQuery.length >= 2 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {message || error || "No results found."}
          </div>
        )}
      </div>
    </div>
  )
}

// Widget content renderer -- now accepts focusedItemId
function WidgetContent({
  type, species, compounds, genetics, research, aiAnswer,
  isFocused, focusedItemId, onFocusWidget, onAddToNotepad,
}: {
  type: WidgetType
  species: any[]; compounds: any[]; genetics: any[]; research: any[]; aiAnswer: any
  isFocused: boolean
  focusedItemId?: string | null
  onFocusWidget: (target: { type: string; id?: string }) => void
  onAddToNotepad: (item: { type: string; title: string; content: string; source?: string }) => void
}) {
  switch (type) {
    case "species":
      return <SpeciesWidget data={species} isFocused={isFocused} focusedId={focusedItemId || undefined} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "chemistry":
      return <ChemistryWidget data={compounds} isFocused={isFocused} focusedId={focusedItemId || undefined} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "genetics":
      return <GeneticsWidget data={genetics[0] || { id: "", accession: "", speciesName: "", geneRegion: "", sequenceLength: 0, source: "" }} isFocused={isFocused} />
    case "research":
      return <ResearchWidget data={research} isFocused={isFocused} onFocusWidget={onFocusWidget} onAddToNotepad={onAddToNotepad} />
    case "ai":
      return aiAnswer ? <AIWidget answer={aiAnswer} isFocused={isFocused} onAddToNotepad={onAddToNotepad} /> : null
    default:
      return null
  }
}

export default FluidSearchCanvas
