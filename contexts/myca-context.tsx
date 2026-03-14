"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

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

export interface MYCAContextValue {
  sessionId: string
  userId: string | null
  conversationId: string | null
  setConversationId: (id: string | null) => void
  messages: MYCAMessage[]
  isLoading: boolean
  lastResponseMetadata: MYCALastResponseMetadata | null
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
  const hasInitializedRef = useRef(false)

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

  useEffect(() => {
    if (typeof window === "undefined") return
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
    if (storedMessages && messages.length === 0) {
      setMessages(JSON.parse(storedMessages) as MYCAMessage[])
    }
    hasInitializedRef.current = true
  }, [userId, messages.length])

  useEffect(() => {
    if (!conversationId || typeof window === "undefined") return
    const conversationKey = buildStorageKey(CONVERSATION_KEY_PREFIX, userId)
    localStorage.setItem(conversationKey, conversationId)
  }, [conversationId, userId])

  const appendMessage = useCallback((message: MYCAMessage) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const storeMemory = useCallback(
    async (message: MYCAMessage) => {
      if (!memoryEnabled || !sessionId) return
      try {
        await fetch("/api/mas/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId || "anonymous",
            message: message.content,
            role: message.role,
            agent: message.agent,
            context: {
              conversation_id: conversationId,
              ...message.metadata,
            },
          }),
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
      setIsLoading(true)

      const contextText = options?.contextText?.trim()
      const requestMessage = contextText ? `${contextText}\n\n${text}` : text

      try {
        const timeoutMs = 180_000
        const timeoutSignal =
          typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(timeoutMs)
            : (() => {
                const c = new AbortController()
                setTimeout(() => c.abort(new DOMException("Request timeout", "TimeoutError")), timeoutMs)
                return c.signal
              })()

        const response = await fetch("/api/mas/voice/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: timeoutSignal,
          body: JSON.stringify({
            message: requestMessage,
            user_id: userId || undefined,
            user_role: userRole || undefined,
            conversation_id: conversationId || undefined,
            session_id: sessionId || undefined,
            want_audio: options?.wantAudio ?? false,
            actor: options?.actor || "user",
            source: options?.source || "web",
            context: {
              ...(options?.context || {}),
              user_id: userId || "anonymous",
            },
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errMsg = "Failed to reach MYCA"
          try {
            const errJson = JSON.parse(errorText)
            errMsg = errJson.error || errJson.message || errMsg
          } catch {
            if (errorText) errMsg = errorText.slice(0, 200)
          }
          throw new Error(errMsg)
        }

        const data = await response.json()
        const nextConversationId = data.conversation_id || conversationId || `conv-${Date.now()}`
        if (nextConversationId && nextConversationId !== conversationId) {
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
          confirmation_id: data.conversation_id,
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

        if (memoryEnabled) {
          await Promise.all([storeMemory(userMessage), storeMemory(assistantMessage)])
        }
      } catch (error) {
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
        setIsLoading(false)
      }
    },
    [appendMessage, conversationId, executeSearchAction, executeCREPAction, memoryEnabled, sessionId, storeMemory, userId, userRole]
  )

  const confirmAction = useCallback(
    async (transcript: string) => {
      if (!pendingConfirmationId) return
      try {
        const response = await fetch("/api/mas/voice/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: pendingConfirmationId,
            actor: "user",
            transcript,
          }),
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
    if (typeof window !== "undefined") {
      const conversationKey = buildStorageKey(CONVERSATION_KEY_PREFIX, userId)
      localStorage.removeItem(conversationKey)
    }
  }, [userId])

  const loadConversation = useCallback(
    async (targetConversationId: string) => {
      if (!targetConversationId) return
      try {
        const response = await fetch("/api/myca/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: targetConversationId }),
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
    if (!sessionId || messages.length === 0) return
    try {
      await fetch("/api/myca/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId || "anonymous",
          conversation_id: conversationId,
          messages,
        }),
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
    if (messages.length === 0) return
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
          signal: AbortSignal.timeout(8000),
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
