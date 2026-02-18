/**
 * SearchContextProvider - Feb 2026
 *
 * Shared state for the entire search page:
 * - Current query, results, focused species/compound
 * - Widget visibility and layout state
 * - MYCA chat history
 * - Notepad contents
 * - Live results data
 * - Event bus for cross-widget communication
 */

"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react"
import type {
  SpeciesResult,
  CompoundResult,
  GeneticsResult,
  ResearchResult,
  UnifiedSearchResponse,
} from "@/lib/search/unified-search-sdk"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WidgetFocusTarget =
  | { type: "species"; id?: string }
  | { type: "chemistry"; id?: string }
  | { type: "genetics"; id?: string }
  | { type: "research"; id?: string }
  | { type: "ai" }

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  context?: string
}

export interface NotepadItem {
  id: string
  type: "species" | "compound" | "genetics" | "research" | "ai" | "note" | "news"
  title: string
  content: string
  timestamp: number
  source?: string
  /** The search query that was active when this item was saved */
  searchQuery?: string
  /** The specific item ID to focus when restoring */
  focusedItemId?: string
  /**
   * Raw article / paper data for re-opening the in-app reading modal.
   * For news: NewsResult shape. For research: ResearchResult shape.
   */
  meta?: Record<string, unknown>
}

export interface LiveObservation {
  id: string
  species: string
  location: string
  date: string
  photoUrl?: string
  lat?: number
  lng?: number
}

type EventHandler = (payload: any) => void

interface SearchContextValue {
  // Query state
  query: string
  setQuery: (q: string) => void

  // Results
  results: UnifiedSearchResponse | null
  setResults: (r: UnifiedSearchResponse | null) => void
  species: SpeciesResult[]
  compounds: CompoundResult[]
  genetics: GeneticsResult[]
  research: ResearchResult[]
  aiAnswer: UnifiedSearchResponse["aiAnswer"] | undefined

  // Focus
  focusedSpeciesId: string | null
  setFocusedSpeciesId: (id: string | null) => void
  focusedCompoundId: string | null
  setFocusedCompoundId: (id: string | null) => void

  // Widget focus (scroll-to / highlight)
  focusWidget: (target: WidgetFocusTarget) => void
  widgetFocusTarget: WidgetFocusTarget | null

  // MYCA Chat
  chatMessages: ChatMessage[]
  addChatMessage: (role: ChatMessage["role"], content: string, context?: string) => void
  clearChat: () => void

  // Notepad
  notepadItems: NotepadItem[]
  addNotepadItem: (item: Omit<NotepadItem, "id" | "timestamp">) => void
  removeNotepadItem: (id: string) => void
  clearNotepad: () => void

  // Live results
  liveObservations: LiveObservation[]
  setLiveObservations: (obs: LiveObservation[]) => void
  userLocation: { lat: number; lng: number } | null
  setUserLocation: (loc: { lat: number; lng: number } | null) => void

  // Panel visibility
  leftPanelOpen: boolean
  setLeftPanelOpen: (open: boolean) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void

  // Voice (canvas drives; panel can request start/stop)
  voiceListening: boolean
  setVoiceListening: (v: boolean) => void

  // Event bus
  on: (event: string, handler: EventHandler) => () => void
  emit: (event: string, payload?: any) => void

