"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"

export interface MYCAMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  agent?: string
  audio_base64?: string
  requires_confirmation?: boolean
  confirmation_id?: string
  nlqData?: Array<{ id: string; type: string; title: string; subtitle?: string }>
  nlqActions?: Array<{ id: string; label: string; endpoint: string; method: string }>
  nlqSources?: Array<{ name: string; type: string }>
  metadata?: Record<string, unknown>
}

export interface MYCAConsciousnessState {
  state?: string
  is_conscious?: boolean
  emotions?: Record<string, number>
  emotional_state?: {
    dominant_emotion: string
    emotions: Record<string, number>
  }
  world_updates?: number
}

export interface MYCAGroundingState {
  is_grounded: boolean
  ep_id: string | null
  thought_count: number
  enabled: boolean
}

export interface MYCASendOptions {
  contextText?: string
  context?: Record<string, unknown>
  wantAudio?: boolean
  actor?: string
  source?: "web" | "personaplex" | "web-speech" | "api"
}

export interface MYCASearchAction {
  type: "search" | "focus_widget" | "expand_widget" | "add_to_notepad" | "clear_search"
  query?: string
  widget?: "species" | "chemistry" | "genetics" | "research" | "ai"
  id?: string
  item?: Record<string, unknown>
}

/** CREP map command from MAS (voice/autonomy) - matches FrontendCommand in map-websocket-client */
export interface MYCACREPAction {
  type: string
  center?: [number, number]
  zoom?: number
  delta?: number
  offset?: [number, number]
  layer?: string
  duration?: number
  filterType?: string
  filterValue?: string
  model?: string
  lead_time?: number
  entity?: string
  time?: string
  query?: string
  [key: string]: unknown
}

export interface MYCALastResponseMetadata {
  agent?: string
  routed_to?: string
}

export interface MYCADraftActivity {
  length: number
  version: number
}

export interface MYCAContextValue {
  sessionId: string
  userId: string | null
  conversationId: string | null
  setConversationId: (id: string | null) => void
  messages: MYCAMessage[]
  isLoading: boolean
  lastResponseMetadata: MYCALastResponseMetadata | null
  draftActivity: MYCADraftActivity
  setDraftActivity: (length: number) => void
  memoryEnabled: boolean
  setMemoryEnabled: (enabled: boolean) => void
  pendingConfirmationId: string | null
  sendMessage: (text: string, options?: MYCASendOptions) => Promise<void>
  confirmAction: (transcript: string) => Promise<void>
  clearMessages: () => void
  loadConversation: (conversationId: string) => Promise<void>
  restoreFromMAS: () => Promise<void>
  syncToMAS: () => Promise<void>
  executeSearchAction: (action: MYCASearchAction) => void
  executeCREPAction: (command: MYCACREPAction) => void
  consciousness: MYCAConsciousnessState | null
  grounding: MYCAGroundingState | null
  isActive: boolean
  setIsActive: (active: boolean) => void
}

const MYCAContext = createContext<MYCAContextValue | null>(null)

const SESSION_KEY_PREFIX = "myca_session_id"
const CONVERSATION_KEY_PREFIX = "myca_conversation_id"
const MESSAGES_KEY_PREFIX = "myca_messages"

function buildStorageKey(prefix: string, userId: string | null) {
  return `${prefix}:${userId || "anon"}`
}

function generateSessionId(userId: string | null) {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `myca_${userId || "anon"}_${Date.now()}_${suffix}`
}

function clearAnonymousMYCAStorage() {
  if (typeof window === "undefined") return
  localStorage.removeItem(buildStorageKey(SESSION_KEY_PREFIX, null))
  localStorage.removeItem(buildStorageKey(CONVERSATION_KEY_PREFIX, null))
  localStorage.removeItem(buildStorageKey(MESSAGES_KEY_PREFIX, null))
}

function normalizeMessages(rawMessages: Array<Record<string, any>>): MYCAMessage[] {
  return rawMessages.map((msg) => ({
    id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: msg.role || msg.type || "assistant",
    content: msg.content || msg.message || msg.text || "",
    timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
    agent: msg.agent || msg.agent_id || msg.agentName,
    metadata: msg.metadata,
  }))
}

