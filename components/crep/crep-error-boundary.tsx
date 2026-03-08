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
