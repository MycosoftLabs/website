"use client"

/**
 * GroundingStatusBadge – shows grounded/processing/ungrounded state for MYCA.
 * Fetches grounding status from /api/myca/grounding/status.
 * Created: February 17, 2026
 */

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Loader2, CheckCircle2, AlertCircle, Pause } from "lucide-react"

export type GroundingState = "grounded" | "processing" | "ungrounded" | "disabled"

interface GroundingStatusBadgeProps {
  className?: string
  /** If provided, skips fetch and uses this state */
  groundingState?: GroundingState | null
  /** If provided, uses this from context instead of fetching */
  isGrounded?: boolean
  isLoading?: boolean
  thoughtCount?: number
}

export function GroundingStatusBadge({
  className,
  groundingState: controlledState,
  isGrounded,
  isLoading: controlledLoading,
  thoughtCount,
}: GroundingStatusBadgeProps) {
  const [fetched, setFetched] = useState<{
    enabled: boolean
    thought_count: number
    last_ep_id: string | null
  } | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (controlledState !== undefined || controlledLoading !== undefined) return
    let mounted = true
    const load = async () => {
      setFetching(true)
      try {
        const res = await fetch("/api/myca/grounding/status", {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        })
        const data = await res.json()
        if (mounted) setFetched(data)
      } catch {
        if (mounted) setFetched(null)
      } finally {
        if (mounted) setFetching(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [controlledState, controlledLoading])

  const loading = controlledLoading ?? fetching
  const enabled = fetched?.enabled ?? false
  const count = thoughtCount ?? fetched?.thought_count ?? 0

  let state: GroundingState = "disabled"
  let label = "Ungrounded"
  let icon = <AlertCircle className="h-3 w-3" />
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
  let badgeClass = "text-muted-foreground border-muted"

  if (controlledState) {
    state = controlledState
  } else if (!enabled) {
    state = "disabled"
  } else if (loading) {
    state = "processing"
  } else if (isGrounded ?? (count > 0 && fetched?.last_ep_id)) {
    state = "grounded"
  } else {
    state = "ungrounded"
  }

  switch (state) {
    case "grounded":
      label = "Grounded"
      icon = <CheckCircle2 className="h-3 w-3" />
      badgeClass = "text-green-500 border-green-500/30 bg-green-500/10"
      break
    case "processing":
      label = "Processing"
      icon = <Loader2 className="h-3 w-3 animate-spin" />
      badgeClass = "text-amber-500 border-amber-500/30 bg-amber-500/10"
      break
    case "ungrounded":
      label = "Ungrounded"
      icon = <AlertCircle className="h-3 w-3" />
      badgeClass = "text-muted-foreground border-muted"
      break
    case "disabled":
      label = "LLM-only"
      icon = <Pause className="h-3 w-3" />
      badgeClass = "text-muted-foreground/70 border-muted"
      break
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] h-5 px-1.5 min-h-[28px] flex items-center justify-center touch-manipulation",
        badgeClass,
        className
      )}
      title={`Grounding: ${label}${enabled && count > 0 ? ` (${count} thoughts)` : ""}`}
    >
      {icon}
      <span className="ml-1 truncate max-w-[60px]">{label}</span>
    </Badge>
  )
}
