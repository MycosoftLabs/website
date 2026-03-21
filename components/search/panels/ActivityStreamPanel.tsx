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
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
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
              type: (data.event_type || data.type || "agent") as ActivityEvent["type"],
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
              type: "thinking" as ActivityEvent["type"],
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
              type: "learning" as ActivityEvent["type"],
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
              type: "discovery" as ActivityEvent["type"],
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
        type: (payload.useMycaLLM ? "thinking" : "search") as ActivityEvent["type"],
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
                type: "thinking" as ActivityEvent["type"],
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

  const [showDropdown, setShowDropdown] = useState(false)
  const latestEvent = events[0] || null

  return (
    <div className="flex flex-col w-full relative z-[50]">
      {/* Banner */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-violet-500/10 to-transparent border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="flex items-center gap-3 w-full">
          <Brain className="h-4 w-4 text-violet-500 animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-white/90 truncate">
              {latestEvent ? latestEvent.title : "Myca is idling..."}
            </span>
            {latestEvent?.summary && (
              <span className="text-[10px] text-white/50 truncate">
                {latestEvent.summary}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sseConnected && (
              <span className="flex items-center gap-1 text-[9px] text-green-500 mr-2">
                <Radio className="h-2 w-2 animate-pulse" /> Live
              </span>
            )}
            <ChevronDown className={cn("h-4 w-4 text-white/50 transition-transform duration-200", showDropdown && "rotate-180")} />
          </div>
        </div>
      </div>

      {/* Dropdown container */}
      <div className="absolute top-full left-0 right-0 overflow-hidden shadow-2xl">
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-white/5 bg-black/80 backdrop-blur-xl"
          >
            <ScrollArea className="max-h-[350px]">
              <div className="p-3 space-y-4">
                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                      <Search className="w-3 h-3" />
                      Search Hierarchy
                    </h4>
                    <div className="space-y-1.5 pl-2 border-l-2 border-green-500/20">
                      {searchHistory.slice(0, 5).map((node, i) => (
                        <div key={i} className="flex flex-col">
                          <span className="text-[11px] font-medium text-foreground/80">{node.query}</span>
                          {node.associations.length > 0 && (
                            <span className="text-[9px] text-muted-foreground/50 truncate">
                              Related: {node.associations.join(", ")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Stream */}
                <div>
                  <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                    <Zap className="w-3 h-3" />
                    Consciousness Trail
                  </h4>
                  <div className="space-y-1.5">
                    {events.slice(0, 20).map((ev) => (
                      <div key={ev.id} className="flex gap-2 p-1.5 rounded-md hover:bg-white/5 transition-colors">
                        <div className="mt-0.5 shrink-0"><EventIcon type={ev.type} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground/80 truncate">{ev.title}</p>
                          {ev.summary && <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{ev.summary}</p>}
                        </div>
                        <span className="text-[9px] text-muted-foreground/40 shrink-0">{formatTimeAgo(ev.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
