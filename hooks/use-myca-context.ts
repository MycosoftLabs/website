/**
 * useMYCAContext - Track user interactions for MYCA intention system
 * Created: February 11, 2026
 * 
 * Tracks all user interactions (searches, clicks, focuses, voice commands)
 * and sends them to the MAS intention API for intelligent suggestions.
 */

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

// Session ID persists across tabs and reloads
function getSessionId(userId: string | null): string {
  if (typeof window === "undefined") return ""

  const storageKey = `myca_session_id:${userId || "anon"}`
  let sessionId = localStorage.getItem(storageKey)
  if (!sessionId) {
    sessionId = `myca_${userId || "anon"}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(storageKey, sessionId)
  }
  return sessionId
}

type EventType = "search" | "click" | "focus" | "note" | "voice" | "navigate" | "hover"

interface IntentionEvent {
  event_type: EventType
  data: Record<string, unknown>
  context?: {
    current_query?: string
    focused_widget?: string
    recent_interactions?: string[]
    [key: string]: unknown
  }
}

interface IntentionResponse {
  success: boolean
  session_id: string
  event_count: number
  suggested_widgets: string[]
  suggested_queries: string[]
  insights: Record<string, unknown>
}

interface SearchContext {
  current_query?: string
  focused_widget?: string
  recent_interactions?: string[]
}

interface UseMYCAContextReturn {
  /** Track a user interaction */
  track: (event: IntentionEvent) => Promise<void>
  /** Track a search event */
  trackSearch: (query: string, resultCount?: number, searchContext?: SearchContext) => Promise<void>
  /** Track a widget click/focus */
  trackWidgetFocus: (widgetType: string, itemId?: string, searchContext?: SearchContext) => Promise<void>
  /** Track a notepad addition */
  trackNotepadAdd: (itemType: string, title: string) => Promise<void>
  /** Track a voice command */
  trackVoice: (transcript: string) => Promise<void>
  /** Track navigation */
  trackNavigation: (from: string, to: string) => Promise<void>
  /** Get current suggestions */
  suggestions: {
    widgets: string[]
    queries: string[]
  }
  /** Session ID */
  sessionId: string
  /** Whether tracking is enabled */
  isEnabled: boolean
  /** Last error (if any) */
  error: string | null
}

export function useMYCAContext(options?: {
  enabled?: boolean
  debounceMs?: number
}): UseMYCAContextReturn {
  const { enabled = true, debounceMs = 100 } = options || {}
  const { user } = useAuth()
  const userId = user?.id || null
  const [sessionId, setSessionId] = useState("")

  const resolvedSessionId = useMemo(
    () => getSessionId(userId),
    [userId]
  )

  useEffect(() => {
    setSessionId(resolvedSessionId)
  }, [resolvedSessionId])
  const [suggestions, setSuggestions] = useState<{ widgets: string[]; queries: string[] }>({
    widgets: [],
    queries: [],
  })
  const [error, setError] = useState<string | null>(null)
  
  // Debounce queue to batch rapid events
  const queueRef = useRef<IntentionEvent[]>([])
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || !enabled) return
    
    const events = [...queueRef.current]
    queueRef.current = []
    
    try {
      // Send each event (could be batched in future)
      for (const event of events) {
        const response = await fetch("/api/myca/intention", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId || "anonymous",
            ...event,
            timestamp: new Date().toISOString(),
          }),
        })
        
        if (response.ok) {
          const data: IntentionResponse = await response.json()
          if (data.suggested_widgets.length > 0 || data.suggested_queries.length > 0) {
            setSuggestions({
              widgets: data.suggested_widgets,
              queries: data.suggested_queries,
            })
          }
          setError(null)
        }
      }
    } catch (err) {
      // Silent fail - intention tracking is non-critical
      setError(err instanceof Error ? err.message : "Tracking failed")
    }
  }, [enabled, sessionId, userId])
  
  const track = useCallback(async (event: IntentionEvent) => {
    if (!enabled) return
    
    queueRef.current.push(event)
    
    // Debounce
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
    }
    flushTimeoutRef.current = setTimeout(flushQueue, debounceMs)
  }, [enabled, debounceMs, flushQueue])
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current)
      }
    }
  }, [])
  
  // Convenience methods
  const trackSearch = useCallback(
    async (query: string, resultCount?: number, searchContext?: SearchContext) => {
      await track({
        event_type: "search",
        data: { query, result_count: resultCount },
        context: { source: "search_input", ...searchContext },
      })
    },
    [track]
  )

  const trackWidgetFocus = useCallback(
    async (widgetType: string, itemId?: string, searchContext?: SearchContext) => {
      await track({
        event_type: "focus",
        data: { widget_type: widgetType, item_id: itemId },
        context: { source: "widget_interaction", focused_widget: widgetType, ...searchContext },
      })
    },
    [track]
  )
  
  const trackNotepadAdd = useCallback(async (itemType: string, title: string) => {
    await track({
      event_type: "note",
      data: { item_type: itemType, title },
      context: { source: "notepad" },
    })
  }, [track])
  
  const trackVoice = useCallback(async (transcript: string) => {
    await track({
      event_type: "voice",
      data: { transcript },
      context: { source: "personaplex" },
    })
  }, [track])
  
  const trackNavigation = useCallback(async (from: string, to: string) => {
    await track({
      event_type: "navigate",
      data: { from_path: from, to_path: to },
      context: { source: "navigation" },
    })
  }, [track])
  
  return {
    track,
    trackSearch,
    trackWidgetFocus,
    trackNotepadAdd,
    trackVoice,
    trackNavigation,
    suggestions,
    sessionId,
    isEnabled: enabled,
    error,
  }
}

export default useMYCAContext
