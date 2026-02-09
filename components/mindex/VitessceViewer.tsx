"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Globe, RefreshCw, Maximize2, Loader2,
  AlertCircle, Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Vitessce view configuration — see https://vitessce.io */
interface VitessceConfig {
  version?: string
  name?: string
  description?: string
  datasets?: Record<string, unknown>[]
  coordinationSpace?: Record<string, unknown>
  layout?: Record<string, unknown>[]
  [key: string]: unknown
}

interface VitessceViewerProps {
  /** Vitessce configuration object */
  config: VitessceConfig
  /** Viewer height in pixels */
  height?: number
  /** Additional CSS class names */
  className?: string
  /** Optional theme: "light" | "dark" */
  theme?: "light" | "dark"
  /** Called when the viewer finishes loading */
  onReady?: () => void
}

/* -------------------------------------------------------------------------- */
/*  Loading / Error states                                                    */
/* -------------------------------------------------------------------------- */

function VitessceLoadingSkeleton({ height }: { height: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height }}>
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      <span className="text-sm text-muted-foreground">Loading Vitessce spatial viewer…</span>
    </div>
  )
}

function VitessceErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">Failed to load Vitessce</p>
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

interface InnerVitessceProps {
  config: VitessceConfig
  height: number
  theme: "light" | "dark"
  onReady?: () => void
}

function InnerVitessceFallback({ config, height, theme, onReady }: InnerVitessceProps) {
  const [vitessceModule, setVitessceModule] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const mod = await import("vitessce")
        if (!cancelled) {
          setVitessceModule(mod)
          onReady?.()
        }
      } catch (err) {
        if (!cancelled) {
          setImportError(
            err instanceof Error
              ? err.message
              : "vitessce could not be loaded. Install with: npm install vitessce"
          )
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [onReady])

  if (importError) {
    return (
      <VitessceErrorState
        error={importError}
        onRetry={() => {
          setImportError(null)
          setVitessceModule(null)
        }}
      />
    )
  }

  if (!vitessceModule) {
    return <VitessceLoadingSkeleton height={height} />
  }

  const VitessceComponent = vitessceModule.Vitessce ?? vitessceModule.default

  if (!VitessceComponent) {
    return (
      <VitessceErrorState
        error="Vitessce module loaded but no renderable component found."
        onRetry={() => setVitessceModule(null)}
      />
    )
  }

  return (
    <div style={{ height }}>
      <VitessceComponent
        config={config}
        height={height}
        theme={theme}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Dynamic wrapper (SSR disabled)                                            */
/* -------------------------------------------------------------------------- */

const DynamicVitessce = dynamic<InnerVitessceProps>(
  () => Promise.resolve(InnerVitessceFallback),
  {
    ssr: false,
    loading: () => <VitessceLoadingSkeleton height={500} />,
  }
)

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function VitessceViewer({
  config,
  height = 500,
  className,
  theme = "dark",
  onReady,
}: VitessceViewerProps) {
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
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Globe className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Spatial Visualization
                <Badge variant="outline" className="text-xs">Vitessce</Badge>
                {isReady && (
                  <Badge variant="secondary" className="text-xs">Ready</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Multi-modal spatial data viewer for biological datasets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg overflow-hidden bg-slate-900">
          <DynamicVitessce
            config={config}
            height={height}
            theme={theme}
            onReady={handleReady}
          />
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span>Powered by Vitessce — multi-modal biological visualization</span>
          {config.name && <span>{config.name}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
