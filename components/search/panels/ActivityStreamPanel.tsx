/**
 * ActivityStreamPanel — Updated Mar 19, 2026
 *
 * Left panel: Shows Myca's thinking process and search hierarchy.
 * - Real-time SSE stream from MAS for Myca's consciousness activity
 * - Search hierarchy: associations between user searches
 * - What Myca is doing: thinking, learning, self-prompting
 * - What Myca found during processing
 * - Polling fallback when SSE unavailable
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Bot,
  MessageSquare,
  Zap,
  RefreshCw,
  Loader2,
  Search,
  Lightbulb,
  Link2,
  Sparkles,
  Eye,
  BookOpen,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Radio,
} from "lucide-react"
import { useSearchContext } from "../SearchContextProvider"

// =============================================================================
// TYPES
// =============================================================================

interface ActivityEvent {
  id: string
  type: "consciousness" | "memory" | "agent" | "conversation" | "intention" | "search" | "thinking" | "learning" | "discovery"
  title: string
  summary?: string
  timestamp: string
  metadata?: Record<string, unknown>
  /** For search hierarchy: related searches */
  relatedSearches?: string[]
  /** For thinking events: current thought step */
  thinkingStep?: string
}

interface SearchHierarchyNode {
  query: string
  timestamp: string
  associations: string[]
  resultTypes: string[]
  mycaInsight?: string
}

