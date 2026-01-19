"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

// Types for Perspective configuration
export interface PerspectiveColumn {
  name: string
  type: "string" | "integer" | "float" | "boolean" | "date" | "datetime"
}

export interface PerspectiveConfig {
  columns?: string[]
  group_by?: string[]
  split_by?: string[]
  aggregates?: Record<string, string>
  sort?: Array<[string, "asc" | "desc"]>
  filter?: Array<[string, string, string | number | boolean]>
  plugin?: "datagrid" | "d3_y_line" | "d3_y_area" | "d3_y_scatter" | "d3_xy_scatter" | "d3_treemap" | "d3_sunburst" | "d3_heatmap"
  plugin_config?: Record<string, unknown>
  expressions?: string[]
  theme?: "Pro Light" | "Pro Dark" | "Vaporwave"
}

export interface PerspectiveViewerProps {
  /** Data to display - can be JSON array, Arrow buffer, or CSV string */
  data: Record<string, unknown>[] | ArrayBuffer | string
  /** Optional schema definition */
  schema?: Record<string, PerspectiveColumn["type"]>
  /** Perspective configuration */
  config?: PerspectiveConfig
  /** Container height */
  height?: string | number
  /** Container className */
  className?: string
  /** Show loading state */
  loading?: boolean
  /** Callback when view config changes */
  onConfigChange?: (config: PerspectiveConfig) => void
  /** Enable dark theme */
  darkTheme?: boolean
  /** Title for the viewer */
  title?: string
}

/**
 * PerspectiveViewer - High-performance data visualization component
 * Uses WebAssembly for fast processing of large datasets (millions of rows)
 * 
 * @example
 * <PerspectiveViewer
 *   data={flightData}
 *   config={{
 *     columns: ['flight_id', 'altitude', 'speed'],
 *     group_by: ['airline'],
 *     plugin: 'd3_y_line',
 *   }}
 *   height={400}
 * />
 */
export function PerspectiveViewer({
  data,
  schema,
  config,
  height = 400,
  className,
  loading = false,
  onConfigChange,
  darkTheme = true,
  title,
}: PerspectiveViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLElement | null>(null)
  const tableRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize on client only
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load Perspective and initialize
  useEffect(() => {
    if (!isClient || !containerRef.current) return

    let isMounted = true
    let viewer: HTMLElement | null = null

    async function initPerspective() {
      try {
        setIsLoading(true)
        setError(null)

        // Dynamic imports for client-side only
        const perspective = await import("@finos/perspective")
        await import("@finos/perspective-viewer")
        await import("@finos/perspective-viewer-datagrid")
        await import("@finos/perspective-viewer-d3fc")

        if (!isMounted || !containerRef.current) return

        // Create viewer element if it doesn't exist
        if (!viewerRef.current) {
          viewer = document.createElement("perspective-viewer") as HTMLElement
          viewer.setAttribute("theme", darkTheme ? "Pro Dark" : "Pro Light")
          containerRef.current.appendChild(viewer)
          viewerRef.current = viewer
        } else {
          viewer = viewerRef.current
        }

        // Create worker and table
        const worker = await perspective.default.worker()
        
        // Determine data format and create table
        let tableData: any = data
        if (typeof data === "string") {
          // CSV string
          tableData = data
        } else if (data instanceof ArrayBuffer) {
          // Arrow format
          tableData = data
        } else if (Array.isArray(data)) {
          // JSON array - convert to Arrow-compatible format
          tableData = data
        }

        const table = await worker.table(tableData, { name: "data" })
        tableRef.current = table

        // Load table into viewer
        await (viewer as any).load(table)

        // Apply configuration
        if (config) {
          await (viewer as any).restore(config)
        }

        // Listen for config changes
        viewer.addEventListener("perspective-config-update", (event: any) => {
          if (onConfigChange) {
            (viewer as any).save().then(onConfigChange)
          }
        })

        setIsLoading(false)
      } catch (e) {
        console.error("Failed to initialize Perspective:", e)
        setError(e instanceof Error ? e.message : "Failed to load analytics")
        setIsLoading(false)
      }
    }

    initPerspective()

    return () => {
      isMounted = false
      if (tableRef.current) {
        tableRef.current.delete()
        tableRef.current = null
      }
      if (viewerRef.current && containerRef.current) {
        containerRef.current.removeChild(viewerRef.current)
        viewerRef.current = null
      }
    }
  }, [isClient, darkTheme])

  // Update data when it changes
  useEffect(() => {
    if (!tableRef.current || !Array.isArray(data)) return

    async function updateData() {
      try {
        await tableRef.current.update(data)
      } catch (e) {
        console.error("Failed to update data:", e)
      }
    }

    updateData()
  }, [data])

  // Update config when it changes
  useEffect(() => {
    if (!viewerRef.current || !config) return

    async function updateConfig() {
      try {
        await (viewerRef.current as any).restore(config)
      } catch (e) {
        console.error("Failed to update config:", e)
      }
    }

    updateConfig()
  }, [config])

  // SSR fallback
  if (!isClient) {
    return (
      <div 
        className={cn("border rounded-lg bg-muted/20 flex items-center justify-center", className)}
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {title && (
        <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-sm font-medium">
          {title}
        </div>
      )}
      
      {(loading || isLoading) && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Loading analytics...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center z-20 rounded-lg border border-destructive">
          <div className="text-center p-4">
            <p className="text-destructive font-medium">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}
      
      <div
        ref={containerRef}
        className={cn(
          "border rounded-lg overflow-hidden",
          darkTheme ? "bg-slate-950" : "bg-white"
        )}
        style={{ 
          height: typeof height === "number" ? `${height}px` : height,
          minHeight: 200,
        }}
      />
    </div>
  )
}

// Helper to create common chart configurations
export const perspectiveConfigs = {
  lineChart: (columns: string[], groupBy?: string[]): PerspectiveConfig => ({
    plugin: "d3_y_line",
    columns,
    group_by: groupBy,
  }),
  
  areaChart: (columns: string[], groupBy?: string[]): PerspectiveConfig => ({
    plugin: "d3_y_area",
    columns,
    group_by: groupBy,
  }),
  
  scatterPlot: (xColumn: string, yColumn: string): PerspectiveConfig => ({
    plugin: "d3_xy_scatter",
    columns: [xColumn, yColumn],
  }),
  
  heatmap: (columns: string[], groupBy: string[], splitBy: string[]): PerspectiveConfig => ({
    plugin: "d3_heatmap",
    columns,
    group_by: groupBy,
    split_by: splitBy,
  }),
  
  treemap: (sizeColumn: string, colorColumn: string, groupBy: string[]): PerspectiveConfig => ({
    plugin: "d3_treemap",
    columns: [sizeColumn, colorColumn],
    group_by: groupBy,
  }),
  
  dataGrid: (columns: string[], sortBy?: [string, "asc" | "desc"]): PerspectiveConfig => ({
    plugin: "datagrid",
    columns,
    sort: sortBy ? [sortBy] : undefined,
  }),
}
