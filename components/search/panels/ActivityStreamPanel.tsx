"use client"

/**
 * ActivityStreamPanel - Feb 10, 2026
 *
 * Left panel: Activity stream (consciousness status, memory, agent activity)
 * Replaces MYCAChatPanel - chat is now in the Answers widget.
 */

import { useState, useEffect, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Brain, Bot, MessageSquare, Zap, RefreshCw, Loader2 } from "lucide-react"

interface ActivityEvent {
  id: string
  type: "consciousness" | "memory" | "agent" | "conversation" | "intention"
  title: string
  summary?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

function formatTimeAgo(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  if (sec < 60) return "Just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  return d.toLocaleDateString()
}

function EventIcon({ type }: { type: ActivityEvent["type"] }) {
  switch (type) {
    case "consciousness":
      return <Brain className="h-3.5 w-3.5 text-violet-500" />
    case "agent":
      return <Bot className="h-3.5 w-3.5 text-amber-500" />
    case "conversation":
      return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
    case "intention":
      return <Zap className="h-3.5 w-3.5 text-blue-500" />
    default:
      return <Zap className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

export function ActivityStreamPanel() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/myca/activity?limit=20")
      const data = await res.json()
      setEvents(data.events || [])
      if (data.error) setError(data.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
    const t = setInterval(fetchActivity, 30000)
    return () => clearInterval(t)
  }, [fetchActivity])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 shrink-0">
        <h3 className="text-sm font-medium text-foreground/90">Activity</h3>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="p-1 rounded hover:bg-white/5 transition-colors"
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {error && (
            <div className="text-xs text-amber-500/90 py-2 px-2 rounded bg-amber-500/10">
              {error}
            </div>
          )}
          {!loading && events.length === 0 && !error && (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No activity yet. Start a search or chat with MYCA.
            </div>
          )}
          {events.map((ev) => (
            (() => {
              const consciousnessMeta = ev.metadata as { is_conscious?: boolean } | undefined
              const isConscious = !!consciousnessMeta?.is_conscious
              return (
            <div
              key={ev.id}
              className="flex gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="mt-0.5 shrink-0">
                <EventIcon type={ev.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/90 truncate">{ev.title}</p>
                {ev.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ev.summary}</p>
                )}
                <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTimeAgo(ev.timestamp)}</p>
              </div>
              {ev.type === "consciousness" && ev.metadata && (
                <Badge
                  variant={isConscious ? "default" : "secondary"}
                  className="shrink-0 text-[10px] h-5"
                >
                  {isConscious ? "Awake" : "Dormant"}
                </Badge>
              )}
            </div>
              )
            })()
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