  // Loading
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const NOTEPAD_STORAGE_KEY = "search-notepad"
const CHAT_STORAGE_KEY = "search-chat-history"

export function SearchContextProvider({ children }: { children: ReactNode }) {
  // Track if we're mounted (client-side)
  const [mounted, setMounted] = useState(false)
  
  // Query
  const [query, setQuery] = useState("")

  // Results
  const [results, setResults] = useState<UnifiedSearchResponse | null>(null)
  const species = results?.results?.species ?? []
  const compounds = results?.results?.compounds ?? []
  const genetics = results?.results?.genetics ?? []
  const research = results?.results?.research ?? []
  const aiAnswer = results?.aiAnswer

  // Focus
  const [focusedSpeciesId, setFocusedSpeciesId] = useState<string | null>(null)
  const [focusedCompoundId, setFocusedCompoundId] = useState<string | null>(null)
  const [widgetFocusTarget, setWidgetFocusTarget] = useState<WidgetFocusTarget | null>(null)

  const focusWidget = useCallback((target: WidgetFocusTarget) => {
    setWidgetFocusTarget(target)
    // Auto-clear after widgets have had a chance to react
    setTimeout(() => setWidgetFocusTarget(null), 500)
  }, [])

  // MYCA Chat - start empty, hydrate from storage after mount
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  // Hydrate chat from sessionStorage after mount
  useEffect(() => {
    setMounted(true)
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) {
        setChatMessages(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const addChatMessage = useCallback(
    (role: ChatMessage["role"], content: string, context?: string) => {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        content,
        timestamp: Date.now(),
        context,
      }
      setChatMessages((prev) => {
        const next = [...prev, msg]
        try {
          sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next.slice(-100)))
        } catch {}
        return next
      })
    },
    []
  )

  const clearChat = useCallback(() => {
    setChatMessages([])
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY)
    } catch {}
  }, [])

  // Notepad - start empty, hydrate from storage after mount
  const [notepadItems, setNotepadItems] = useState<NotepadItem[]>([])

  // Hydrate notepad from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTEPAD_STORAGE_KEY)
      if (saved) {
        setNotepadItems(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const addNotepadItem = useCallback(
    (item: Omit<NotepadItem, "id" | "timestamp">) => {
      const newItem: NotepadItem = {
        ...item,
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      }
      setNotepadItems((prev) => {
        const next = [newItem, ...prev]
        try {
          localStorage.setItem(NOTEPAD_STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    []
  )

  const removeNotepadItem = useCallback((id: string) => {
    setNotepadItems((prev) => {
      const next = prev.filter((n) => n.id !== id)
      try {
        localStorage.setItem(NOTEPAD_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const clearNotepad = useCallback(() => {
    setNotepadItems([])
    try {
      localStorage.removeItem(NOTEPAD_STORAGE_KEY)
    } catch {}
  }, [])

  // Live results
  const [liveObservations, setLiveObservations] = useState<LiveObservation[]>([])
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)

  // Panel visibility - start closed on mobile, open on desktop (defer to client)
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  // Voice listening state (driven by FluidSearchCanvas; panel can request via emit)
  const [voiceListening, setVoiceListening] = useState(false)
  
  // Set panel defaults based on screen size after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDesktop = window.innerWidth >= 1024
      setLeftPanelOpen(isDesktop)
      setRightPanelOpen(isDesktop)
    }
  }, [])

  // Event bus
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map())

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set())
    }
    listenersRef.current.get(event)!.add(handler)
    return () => {
      listenersRef.current.get(event)?.delete(handler)
    }
  }, [])

  const emit = useCallback((event: string, payload?: any) => {
    listenersRef.current.get(event)?.forEach((handler) => {
      try {
        handler(payload)
      } catch (e) {
        console.error(`Event handler error for "${event}":`, e)
      }
    })
  }, [])

  // Loading
  const [isLoading, setIsLoading] = useState(false)

  // Auto-summarize searches in chat
  useEffect(() => {
    if (!results || !query) return
    const total = species.length + compounds.length + genetics.length + research.length
    if (total === 0) return
    const parts: string[] = []
    if (species.length) parts.push(`${species.length} species`)
    if (compounds.length) parts.push(`${compounds.length} compounds`)
    if (genetics.length) parts.push(`${genetics.length} sequences`)
    if (research.length) parts.push(`${research.length} papers`)
    addChatMessage(
      "system",
      `Searched "${query}" -- found ${parts.join(", ")}.`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  const value: SearchContextValue = {
    query,
    setQuery,
    results,
    setResults,
    species,
    compounds,
    genetics,
    research,
    aiAnswer,
    focusedSpeciesId,
    setFocusedSpeciesId,
    focusedCompoundId,
    setFocusedCompoundId,
    focusWidget,
    widgetFocusTarget,
    chatMessages,
    addChatMessage,
    clearChat,
    notepadItems,
    addNotepadItem,
    removeNotepadItem,
    clearNotepad,
    liveObservations,
    setLiveObservations,
    userLocation,
    setUserLocation,
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
    voiceListening,
    setVoiceListening,
    on,
    emit,
    isLoading,
    setIsLoading,
  }

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSearchContext() {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error("useSearchContext must be used within SearchContextProvider")
  }
  return ctx
}
