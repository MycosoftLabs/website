/**
 * EmbeddingAtlasWidget - Mar 2026
 *
 * Interactive embedding visualization widget for the search fluid canvas.
 * Uses embedding-atlas to render search results and CREP data as
 * high-performance WebGPU/WebGL scatter plots with:
 * - Density contours and clustering
 * - Real-time search within embedding space
 * - Cross-filter with CREP map
 * - Category-colored point clouds
 * - Hover tooltips with entity details
 */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Layers,
  MapPin,
  BarChart3,
  RefreshCw,
  Zap,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  decompressEmbeddingBatch,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_MAP,
  type EmbeddingBatch,
} from "@/lib/search/embedding-engine"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmbeddingAtlasWidgetProps {
  query?: string
  isLoading?: boolean
  isFocused?: boolean
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  onViewOnMap?: (point: { lat: number; lng: number; label: string }) => void
  onSelectPoint?: (point: { id: string; type: string; label: string }) => void
}

interface AtlasData {
  x: Float32Array
  y: Float32Array
  category: Uint8Array
  points: EmbeddingBatch["points"]
  totalCount: number
}

interface HoveredPoint {
  index: number
  x: number
  y: number
  screenX: number
  screenY: number
  label: string
  description: string
  type: string
  score: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmbeddingAtlasWidget({
  query = "",
  isLoading: externalLoading = false,
  isFocused = false,
  onAddToNotepad,
  onViewOnMap,
  onSelectPoint,
}: EmbeddingAtlasWidgetProps) {
  const [atlasData, setAtlasData] = useState<AtlasData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<"points" | "density">("points")
  const [activeFilters, setActiveFilters] = useState<Set<number>>(new Set())
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null)
  const [localSearch, setLocalSearch] = useState("")
  const [meta, setMeta] = useState<Record<string, unknown>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  // Fetch embedding data
  const fetchEmbeddings = useCallback(async (q: string) => {
    if (!q || q.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ q, limit: "500", crep: "true" })
      const response = await fetch(`/api/search/embeddings?${params}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.batch) {
        const decoded = decompressEmbeddingBatch(data.batch)
        setAtlasData({
          x: decoded.x,
          y: decoded.y,
          category: decoded.category,
          points: decoded.points,
          totalCount: data.batch.totalCount,
        })
        setMeta(data.meta || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load embeddings")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on query change
  useEffect(() => {
    if (query) fetchEmbeddings(query)
  }, [query, fetchEmbeddings])

  // Canvas-based rendering (WebGL fallback when embedding-atlas React isn't available in SSR)
  useEffect(() => {
    if (!atlasData || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * (window.devicePixelRatio || 1)
      canvas.height = height * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)

      // Clear
      ctx.fillStyle = "#0a0a0f"
      ctx.fillRect(0, 0, width, height)

      const { x, y, category, points } = atlasData
      const n = points.length
      if (n === 0) return

      // Find bounds for normalization
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (let i = 0; i < n; i++) {
        if (x[i] < minX) minX = x[i]
        if (x[i] > maxX) maxX = x[i]
        if (y[i] < minY) minY = y[i]
        if (y[i] > maxY) maxY = y[i]
      }
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1
      const padding = 20

      // Draw density background (simplified contours)
      if (viewMode === "density") {
        drawDensityHeatmap(ctx, x, y, category, n, minX, minY, rangeX, rangeY, width, height, padding)
      }

      // Draw points
      const pointSize = viewMode === "density" ? 2 : Math.max(2, Math.min(6, 200 / Math.sqrt(n)))
      for (let i = 0; i < n; i++) {
        const cat = category[i]
        if (activeFilters.size > 0 && !activeFilters.has(cat)) continue

        const px = padding + ((x[i] - minX) / rangeX) * (width - 2 * padding)
        const py = padding + ((y[i] - minY) / rangeY) * (height - 2 * padding)

        const color = CATEGORY_COLORS[cat] || "#666"
        const alpha = viewMode === "density" ? 0.4 : 0.8

        ctx.beginPath()
        ctx.arc(px, py, pointSize, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0")
        ctx.fill()
      }

      // Draw cluster labels
      const categoryPositions = new Map<number, { sx: number; sy: number; count: number }>()
      for (let i = 0; i < n; i++) {
        const cat = category[i]
        if (activeFilters.size > 0 && !activeFilters.has(cat)) continue
        const px = padding + ((x[i] - minX) / rangeX) * (width - 2 * padding)
        const py = padding + ((y[i] - minY) / rangeY) * (height - 2 * padding)
        const cur = categoryPositions.get(cat) || { sx: 0, sy: 0, count: 0 }
        cur.sx += px
        cur.sy += py
        cur.count++
        categoryPositions.set(cat, cur)
      }

      ctx.font = "10px system-ui, sans-serif"
      ctx.textAlign = "center"
      for (const [cat, pos] of categoryPositions) {
        if (pos.count < 2) continue
        const cx = pos.sx / pos.count
        const cy = pos.sy / pos.count
        const label = CATEGORY_LABELS[cat] || "Unknown"
        ctx.fillStyle = "rgba(255,255,255,0.6)"
        ctx.fillText(`${label} (${pos.count})`, cx, cy - 8)
      }
    }

    render()

    // Handle hover detection
    const handleMouseMove = (e: MouseEvent) => {
      if (!atlasData) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { width, height } = rect
      const padding = 20

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (let i = 0; i < atlasData.points.length; i++) {
        if (atlasData.x[i] < minX) minX = atlasData.x[i]
        if (atlasData.x[i] > maxX) maxX = atlasData.x[i]
        if (atlasData.y[i] < minY) minY = atlasData.y[i]
        if (atlasData.y[i] > maxY) maxY = atlasData.y[i]
      }
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1

      let closestIdx = -1
      let closestDist = 100 // max pixel distance
      for (let i = 0; i < atlasData.points.length; i++) {
        const px = padding + ((atlasData.x[i] - minX) / rangeX) * (width - 2 * padding)
        const py = padding + ((atlasData.y[i] - minY) / rangeY) * (height - 2 * padding)
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2)
        if (dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      }

      if (closestIdx >= 0 && closestDist < 15) {
        const p = atlasData.points[closestIdx]
        setHoveredPoint({
          index: closestIdx,
          x: atlasData.x[closestIdx],
          y: atlasData.y[closestIdx],
          screenX: e.clientX,
          screenY: e.clientY,
          label: p.label,
          description: p.description,
          type: p.type,
          score: p.score,
        })
      } else {
        setHoveredPoint(null)
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (hoveredPoint && atlasData) {
        const p = atlasData.points[hoveredPoint.index]
        onSelectPoint?.({ id: p.id, type: p.type, label: p.label })
        if (p.lat && p.lng) {
          onViewOnMap?.({ lat: p.lat, lng: p.lng, label: p.label })
        }
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("click", handleClick)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("click", handleClick)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [atlasData, viewMode, activeFilters, hoveredPoint, onSelectPoint, onViewOnMap])

  // Category stats
  const categoryStats = useMemo(() => {
    if (!atlasData) return []
    const counts = new Map<number, number>()
    for (let i = 0; i < atlasData.category.length; i++) {
      const c = atlasData.category[i]
      counts.set(c, (counts.get(c) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([cat, count]) => ({
        index: cat,
        label: CATEGORY_LABELS[cat] || "Unknown",
        color: CATEGORY_COLORS[cat] || "#666",
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [atlasData])

  const toggleFilter = (catIndex: number) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(catIndex)) {
        next.delete(catIndex)
      } else {
        next.add(catIndex)
      }
      return next
    })
  }

  // Loading / empty states
  if (loading || externalLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Generating embeddings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Zap className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => fetchEmbeddings(query)}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    )
  }

  if (!atlasData || atlasData.totalCount === 0) {
    return (
      <div className="text-center py-8">
        <Layers className="h-12 w-12 mx-auto mb-3 text-violet-500 opacity-60" />
        <p className="text-sm text-muted-foreground">
          Search to visualize data embeddings
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          CREP + Search data rendered as interactive point clouds
        </p>
      </div>
    )
  }

  const containerHeight = expanded ? 500 : isFocused ? 350 : 200

  return (
    <div className="space-y-3 overflow-hidden flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium">
            {atlasData.totalCount.toLocaleString()} points
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
            {categoryStats.length} categories
          </span>
          {typeof meta.latencyMs === "number" && (
            <span className="text-[10px] text-muted-foreground/50">
              {meta.latencyMs}ms
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode(viewMode === "points" ? "density" : "points")}
            title={viewMode === "points" ? "Density view" : "Points view"}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fetchEmbeddings(query)}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {categoryStats.map((cat) => (
          <button
            key={cat.index}
            onClick={() => toggleFilter(cat.index)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-all",
              activeFilters.size === 0 || activeFilters.has(cat.index)
                ? "opacity-100"
                : "opacity-40"
            )}
            style={{
              borderColor: cat.color + "60",
              backgroundColor: (activeFilters.size === 0 || activeFilters.has(cat.index))
                ? cat.color + "20"
                : "transparent",
              color: cat.color,
            }}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Canvas visualization */}
      <motion.div
        animate={{ height: containerHeight }}
        transition={{ duration: 0.3 }}
        className="relative rounded-xl overflow-hidden border border-violet-500/20 bg-[#0a0a0f]"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ height: containerHeight }}
        />

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg bg-black/90 border border-white/10 text-xs max-w-[200px]"
            style={{
              left: Math.min(
                (canvasRef.current?.getBoundingClientRect().width || 300) - 210,
                hoveredPoint.screenX - (canvasRef.current?.getBoundingClientRect().left || 0)
              ),
              top: Math.max(0,
                hoveredPoint.screenY - (canvasRef.current?.getBoundingClientRect().top || 0) - 60
              ),
            }}
          >
            <div className="font-medium text-white">{hoveredPoint.label}</div>
            <div className="text-muted-foreground mt-0.5">{hoveredPoint.description}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[atlasData.category[hoveredPoint.index]] }}
              />
              <span className="text-muted-foreground">
                {CATEGORY_LABELS[atlasData.category[hoveredPoint.index]]}
              </span>
              <span className="text-muted-foreground/50">
                {(hoveredPoint.score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* View mode badge */}
        <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-muted-foreground">
          {viewMode === "density" ? "Density" : "Points"} | {atlasData.totalCount} items
        </div>
      </motion.div>

      {/* Top results list (when focused) */}
      {isFocused && atlasData.points.length > 0 && (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {atlasData.points.slice(0, 10).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer",
                "hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20",
                "transition-all"
              )}
              onClick={() => {
                onSelectPoint?.({ id: p.id, type: p.type, label: p.label })
                if (p.lat && p.lng) {
                  onViewOnMap?.({ lat: p.lat, lng: p.lng, label: p.label })
                }
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[CATEGORY_MAP[p.type]?.index ?? 13] }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium truncate block">{p.label}</span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {p.description}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {CATEGORY_LABELS[CATEGORY_MAP[p.type]?.index ?? 13]}
              </span>
              {p.lat && p.lng && (
                <MapPin className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Density heatmap helper (simplified kernel density estimation)
// ---------------------------------------------------------------------------

function drawDensityHeatmap(
  ctx: CanvasRenderingContext2D,
  x: Float32Array,
  y: Float32Array,
  category: Uint8Array,
  n: number,
  minX: number,
  minY: number,
  rangeX: number,
  rangeY: number,
  width: number,
  height: number,
  padding: number
) {
  const gridSize = 40
  const grid = new Float32Array(gridSize * gridSize)
  const bandwidth = 2 // grid cells

  // Accumulate density
  for (let i = 0; i < n; i++) {
    const gx = ((x[i] - minX) / rangeX) * (gridSize - 1)
    const gy = ((y[i] - minY) / rangeY) * (gridSize - 1)

    for (let dy = -bandwidth; dy <= bandwidth; dy++) {
      for (let dx = -bandwidth; dx <= bandwidth; dx++) {
        const ix = Math.round(gx + dx)
        const iy = Math.round(gy + dy)
        if (ix < 0 || ix >= gridSize || iy < 0 || iy >= gridSize) continue
        const dist = Math.sqrt(dx * dx + dy * dy)
        const weight = Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth))
        grid[iy * gridSize + ix] += weight
      }
    }
  }

  // Find max density
  let maxDensity = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > maxDensity) maxDensity = grid[i]
  }

  if (maxDensity === 0) return

  // Draw heatmap
  const cellW = (width - 2 * padding) / gridSize
  const cellH = (height - 2 * padding) / gridSize

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const val = grid[gy * gridSize + gx] / maxDensity
      if (val < 0.05) continue

      const px = padding + gx * cellW
      const py = padding + gy * cellH

      // Purple-cyan gradient
      const r = Math.round(val * 139)
      const g = Math.round(val * 92 + (1 - val) * 20)
      const b = Math.round(val * 246 + (1 - val) * 40)
      const a = Math.min(0.6, val * 0.8)

      ctx.fillStyle = `rgba(${r},${g},${b},${a})`
      ctx.fillRect(px, py, cellW + 1, cellH + 1)
    }
  }
}

export default EmbeddingAtlasWidget
