"use client"

import React, { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Layers, RefreshCw, Download, Maximize2, Loader2,
  AlertCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface JBrowseAssembly {
  name: string
  sequence: {
    type: string
    faiLocation?: { uri: string }
    fastaLocation?: { uri: string }
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface JBrowseTrack {
  type: string
  trackId: string
  name: string
  assemblyNames: string[]
  adapter: Record<string, unknown>
  [key: string]: unknown
}

interface JBrowse2ViewerProps {
  /** Assembly configuration for JBrowse2 */
  assembly: JBrowseAssembly
  /** Track configurations */
  tracks?: JBrowseTrack[]
  /** Default location to navigate to (e.g. "chr1:1-1000") */
  defaultLocation?: string
  /** Viewer height in pixels */
  height?: number
  /** Additional CSS class names */
  className?: string
  /** Called when the view is ready */
  onReady?: () => void
}

/* -------------------------------------------------------------------------- */
/*  Loading / Error states                                                    */
/* -------------------------------------------------------------------------- */

function JBrowseLoadingSkeleton({ height }: { height: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height }}>
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <span className="text-sm text-muted-foreground">Loading JBrowse2 genome browser…</span>
    </div>
  )
}

function JBrowseErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">Failed to load JBrowse2</p>
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

interface InnerJBrowseProps {
  assembly: JBrowseAssembly
  tracks: JBrowseTrack[]
  defaultLocation?: string
  height: number
  onReady?: () => void
}

function InnerJBrowseFallback({
  assembly,
  tracks,
  defaultLocation,
  height,
  onReady,
}: InnerJBrowseProps) {
  const [jbrowseModule, setJbrowseModule] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const mod = await import("@jbrowse/react-linear-genome-view")
        if (!cancelled) {
          setJbrowseModule(mod)
          onReady?.()
        }
      } catch (err) {
        if (!cancelled) {
          setImportError(
            err instanceof Error
              ? err.message
              : "@jbrowse/react-linear-genome-view could not be loaded. Install with: npm install @jbrowse/react-linear-genome-view"
          )
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [onReady])

  if (importError) {
    return (
      <JBrowseErrorState
        error={importError}
        onRetry={() => {
          setImportError(null)
          setJbrowseModule(null)
        }}
      />
    )
  }

  if (!jbrowseModule) {
    return <JBrowseLoadingSkeleton height={height} />
  }

  const {
    createViewState,
    JBrowseLinearGenomeView,
  } = jbrowseModule

  if (!createViewState || !JBrowseLinearGenomeView) {
    return (
      <JBrowseErrorState
        error="JBrowse module loaded but createViewState or JBrowseLinearGenomeView not found."
        onRetry={() => setJbrowseModule(null)}
      />
    )
  }

  // Create the view state with provided assembly and tracks
  const state = createViewState({
    assembly,
    tracks,
    location: defaultLocation,
  })

  return (
    <div style={{ height }}>
      <JBrowseLinearGenomeView viewState={state} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Dynamic wrapper (SSR disabled)                                            */
/* -------------------------------------------------------------------------- */

const DynamicJBrowse = dynamic<InnerJBrowseProps>(
  () => Promise.resolve(InnerJBrowseFallback),
  {
    ssr: false,
    loading: () => <JBrowseLoadingSkeleton height={500} />,
  }
)

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function JBrowse2Viewer({
  assembly,
  tracks = [],
  defaultLocation,
  height = 500,
  className,
  onReady,
}: JBrowse2ViewerProps) {
  const [isReady, setIsReady] = useState(false)
  const [locationInput, setLocationInput] = useState(defaultLocation ?? "")

  const handleReady = useCallback(() => {
    setIsReady(true)
    onReady?.()
  }, [onReady])

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Layers className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Linear Genome View
                <Badge variant="outline" className="text-xs">JBrowse2</Badge>
                {isReady && (
                  <Badge variant="secondary" className="text-xs">Ready</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {assembly.name} — interactive genome browser
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
            <Button variant="ghost" size="icon" title="Pan left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Pan right">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Location search bar */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Navigate to region (e.g. chr1:1000-5000)"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {tracks.length} track{tracks.length !== 1 ? "s" : ""} loaded
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg overflow-hidden bg-white dark:bg-slate-900">
          <DynamicJBrowse
            assembly={assembly}
            tracks={tracks}
            defaultLocation={defaultLocation}
            height={height}
            onReady={handleReady}
          />
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span>Powered by JBrowse2 — GMOD consortium</span>
          <span>{assembly.name}</span>
        </div>
      </CardContent>
    </Card>
  )
}