export function MYCAProvider({
  children,
  initialConsciousnessActive = false,
}: {
  children: React.ReactNode
  initialConsciousnessActive?: boolean
}) {
  const { user } = useAuth()
  const userId = user?.id || null
  const userRole = user?.role || null

  const [sessionId, setSessionId] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MYCAMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null)
  const [consciousness, setConsciousness] = useState<MYCAConsciousnessState | null>(null)
  const [grounding, setGrounding] = useState<MYCAGroundingState | null>(null)
  const [isUserActive, setIsUserActive] = useState(false)
  const isActive = initialConsciousnessActive || isUserActive
  const [lastResponseMetadata, setLastResponseMetadata] = useState<MYCALastResponseMetadata | null>(null)
  const [draftActivity, setDraftActivityState] = useState<MYCADraftActivity>({ length: 0, version: 0 })
  const hasInitializedRef = useRef(false)
  const activeRequestRef = useRef<AbortController | null>(null)

  const setDraftActivity = useCallback((length: number) => {
    const safeLength = Math.max(0, Math.min(2000, Math.floor(length || 0)))
    setDraftActivityState((prev) => ({
      length: safeLength,
      version: safeLength === prev.length ? prev.version : prev.version + 1,
    }))
  }, [])

  const executeSearchAction = useCallback((action: MYCASearchAction) => {
    if (typeof window === "undefined") return
    if (!action || !action.type) return
    window.dispatchEvent(new CustomEvent("myca-search-action", { detail: action }))
  }, [])

  const executeCREPAction = useCallback((command: MYCACREPAction) => {
    if (typeof window === "undefined") return
    if (!command || !command.type) return
    window.dispatchEvent(new CustomEvent("myca-crep-action", { detail: command }))
  }, [])

  const abortActiveRequest = useCallback(() => {
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
    setIsLoading(false)
  }, [])

  const resetAnonymousConversation = useCallback(() => {
    if (userId) return
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
    clearAnonymousMYCAStorage()
    setIsLoading(false)
    setConversationId(null)
    setMessages([])
    setLastResponseMetadata(null)
    setPendingConfirmationId(null)
    setDraftActivityState({ length: 0, version: 0 })
  }, [userId])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.addEventListener("myca-home-demo-close", abortActiveRequest)
    window.addEventListener("myca-home-demo-reset", resetAnonymousConversation)
    return () => {
      window.removeEventListener("myca-home-demo-close", abortActiveRequest)
      window.removeEventListener("myca-home-demo-reset", resetAnonymousConversation)
      abortActiveRequest()
    }
  }, [abortActiveRequest, resetAnonymousConversation])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!userId) {
      clearAnonymousMYCAStorage()
      setSessionId(generateSessionId(null))
      setConversationId(null)
      setMessages([])
      setMemoryEnabled(false)
      setLastResponseMetadata(null)
      setDraftActivityState({ length: 0, version: 0 })
      hasInitializedRef.current = true
      return
    }

    setMemoryEnabled(true)
    const sessionKey = buildStorageKey(SESSION_KEY_PREFIX, userId)
    const conversationKey = buildStorageKey(CONVERSATION_KEY_PREFIX, userId)
    const messagesKey = buildStorageKey(MESSAGES_KEY_PREFIX, userId)
    const storedSession = localStorage.getItem(sessionKey)
    const storedConversation = localStorage.getItem(conversationKey)
    const storedMessages = localStorage.getItem(messagesKey)
    const resolvedSession = storedSession || generateSessionId(userId)

    if (!storedSession) localStorage.setItem(sessionKey, resolvedSession)
    setSessionId(resolvedSession)

    if (storedConversation) setConversationId(storedConversation)
    if (storedMessages) {
      const parsedMessages = JSON.parse(storedMessages) as MYCAMessage[]
      setMessages((prev) => (prev.length === 0 ? parsedMessages : prev))
    }
    hasInitializedRef.current = true
  }, [userId])

  useEffect(() => {
    if (!conversationId || !userId || typeof window === "undefined") return
    const conversationKey = buildStorageKey(CONVERSATION_KEY_PREFIX, userId)
    localStorage.setItem(conversationKey, conversationId)
  }, [conversationId, userId])

  const appendMessage = useCallback((message: MYCAMessage) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const storeMemory = useCallback(
    async (message: MYCAMessage) => {
      if (!memoryEnabled || !sessionId || !userId) return
      try {
        // Apr 23, 2026 audit: was `fetch()` without timeout. If MAS
        // restarts mid-session, every user message would block the
        // memory-store call forever. 5 s hard deadline; memory is
        // best-effort so dropping a slow-write is fine.
        await fetchWithTimeout("/api/mas/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            message: message.content,
            role: message.role,
            agent: message.agent,
            context: {
              conversation_id: conversationId,
              ...message.metadata,
            },
          }),
          timeoutMs: 5_000,
        })
      } catch (error) {
        console.error("Failed to store MYCA memory:", error)
      }
    },
    [conversationId, memoryEnabled, sessionId, userId]
  )

  const sendMessage = useCallback(
    async (text: string, options?: MYCASendOptions) => {
      if (!text.trim()) return
      const timestamp = new Date().toISOString()
      const userMessage: MYCAMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content: text,
        timestamp,
      }
      appendMessage(userMessage)
      setIsUserActive(true)
      setDraftActivity(0)
      setIsLoading(true)

      const contextText = options?.contextText?.trim()
      const requestMessage = contextText ? `${contextText}\n\n${text}` : text
      activeRequestRef.current?.abort()
      const requestController = new AbortController()
      activeRequestRef.current = requestController
      const timeoutId = window.setTimeout(() => requestController.abort(), 180_000)

      try {
        const response = await fetch("/api/mas/voice/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: requestController.signal,
          body: JSON.stringify({
            message: requestMessage,
            user_id: userId || undefined,
            user_role: userRole || undefined,
            conversation_id: userId ? conversationId || undefined : undefined,
            session_id: userId ? sessionId || undefined : undefined,
            want_audio: options?.wantAudio ?? false,
            actor: options?.actor || "user",
            source: options?.source || "web",
            context: {
              ...(options?.context || {}),
              ...(!userId
                ? {
                    include_memory_context: false,
                    isolate_from_chat_memory: true,
                    platform: "myca-anonymous-live-demo",
                    anonymous_session: true,
                  }
                : {}),
              ...(userId ? { user_id: userId } : {}),
            },
          }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok && !data.response_text) {
          throw new Error(data.error || data.message || `MYCA request failed with HTTP ${response.status}`)
        }
        const nextConversationId = userId ? data.conversation_id || conversationId || `conv-${Date.now()}` : null
        if (userId && nextConversationId && nextConversationId !== conversationId) {
          setConversationId(nextConversationId)
        }

        const assistantMessage: MYCAMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: data.response_text || "No response from MYCA.",
          timestamp: new Date().toISOString(),
          agent: data.agent,
          audio_base64: data.audio_base64,
          requires_confirmation: data.requires_confirmation,
          confirmation_id: userId ? data.conversation_id : undefined,
          nlqData: data.nlq_data,
          nlqActions: data.nlq_actions,
          nlqSources: data.nlq_sources,
          metadata: {
            routed_to: data.routed_to,
          },
        }

        appendMessage(assistantMessage)
        setLastResponseMetadata({
          agent: data.agent,
          routed_to: data.routed_to,
        })

        const actionList = Array.isArray(data.search_actions)
          ? data.search_actions
          : Array.isArray(data.actions)
            ? data.actions
            : []
        actionList.forEach((action: MYCASearchAction) => executeSearchAction(action))

        const frontendCommand = data.frontend_command
        if (frontendCommand && typeof frontendCommand === "object" && frontendCommand.type) {
          executeCREPAction(frontendCommand)
        }

        if (assistantMessage.requires_confirmation) {
          setPendingConfirmationId(assistantMessage.confirmation_id || nextConversationId)
        } else {
          setPendingConfirmationId(null)
        }

        if (userId && memoryEnabled) {
          await Promise.all([storeMemory(userMessage), storeMemory(assistantMessage)])
        }
      } catch (error) {
        if (requestController.signal.aborted && activeRequestRef.current !== requestController) return
        const errMsg = error instanceof Error ? error.message : "Unknown error"
        const isAbort = error instanceof Error && error.name === "AbortError"
        const isTimeout = isAbort || /abort|timeout/i.test(errMsg)
        const isNetwork = /fetch|network|failed to fetch|timeout/i.test(errMsg)
        appendMessage({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: isTimeout
            ? "MYCA is taking longer than expected to respond. Please try again in a moment."
            : isNetwork
            ? "MYCA is temporarily unable to connect. Please try again shortly."
            : `MYCA is briefly unavailable. Please try again in a moment.`,
          timestamp: new Date().toISOString(),
          agent: "myca-orchestrator",
        })
        console.error("MYCA sendMessage error:", error)
      } finally {
        window.clearTimeout(timeoutId)
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null
          setIsLoading(false)
        }
      }
    },
    [appendMessage, conversationId, executeSearchAction, executeCREPAction, memoryEnabled, sessionId, setDraftActivity, storeMemory, userId, userRole]
  )

  const confirmAction = useCallback(
    async (transcript: string) => {
      if (!pendingConfirmationId) return
      try {
        // Apr 23, 2026 audit: was `fetch()` without timeout. If MAS is
        // slow, the voice-confirm modal would hang with no recovery.
        // 10 s deadline → user can retry.
        const response = await fetchWithTimeout("/api/mas/voice/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: pendingConfirmationId,
            actor: "user",
            transcript,
          }),
          timeoutMs: 10_000,
        })

        const data = await response.json()
        appendMessage({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: data.message || "Confirmation received.",
          timestamp: new Date().toISOString(),
          agent: "myca-orchestrator",
        })
        setPendingConfirmationId(null)
      } catch (error) {
        console.error("MYCA confirmation error:", error)
        appendMessage({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: "Unable to confirm the action right now. Please try again.",
          timestamp: new Date().toISOString(),
          agent: "myca-orchestrator",
        })
      }
    },
    [appendMessage, pendingConfirmationId]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setPendingConfirmationId(null)
    setLastResponseMetadata(null)
    setDraftActivity(0)
    if (typeof window !== "undefined") {
      const conversationKey = buildStorageKey(CONVERSATION_KEY_PREFIX, userId)
      const messagesKey = buildStorageKey(MESSAGES_KEY_PREFIX, userId)
      localStorage.removeItem(conversationKey)
      localStorage.removeItem(messagesKey)
    }
  }, [setDraftActivity, userId])

  const loadConversation = useCallback(
    async (targetConversationId: string) => {
      if (!targetConversationId || !userId) return
      try {
        // Apr 23, 2026 audit: conversation loader had no timeout. The
        // "Load conversation" menu would hang silently when MAS is busy.
        // 15 s deadline — slightly above typical cold MAS latency to reduce
        // console abort noise; still bounded so the UI never hangs forever.
        const response = await fetchWithTimeout("/api/myca/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: targetConversationId }),
          timeoutMs: 15_000,
        })
        if (!response.ok) return
        const data = await response.json()
        const nextMessages = normalizeMessages(data.messages || [])
        if (nextMessages.length > 0) {
          setMessages(nextMessages)
        } else if (typeof window !== "undefined") {
          const localKey = buildStorageKey(MESSAGES_KEY_PREFIX, userId)
          const stored = localStorage.getItem(localKey)
          if (stored) {
            setMessages(JSON.parse(stored) as MYCAMessage[])
          }
        }
        setConversationId(targetConversationId)
      } catch (error) {
        console.error("Failed to load MYCA conversation:", error)
        if (typeof window !== "undefined") {
          const localKey = buildStorageKey(MESSAGES_KEY_PREFIX, userId)
          const stored = localStorage.getItem(localKey)
          if (stored) {
            setMessages(JSON.parse(stored) as MYCAMessage[])
          }
        }
      }
    },
    [userId]
  )

  const restoreFromMAS = useCallback(async () => {
    if (conversationId) {
      await loadConversation(conversationId)
    }
  }, [conversationId, loadConversation])

  const syncToMAS = useCallback(async () => {
    if (!sessionId || !userId || messages.length === 0) return
    try {
      // Apr 23, 2026 audit: MAS sync had no timeout. Best-effort write
      // so a 10 s cap is fine — if MAS is down the messages persist in
      // localStorage anyway.
      await fetchWithTimeout("/api/myca/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          conversation_id: conversationId,
          messages,
        }),
        timeoutMs: 10_000,
      })
    } catch (error) {
      console.error("Failed to sync MYCA messages:", error)
    }
  }, [conversationId, messages, sessionId, userId])

  useEffect(() => {
    if (!hasInitializedRef.current) return
    if (conversationId) loadConversation(conversationId)
  }, [conversationId, loadConversation])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!userId || messages.length === 0) return
    const localKey = buildStorageKey(MESSAGES_KEY_PREFIX, userId)
    const trimmed = messages.slice(-200)
    localStorage.setItem(localKey, JSON.stringify(trimmed))
  }, [messages, userId])

  useEffect(() => {
    if (!isActive) return
    let mounted = true
    const fetchConsciousness = async () => {
      try {
        const params = new URLSearchParams()
        if (userId) params.set("user_id", userId)
        if (sessionId) params.set("session_id", sessionId)
        if (conversationId) params.set("conversation_id", conversationId)
        const response = await fetch(`/api/myca/consciousness/status?${params.toString()}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        })
        if (!response.ok) return
        const data = await response.json()
        if (mounted) setConsciousness(data)
      } catch {
        if (mounted) setConsciousness(null)
      }
    }
    fetchConsciousness()
    const interval = setInterval(fetchConsciousness, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [conversationId, isActive, sessionId, userId])

  useEffect(() => {
    if (!isActive) return
    let mounted = true
    const fetchGrounding = async () => {
      try {
        const response = await fetch("/api/myca/grounding/status", {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) return
        const data = await response.json()
        if (mounted) {
          setGrounding({
            is_grounded: Boolean(data.enabled && data.last_ep_id && (data.thought_count ?? 0) > 0),
            ep_id: data.last_ep_id ?? null,
            thought_count: data.thought_count ?? 0,
            enabled: data.enabled ?? false,
          })
        }
      } catch {
        if (mounted) setGrounding(null)
      }
    }
    fetchGrounding()
    const interval = setInterval(fetchGrounding, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isActive])

  const value = useMemo(
    () => ({
      sessionId,
      userId,
      conversationId,
      setConversationId,
      messages,
      isLoading,
      memoryEnabled,
      setMemoryEnabled,
      draftActivity,
      setDraftActivity,
      pendingConfirmationId,
      sendMessage,
      confirmAction,
      clearMessages,
      loadConversation,
      restoreFromMAS,
      syncToMAS,
      executeSearchAction,
      executeCREPAction,
      consciousness,
      grounding,
      lastResponseMetadata,
      isActive,
      setIsActive: setIsUserActive,
    }),
    [
      sessionId,
      userId,
      conversationId,
      messages,
      isLoading,
      memoryEnabled,
      draftActivity,
      setDraftActivity,
      pendingConfirmationId,
      sendMessage,
      confirmAction,
      clearMessages,
      loadConversation,
      restoreFromMAS,
      syncToMAS,
      executeSearchAction,
      executeCREPAction,
      consciousness,
      grounding,
      lastResponseMetadata,
      isActive,
    ]
  )

  return <MYCAContext.Provider value={value}>{children}</MYCAContext.Provider>
}

export function useMYCA() {
  const context = useContext(MYCAContext)
  if (!context) {
    throw new Error("useMYCA must be used within MYCAProvider")
  }
  return context
}

/** Optional MYCA context — returns null if not within MYCAProvider. Use for conditional widgets. */
export function useOptionalMYCA(): MYCAContextValue | null {
  return useContext(MYCAContext)
}
