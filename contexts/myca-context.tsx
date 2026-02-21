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

export interface MYCASendOptions {
  contextText?: string
  context?: Record<string, unknown>
  wantAudio?: boolean
  actor?: string
  source?: "web" | "personaplex" | "web-speech" | "api"
}

export interface MYCAContextValue {
  sessionId: string
  userId: string | null
  conversationId: string | null
  setConversationId: (id: string | null) => void
  messages: MYCAMessage[]
  isLoading: boolean
  memoryEnabled: boolean
  setMemoryEnabled: (enabled: boolean) => void
  pendingConfirmationId: string | null
  sendMessage: (text: string, options?: MYCASendOptions) => Promise<void>
  confirmAction: (transcript: string) => Promise<void>
  clearMessages: () => void
  loadConversation: (conversationId: string) => Promise<void>
  restoreFromMAS: () => Promise<void>
  syncToMAS: () => Promise<void>
  consciousness: MYCAConsciousnessState | null
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

export function MYCAProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id || null

  const [sessionId, setSessionId] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MYCAMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null)
  const [consciousness, setConsciousness] = useState<MYCAConsciousnessState | null>(null)
  const hasInitializedRef = useRef(false)

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
      setIsLoading(true)

      const contextText = options?.contextText?.trim()
      const requestMessage = contextText ? `${contextText}\n\n${text}` : text

      try {
        const response = await fetch("/api/mas/voice/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: requestMessage,
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
          throw new Error(errorText || "Failed to reach MYCA orchestrator")
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

        if (assistantMessage.requires_confirmation) {
          setPendingConfirmationId(assistantMessage.confirmation_id || nextConversationId)
        } else {
          setPendingConfirmationId(null)
        }

        if (memoryEnabled) {
          await Promise.all([storeMemory(userMessage), storeMemory(assistantMessage)])
        }
      } catch (error) {
        appendMessage({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: "MYCA is currently unavailable. Please try again in a moment.",
          timestamp: new Date().toISOString(),
          agent: "myca-orchestrator",
        })
        console.error("MYCA sendMessage error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [appendMessage, conversationId, memoryEnabled, sessionId, storeMemory, userId]
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
    let mounted = true
    const fetchConsciousness = async () => {
      try {
        const response = await fetch("/api/myca/consciousness/status", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        })
        if (!response.ok) return
        const data = await response.json()
        if (mounted) setConsciousness(data)
      } catch (error) {
        if (mounted) setConsciousness(null)
      }
    }
    fetchConsciousness()
    const interval = setInterval(fetchConsciousness, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

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
      consciousness,
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
      consciousness,
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
