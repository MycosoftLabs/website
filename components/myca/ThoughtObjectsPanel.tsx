"use client"

/**
 * ThoughtObjectsPanel – displays ThoughtObjects from grounded cognition.
 * Fetches from /api/myca/thoughts.
 * Created: February 17, 2026
 */

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Brain, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

interface ThoughtObject {
  claim?: string
  type?: string
  confidence?: number
  evidence_links?: unknown[]
  raw?: string
  [key: string]: unknown
}

interface ThoughtObjectsPanelProps {
  className?: string
  topK?: number
  defaultExpanded?: boolean
  /** If true, renders as compact inline panel */
  compact?: boolean
}

export function ThoughtObjectsPanel({
  className,
  topK = 10,
  defaultExpanded = false,
  compact = false,
}: ThoughtObjectsPanelProps) {
  const [data, setData] = useState<{
    thoughts: ThoughtObject[]
    count: number
    enabled: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/myca/thoughts?top_k=${topK}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        })
        const json = await res.json()
        if (mounted) {
          setData({
            thoughts: json.thoughts ?? [],
            count: json.count ?? 0,
            enabled: json.enabled ?? false,
          })
        }
      } catch {
        if (mounted) setData({ thoughts: [], count: 0, enabled: false })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [topK])

  if (!data) return null
  if (!data.enabled && data.count === 0) return null

  const thoughts = data.thoughts ?? []
  const hasContent = thoughts.length > 0

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Brain className="h-3.5 w-3.5 text-violet-500" />
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${data.count} thought${data.count !== 1 ? "s" : ""}`}
        </span>
        {hasContent && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
        {expanded && hasContent && (
          <div className="mt-2 w-full space-y-2">
            {thoughts.map((t, i) => (
              <div
                key={i}
                className="rounded border border-border bg-muted/30 px-2 py-1.5 text-xs"
              >
                <span className="font-medium">{t.type ?? "thought"}:</span>{" "}
                {t.claim ?? (typeof t.raw === "string" ? t.raw : JSON.stringify(t))}
                {typeof t.confidence === "number" && (
                  <span className="ml-1 text-muted-foreground">({Math.round(t.confidence * 100)}%)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden border border-border", className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full min-h-[44px] items-center justify-between px-3 py-2 text-left hover:bg-muted/50 touch-manipulation"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Brain className="h-4 w-4 text-violet-500" />
          )}
          <span className="text-sm font-medium">Thought Objects</span>
          <span className="text-xs text-muted-foreground">({data.count})</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 py-2 max-h-[240px] overflow-y-auto">
          {!hasContent ? (
            <p className="text-sm text-muted-foreground">No thoughts yet.</p>
          ) : (
            <ul className="space-y-2">
              {thoughts.map((t, i) => (
                <li
                  key={i}
                  className="rounded border border-border bg-muted/20 p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-violet-500">
                      {t.type ?? "thought"}
                    </span>
                    {typeof t.confidence === "number" && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(t.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-foreground">
                    {t.claim ?? (typeof t.raw === "string" ? t.raw : JSON.stringify(t))}
                  </p>
                  {Array.isArray(t.evidence_links) && t.evidence_links.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.evidence_links.length} evidence link{t.evidence_links.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
