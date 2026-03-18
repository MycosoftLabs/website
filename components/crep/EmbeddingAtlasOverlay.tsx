/**
 * CREP Embedding Atlas Overlay - Mar 2026
 *
 * Overlay panel for the CREP dashboard that renders large datasets
 * as an interactive embedding visualization alongside the map.
 *
 * Features:
 * - Real-time CREP entity data rendered as embedding point cloud
 * - Density contours showing entity clustering patterns
 * - Cross-filter: click point → fly to location on CREP map
 * - Category toggle: show/hide entity types
 * - Search within CREP data via embedding similarity
 * - Progressive loading with streaming data updates
 * - Integrated with MYCA for natural language queries
 */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Layers,
  Search,
  X,
  Maximize2,
  Minimize2,
  Filter,
  BarChart3,
  Radar,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CREPAtlasManager,
  unifiedEntityToEmbedding,
} from "@/lib/crep/embedding-atlas-integration"
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_MAP,
  type EmbeddingPoint,
} from "@/lib/search/embedding-engine"
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmbeddingAtlasOverlayProps {
  /** CREP entities to visualize */
  entities: UnifiedEntity[]
  /** Whether the overlay is visible */
  isOpen: boolean
  /** Toggle overlay visibility */
  onToggle: () => void
  /** Fly the map to a specific location */
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void
  /** Highlight an entity on the map */
  onHighlightEntity?: (entityId: string) => void
  /** Full overlay mode (side panel vs floating) */
  mode?: "panel" | "floating"
  /** Search handler — pipes into main search system */
  onSearch?: (query: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmbeddingAtlasOverlay({
  entities,
  isOpen,
  onToggle,
  onFlyTo,
  onHighlightEntity,
  mode = "floating",
  onSearch,
}: EmbeddingAtlasOverlayProps) {
  const [manager] = useState(() => new CREPAtlasManager())
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<EmbeddingPoint[]>([])
  const [viewMode, setViewMode] = useState<"points" | "density">("points")
  const [expanded, setExpanded] = useState(false)
  const [activeCategories, setActiveCategories] = useState<Set<number>>(new Set())
  const [hoveredPoint, setHoveredPoint] = useState<EmbeddingPoint | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<EmbeddingPoint | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Ingest entities into atlas manager
  useEffect(() => {
    if (entities.length === 0) return
    manager.ingestEntities(entities)
    setStats(manager.getStats().entityCount)
  }, [entities, manager])

  // Render canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y, category, labels } = manager.getAtlasData()
    const n = x.length
    if (n === 0) return

    const rect = canvas.getBoundingClientRect()
    const { width, height } = rect
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.fillStyle = "#080810"
    ctx.fillRect(0, 0, width, height)

    // Bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < n; i++) {
      if (x[i] < minX) minX = x[i]
      if (x[i] > maxX) maxX = x[i]
      if (y[i] < minY) minY = y[i]
      if (y[i] > maxY) maxY = y[i]
    }
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const pad = 16

    // Density view: draw heatmap first
    if (viewMode === "density") {
      const gridSize = 32
      const grid = new Float32Array(gridSize * gridSize)
      const bw = 1.5

      for (let i = 0; i < n; i++) {
        const cat = category[i]
        if (activeCategories.size > 0 && !activeCategories.has(cat)) continue
        const gx = ((x[i] - minX) / rangeX) * (gridSize - 1)
        const gy = ((y[i] - minY) / rangeY) * (gridSize - 1)
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ix = Math.round(gx + dx)
            const iy = Math.round(gy + dy)
            if (ix < 0 || ix >= gridSize || iy < 0 || iy >= gridSize) continue
            const d = Math.sqrt(dx * dx + dy * dy)
            grid[iy * gridSize + ix] += Math.exp(-(d * d) / (2 * bw * bw))
          }
        }
      }

      let maxD = 0
      for (let i = 0; i < grid.length; i++) if (grid[i] > maxD) maxD = grid[i]

      if (maxD > 0) {
        const cellW = (width - 2 * pad) / gridSize
        const cellH = (height - 2 * pad) / gridSize
        for (let gy = 0; gy < gridSize; gy++) {
          for (let gx = 0; gx < gridSize; gx++) {
            const v = grid[gy * gridSize + gx] / maxD
            if (v < 0.03) continue
            const px = pad + gx * cellW
            const py = pad + gy * cellH
            ctx.fillStyle = `rgba(6,182,212,${(v * 0.5).toFixed(2)})`
            ctx.fillRect(px, py, cellW + 1, cellH + 1)
          }
        }
      }
    }

    // Draw points
    const ptSize = Math.max(1.5, Math.min(5, 150 / Math.sqrt(n)))
    for (let i = 0; i < n; i++) {
      const cat = category[i]
      if (activeCategories.size > 0 && !activeCategories.has(cat)) continue

      const px = pad + ((x[i] - minX) / rangeX) * (width - 2 * pad)
      const py = pad + ((y[i] - minY) / rangeY) * (height - 2 * pad)

      ctx.beginPath()
      ctx.arc(px, py, ptSize, 0, Math.PI * 2)
      ctx.fillStyle = (CATEGORY_COLORS[cat] || "#888") + "cc"
      ctx.fill()
    }

    // Draw labels
    ctx.font = "9px system-ui, sans-serif"
    ctx.textAlign = "center"
    for (const lbl of labels) {
      const lx = pad + ((lbl.x - minX) / rangeX) * (width - 2 * pad)
      const ly = pad + ((lbl.y - minY) / rangeY) * (height - 2 * pad)
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.fillText(lbl.text, lx, ly - 6)
    }

    // Highlight searched points
    for (const sr of searchResults) {
      const px = pad + ((sr.x - minX) / rangeX) * (width - 2 * pad)
      const py = pad + ((sr.y - minY) / rangeY) * (height - 2 * pad)
      ctx.beginPath()
      ctx.arc(px, py, ptSize + 3, 0, Math.PI * 2)
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Highlight selected
    if (selectedPoint) {
      const px = pad + ((selectedPoint.x - minX) / rangeX) * (width - 2 * pad)
      const py = pad + ((selectedPoint.y - minY) / rangeY) * (height - 2 * pad)
      ctx.beginPath()
      ctx.arc(px, py, ptSize + 5, 0, Math.PI * 2)
      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [isOpen, entities, viewMode, activeCategories, searchResults, selectedPoint, manager])

  // Local search within embeddings
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (q.length >= 2) {
      const results = manager.search(q, 20)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [manager])

  const handlePointClick = useCallback((point: EmbeddingPoint) => {
    setSelectedPoint(point)
    if (point.lat && point.lng) {
      onFlyTo?.(point.lat, point.lng, 12)
    }
    onHighlightEntity?.(point.id)
  }, [onFlyTo, onHighlightEntity])

  const toggleCategory = (catIndex: number) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catIndex)) next.delete(catIndex)
      else next.add(catIndex)
      return next
    })
  }

  // Category stats for filter chips
  const categoryStats = useMemo(() => {
    return Object.entries(stats)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        index: CATEGORY_MAP[type]?.index ?? 13,
        label: CATEGORY_MAP[type]?.label ?? type,
        color: CATEGORY_MAP[type]?.color ?? "#888",
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats])

  const totalPoints = Object.values(stats).reduce((s, c) => s + c, 0)

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "fixed z-50 bg-black/60 backdrop-blur-sm border border-violet-500/30",
          "hover:bg-violet-500/20 text-violet-300",
          mode === "floating" ? "bottom-20 right-4" : "top-4 right-4"
        )}
      >
        <Layers className="h-4 w-4 mr-2" />
        Atlas
        {totalPoints > 0 && (
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/30">
            {totalPoints}
          </span>
        )}
      </Button>
    )
  }

  const containerClass = mode === "panel"
    ? "w-[400px] h-full border-l border-violet-500/20 bg-black/95"
    : cn(
        "fixed z-50 rounded-2xl border border-violet-500/30 bg-black/95 backdrop-blur-xl shadow-2xl",
        expanded
          ? "bottom-4 right-4 w-[600px] h-[700px]"
          : "bottom-20 right-4 w-[380px] h-[480px]"
      )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className={containerClass}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Embedding Atlas</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
            {totalPoints.toLocaleString()} entities
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-white"
            onClick={() => setViewMode(viewMode === "points" ? "density" : "points")}
            title={viewMode === "points" ? "Density view" : "Points view"}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-white"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-white"
            onClick={onToggle}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search within CREP embeddings..."
            className="h-8 pl-8 text-xs bg-white/5 border-white/10"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="px-4 py-2 flex flex-wrap gap-1 border-b border-white/5">
        {categoryStats.map((cat) => (
          <button
            key={cat.index}
            onClick={() => toggleCategory(cat.index)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-all",
              activeCategories.size === 0 || activeCategories.has(cat.index)
                ? "opacity-100"
                : "opacity-30"
            )}
            style={{
              borderColor: cat.color + "50",
              backgroundColor: (activeCategories.size === 0 || activeCategories.has(cat.index))
                ? cat.color + "20"
                : "transparent",
              color: cat.color,
            }}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" style={{ height: expanded ? 400 : 240 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ height: "100%" }}
        />
        <div className="absolute bottom-1.5 left-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-muted-foreground/60">
          {viewMode === "density" ? "Density" : "Points"} | Click to locate on map
        </div>
      </div>

      {/* Search results / entity list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 max-h-[200px]">
        {(searchResults.length > 0 ? searchResults : manager.getState().points.slice(0, 15)).map(
          (p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs",
                "hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20",
                selectedPoint?.id === p.id && "bg-violet-500/15 border-violet-500/30"
              )}
              onClick={() => handlePointClick(p)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[p.category] }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{p.label}</span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {p.description}
                </span>
              </div>
              {p.lat && p.lng && <MapPin className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
            </motion.div>
          )
        )}
      </div>
    </motion.div>
  )
}

export default EmbeddingAtlasOverlay
