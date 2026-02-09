"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dna, RefreshCw, Download, Maximize2, Loader2,
  AlertCircle, ZoomIn, ZoomOut
} from "lucide-react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** A single Gosling track specification object (simplified type). */
interface GoslingTrackSpec {
  data?: Record<string, unknown>
  mark?: string
  x?: Record<string, unknown>
  y?: Record<string, unknown>
  color?: Record<string, unknown>
  [key: string]: unknown
}

interface GoslingViewerProps {
  /** Gosling track specification — see https://gosling-lang.org */
  spec: GoslingTrackSpec | GoslingTrackSpec[]
  /** Viewer width in pixels */
  width?: number
  /** Viewer height in pixels */
  height?: number
  /** Additional CSS class names */
  className?: string
  /** Called when the viewer finishes rendering */
  onReady?: () => void
}

/* -------------------------------------------------------------------------- */
/*  Loading / Error states                                                    */
/* -------------------------------------------------------------------------- */

function GoslingLoadingSkeleton({ height }: { height: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height }}>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <span className="text-sm text-muted-foreground">Loading Gosling genome viewer…</span>
    </div>
  )
}

function GoslingErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">Failed to load Gosling.js</p>
      <p className="text-xs text-muted-foreground max-w-md">{error}</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Inner component (dynamically imported)                                    */
/* -------------------------------------------------------------------------- */

/**
 * The actual Gosling component is loaded via `next/dynamic` because it relies
 * on browser‑only APIs (Canvas, WebGL).  If the library isn't installed the
 * import will fail and we show an informative error rather than crashing.
 */

interface InnerGoslingProps {
  spec: GoslingTrackSpec | GoslingTrackSpec[]
  width: number
  height: number
  onReady?: () => void
}

function InnerGoslingFallback({ spec, width, height, onReady }: InnerGoslingProps) {
  const [goslingModule, setGoslingModule] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const mod = await import("gosling.js")
        if (!cancelled) {
          setGoslingModule(mod)
          onReady?.()
        }
      } catch (err) {
        if (!cancelled) {
          setImportError(
            err instanceof Error
              ? err.message
              : "gosling.js could not be loaded. Install with: npm install gosling.js"
          )
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [onReady])

  if (importError) {
    return (
      <GoslingErrorState
        error={importError}
        onRetry={() => {
          setImportError(null)
          setGoslingModule(null)
        }}
      />
    )
  }

  if (!goslingModule) {
    return <GoslingLoadingSkeleton height={height} />
  }

  const GoslingComponent = goslingModule.GoslingComponent ?? goslingModule.default

  if (!GoslingComponent) {
    return (
      <GoslingErrorState
        error="Gosling module loaded but no renderable component found."
        onRetry={() => setGoslingModule(null)}
      />
    )
  }

  // Build a minimal Gosling spec wrapper
  const fullSpec = {
    tracks: Array.isArray(spec) ? spec : [spec],
    style: { outlineWidth: 0 },
  }

  return (
    <div ref={containerRef} style={{ width, height }}>
      <GoslingComponent spec={fullSpec} padding={0} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Dynamic wrapper (SSR disabled)                                            */
/* -------------------------------------------------------------------------- */

const DynamicGosling = dynamic<InnerGoslingProps>(
  () => Promise.resolve(InnerGoslingFallback),
  {
    ssr: false,
    loading: () => <GoslingLoadingSkeleton height={400} />,
  }
)

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function GoslingViewer({
  spec,
  width = 800,
  height = 400,
  className,
  onReady,
}: GoslingViewerProps) {
  const [isReady, setIsReady] = useState(false)

  const handleReady = useCallback(() => {
    setIsReady(true)
    onReady?.()
  }, [onReady])

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Dna className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Genome Visualization
                <Badge variant="outline" className="text-xs">Gosling.js</Badge>
                {isReady && (
                  <Badge variant="secondary" className="text-xs">Ready</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Interactive genome browser powered by Gosling.js
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg overflow-hidden bg-slate-900">
          <DynamicGosling
            spec={spec}
            width={width}
            height={height}
            onReady={handleReady}
          />
        </div>
      </CardContent>
    </Card>
  )
}
