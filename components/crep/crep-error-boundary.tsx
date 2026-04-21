/**
 * CREP Error Boundary
 *
 * Catches rendering errors in any CREP component and provides
 * graceful degradation instead of crashing the entire dashboard.
 *
 * Features:
 * - Component-level error isolation
 * - Retry mechanism
 * - Error reporting to console
 * - Fallback UI that matches CREP dark tactical theme
 */

"use client"

import React from "react"
import { AlertTriangle, RotateCcw, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CREPErrorBoundaryProps {
  children: React.ReactNode
  /** Name of the component for error reporting */
  componentName?: string
  /** Compact mode for widgets/panels */
  compact?: boolean
  /** Custom fallback UI */
  fallback?: React.ReactNode
  /** Called when an error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface CREPErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

export class CREPErrorBoundary extends React.Component<
  CREPErrorBoundaryProps,
  CREPErrorBoundaryState
> {
  constructor(props: CREPErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<CREPErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const componentName = this.props.componentName || "Unknown CREP Component"

    console.error(
      `[CREP Error Boundary] Error in ${componentName}:`,
      error,
      errorInfo.componentStack
    )

    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)

    // Apr 21, 2026 (Morgan: "flight data still crashing ... Loading chunk
    // _app-pages-browser_components_crep_flight-tracker-widget_tsx failed").
    // After converting a dynamic import to a static import, a stale
    // browser-side webpack runtime manifest will keep trying to fetch
    // the (now non-existent) chunk, timing out forever. Detect the
    // ChunkLoadError case and do ONE forced hard reload to drop the
    // stale manifest — after that the static bundle serves everything
    // and the loop is broken. Use a session flag so we don't reload
    // in an infinite cycle if the issue actually persists server-side.
    const msg = error?.message || ""
    const isChunkLoadError =
      (error as any)?.name === "ChunkLoadError" ||
      /Loading chunk .* failed/.test(msg) ||
      /ChunkLoadError/.test(msg)
    if (isChunkLoadError && typeof window !== "undefined") {
      try {
        const key = "crep-chunk-reload-attempted"
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, String(Date.now()))
          console.warn(
            `[CREP Error Boundary] ChunkLoadError in ${componentName} — forcing hard reload to drop stale webpack manifest`,
          )
          // Give the console one tick to flush, then bypass the HTTP
          // cache by appending a cachebust query the browser can't
          // serve from its disk cache.
          setTimeout(() => {
            const u = new URL(window.location.href)
            u.searchParams.set("_crep_chunk_reload", String(Date.now()))
            window.location.replace(u.toString())
          }, 50)
        } else {
          // Already tried once this session — don't loop. Show the
          // normal error UI and let the user decide what to do.
          console.warn(
            `[CREP Error Boundary] ChunkLoadError in ${componentName} AFTER a prior reload. Not reloading again.`,
          )
        }
      } catch {
        // sessionStorage denied → skip the reload, fall through to UI
      }
    }
  }

  handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }))
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    const { compact, componentName } = this.props
    const { error, retryCount } = this.state
    const maxRetries = 3

    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-[10px] text-red-300 truncate">
            {componentName || "Component"} error
          </span>
          {retryCount < maxRetries && (
            <button
              onClick={this.handleRetry}
              className="ml-auto text-[9px] text-red-400 hover:text-red-300 underline shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-[#0a0f1e]/80 border border-red-500/20 space-y-3">
        <div className="p-3 rounded-full bg-red-500/10">
          <Bug className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-red-300">
            {componentName || "Component"} Error
          </p>
          <p className="text-xs text-gray-500 max-w-[300px]">
            {error?.message || "An unexpected error occurred"}
          </p>
        </div>
        {retryCount < maxRetries ? (
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Retry ({maxRetries - retryCount} left)
          </Button>
        ) : (
          <p className="text-[10px] text-gray-600">
            Max retries reached. Reload the page to try again.
          </p>
        )}
      </div>
    )
  }
}

/**
 * Convenience wrapper for wrapping individual CREP components
 */
export function withCREPErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  compact = false
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <CREPErrorBoundary componentName={componentName} compact={compact}>
      <WrappedComponent {...props} />
    </CREPErrorBoundary>
  )
  Wrapped.displayName = `withCREPErrorBoundary(${componentName})`
  return Wrapped
}