// =============================================================================
// HELPERS
// =============================================================================

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
    case "consciousness": return <Brain className="h-3.5 w-3.5 text-violet-500" />
    case "agent": return <Bot className="h-3.5 w-3.5 text-amber-500" />
    case "conversation": return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
    case "intention": return <Zap className="h-3.5 w-3.5 text-blue-500" />
    case "search": return <Search className="h-3.5 w-3.5 text-green-500" />
    case "thinking": return <Lightbulb className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
    case "learning": return <BookOpen className="h-3.5 w-3.5 text-cyan-500" />
    case "discovery": return <Sparkles className="h-3.5 w-3.5 text-pink-500" />
    default: return <Zap className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ActivityStreamPanel() {
  const ctx = useSearchContext()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHierarchyNode[]>([])
  const [expandedSection, setExpandedSection] = useState<"activity" | "searches" | "both">("both")
  const eventSourceRef = useRef<EventSource | null>(null)
  const searchHistoryRef = useRef<SearchHierarchyNode[]>([])

  // ── SSE Stream for real-time Myca activity ──
  useEffect(() => {
    let es: EventSource | null = null

    const connectSSE = () => {
      try {
        es = new EventSource("/api/myca/activity/stream")
        eventSourceRef.current = es

        es.onopen = () => {
          setSseConnected(true)
          setError(null)
          setLoading(false)
        }

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "heartbeat") return

            const newEvent: ActivityEvent = {
              id: data.id || `sse-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: data.event_type || data.type || "agent",
              title: data.title || data.message || "Activity",
              summary: data.summary || data.detail,
              timestamp: data.timestamp || new Date().toISOString(),
              metadata: data.metadata,
              thinkingStep: data.thinking_step,
            }

            setEvents(prev => [newEvent, ...prev].slice(0, 50))
          } catch { /* ignore malformed messages */ }
        }

        es.addEventListener("thinking", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data)
            setEvents(prev => [{
              id: `think-${Date.now()}`,
              type: "thinking",
              title: "Myca is thinking...",
              summary: data.thought || data.message,
              timestamp: new Date().toISOString(),
              thinkingStep: data.step,
            }, ...prev].slice(0, 50))
          } catch { /* ignore */ }
        })

        es.addEventListener("learning", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data)
            setEvents(prev => [{
              id: `learn-${Date.now()}`,
              type: "learning",
              title: "Myca learned something",
              summary: data.insight || data.message,
              timestamp: new Date().toISOString(),
            }, ...prev].slice(0, 50))
          } catch { /* ignore */ }
        })

        es.addEventListener("discovery", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data)
            setEvents(prev => [{
              id: `disc-${Date.now()}`,
              type: "discovery",
              title: data.title || "New discovery",
              summary: data.summary || data.message,
              timestamp: new Date().toISOString(),
              metadata: data.metadata,
            }, ...prev].slice(0, 50))
          } catch { /* ignore */ }
        })

        es.onerror = () => {
          setSseConnected(false)
          // Auto-reconnect after 5s
          setTimeout(() => {
            if (eventSourceRef.current === es) {
              es?.close()
              connectSSE()
            }
          }, 5000)
        }
      } catch {
        setSseConnected(false)
        // Fall back to polling
        fetchActivity()
      }
    }

    connectSSE()

    return () => {
      es?.close()
      eventSourceRef.current = null
    }
  }, [])

  // ── Polling fallback for when SSE is unavailable ──
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

  // Polling fallback if SSE never connects
  useEffect(() => {
    if (sseConnected) return
    const timer = setTimeout(() => {
      if (!sseConnected) fetchActivity()
    }, 3000)
    return () => clearTimeout(timer)
  }, [sseConnected, fetchActivity])

  // ── Search hierarchy tracking ──
  // Listen for search route events from FluidSearchCanvas
  useEffect(() => {
    const unsub = ctx.on("search:route", (payload: {
      query: string
      classification: string
      primaryWidget: string
      intent: string
      useMycaLLM: boolean
      liveResultTypes: string[]
    }) => {
      if (!payload?.query) return

      // Add to search history with associations
      const prev = searchHistoryRef.current
      const associations = prev
        .slice(0, 5)
        .map(h => h.query)
        .filter(q => q !== payload.query)

      const node: SearchHierarchyNode = {
        query: payload.query,
        timestamp: new Date().toISOString(),
        associations,
        resultTypes: payload.liveResultTypes || [],
        mycaInsight: payload.useMycaLLM
          ? `Myca is reasoning about "${payload.query}" (${payload.classification})`
          : `Searching ${payload.intent}: "${payload.query}"`,
      }

      searchHistoryRef.current = [node, ...prev].slice(0, 20)
      setSearchHistory([...searchHistoryRef.current])

      // Add thinking event
      setEvents(prev => [{
        id: `search-${Date.now()}`,
        type: payload.useMycaLLM ? "thinking" : "search",
        title: payload.useMycaLLM
          ? `Reasoning: "${payload.query}"`
          : `Searching: "${payload.query}"`,
        summary: payload.useMycaLLM
          ? `Using Myca LLM to answer + fetching ${payload.intent} data`
          : `Primary widget: ${payload.primaryWidget} | Intent: ${payload.intent}`,
        timestamp: new Date().toISOString(),
        relatedSearches: associations,
        metadata: {
          classification: payload.classification,
          primaryWidget: payload.primaryWidget,
        },
      }, ...prev].slice(0, 50))
    })
    return unsub
  }, [ctx])

  // ── Listen for Myca's continuous self-prompting ──
  useEffect(() => {
    // Poll for consciousness status
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/myca/consciousness")
        if (res.ok) {
          const data = await res.json()
          if (data.is_conscious && data.current_thought) {
            setEvents(prev => {
              // Don't add duplicate thoughts
              if (prev[0]?.thinkingStep === data.current_thought) return prev
              return [{
                id: `conscious-${Date.now()}`,
                type: "thinking",
                title: "Myca's current thought",
                summary: data.current_thought,
                timestamp: new Date().toISOString(),
                thinkingStep: data.current_thought,
                metadata: { is_conscious: true, emotional_state: data.emotional_state },
              }, ...prev].slice(0, 50)
            })
          }
        }
      } catch { /* silent */ }
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const isActivityExpanded = expandedSection === "activity" || expandedSection === "both"
  const isSearchesExpanded = expandedSection === "searches" || expandedSection === "both"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-medium text-foreground/90">Myca Activity</h3>
        </div>
        <div className="flex items-center gap-1">
          {sseConnected && (
            <span className="flex items-center gap-1 text-[9px] text-green-500">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={fetchActivity}
            disabled={loading}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {error && (
            <div className="text-xs text-amber-500/90 py-2 px-2 rounded bg-amber-500/10">
              {error}
            </div>
          )}

          {/* ── Search Hierarchy Section ── */}
          {searchHistory.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setExpandedSection(isSearchesExpanded ? "activity" : "both")}
                className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 w-full hover:text-foreground transition-colors py-1"
              >
                {isSearchesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                <Search className="h-3 w-3 text-green-500" />
                Search Trail ({searchHistory.length})
              </button>

              {isSearchesExpanded && (
                <div className="space-y-1 mt-1">
                  {searchHistory.slice(0, 8).map((node, i) => (
                    <div
                      key={`${node.query}-${i}`}
                      className="pl-4 border-l-2 border-green-500/20 ml-1"
                    >
                      <div className="flex items-start gap-1.5 py-1">
                        <Search className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-foreground/90 truncate">
                            {node.query}
                          </p>
                          {node.mycaInsight && (
                            <p className="text-[10px] text-violet-400/80 truncate mt-0.5">
                              {node.mycaInsight}
                            </p>
                          )}
                          {node.associations.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Link2 className="h-2.5 w-2.5 text-muted-foreground/50" />
                              <span className="text-[9px] text-muted-foreground/70 truncate">
                                Related: {node.associations.slice(0, 3).join(", ")}
                              </span>
                            </div>
                          )}
                          <span className="text-[9px] text-muted-foreground/50">{formatTimeAgo(node.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Activity Stream Section ── */}
          <div>
            <button
              onClick={() => setExpandedSection(isActivityExpanded ? "searches" : "both")}
              className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 w-full hover:text-foreground transition-colors py-1"
            >
              {isActivityExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
              <Eye className="h-3 w-3 text-violet-500" />
              Myca Consciousness ({events.length})
            </button>

            {isActivityExpanded && (
              <div className="space-y-1 mt-1">
                {!loading && events.length === 0 && !error && (
                  <div className="text-xs text-muted-foreground py-4 text-center">
                    No activity yet. Start a search to see Myca think.
                  </div>
                )}
                {events.map((ev) => {
                  const consciousnessMeta = ev.metadata as { is_conscious?: boolean; emotional_state?: string } | undefined
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
                        <p className="text-[11px] font-medium text-foreground/90 truncate">{ev.title}</p>
                        {ev.summary && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{ev.summary}</p>
                        )}
                        {ev.relatedSearches && ev.relatedSearches.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Link2 className="h-2 w-2 text-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground/60 truncate">
                              {ev.relatedSearches.slice(0, 2).join(", ")}
                            </span>
                          </div>
                        )}
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{formatTimeAgo(ev.timestamp)}</p>
                      </div>
                      {ev.type === "consciousness" && (
                        <Badge
                          variant={isConscious ? "default" : "secondary"}
                          className="shrink-0 text-[9px] h-4"
                        >
                          {isConscious ? "Awake" : "Dormant"}
                        </Badge>
                      )}
                      {ev.type === "thinking" && (
                        <Badge variant="outline" className="shrink-0 text-[9px] h-4 border-yellow-500/30 text-yellow-400">
                          Thinking
                        </Badge>
                      )}
                      {ev.type === "learning" && (
                        <Badge variant="outline" className="shrink-0 text-[9px] h-4 border-cyan-500/30 text-cyan-400">
                          Learned
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
