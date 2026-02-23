"use client"

/**
 * useMobileSearchChat Hook - Feb 2026
 * 
 * State management and memory integration for mobile search chat.
 * Handles message sending, data enrichment, and session tracking.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { useMYCA } from "@/contexts/myca-context"
import { useSearchMemory } from "./use-search-memory"
import { useAuth } from "@/contexts/auth-context"

export interface DataCard {
  type: "species" | "chemistry" | "genetics" | "location" | "taxonomy" | "images" | "research" | "news"
  data: Record<string, unknown>
}

export interface MobileSearchMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  dataCards?: DataCard[]
  suggestions?: string[]
  isStreaming?: boolean
  error?: boolean
}

export interface UseMobileSearchChatOptions {
  initialQuery?: string
  autoStart?: boolean
}

export function useMobileSearchChat(options: UseMobileSearchChatOptions = {}) {
  const { initialQuery, autoStart = true } = options
  
  const { user } = useAuth()
  const userId = user?.id || "anonymous"
  
  // MYCA context for AI responses
  const myca = useMYCA()
  
  // Search memory for session tracking
  const searchMemory = useSearchMemory({ userId, autoStart })
  
  // Local chat state
  const [messages, setMessages] = useState<MobileSearchMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messageIdCounter = useRef(0)
  const hasProcessedInitialQuery = useRef(false)

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1
    return `msg-${Date.now()}-${messageIdCounter.current}`
  }, [])

  // Add a message to the chat
  const addMessage = useCallback((
    role: MobileSearchMessage["role"],
    content: string,
    extras?: Partial<MobileSearchMessage>
  ) => {
    const message: MobileSearchMessage = {
      id: generateMessageId(),
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extras,
    }
    setMessages(prev => [...prev, message])
    return message.id
  }, [generateMessageId])

  // Update an existing message
  const updateMessage = useCallback((id: string, updates: Partial<MobileSearchMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }, [])

  // Send a message and get AI response with data enrichment
  const sendMessage = useCallback(async (
    text: string,
    source: "text" | "voice" = "text"
  ) => {
    if (!text.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    // Add user message
    const userMessageId = addMessage("user", text)

    // Record query in search memory
    searchMemory.recordQuery(text, 0, undefined, source)

    try {
      // Call the enriched search chat API
      const response = await fetch("/api/search/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: myca.conversationId,
          session_id: myca.sessionId,
          user_id: userId,
          context: {
            search_session_id: searchMemory.sessionId,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      // Add assistant message with data cards
      addMessage("assistant", data.response_text || "I couldn't process that request.", {
        dataCards: data.data_cards,
        suggestions: data.suggestions,
      })

      // Record AI turn in search memory
      searchMemory.recordAITurn("user", text)
      searchMemory.recordAITurn("assistant", data.response_text || "")

      // Track widget interactions for data cards
      if (data.data_cards?.length) {
        for (const card of data.data_cards) {
          searchMemory.recordWidgetInteraction(card.type, card.data?.id as string)
        }
      }

    } catch (err) {
      console.error("Send message error:", err)
      setError("Failed to send message. Please try again.")
      
      // Add error message
      addMessage("assistant", "I'm having trouble connecting right now. Please try again in a moment.", {
        error: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, addMessage, searchMemory, myca.conversationId, myca.sessionId, userId])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    myca.clearMessages()
  }, [myca])

  // Save item to notepad (uses search context)
  const saveToNotepad = useCallback((message: MobileSearchMessage, card?: DataCard) => {
    // This will be handled by the component using SearchContextProvider
    // We just return the data that should be saved
    if (card) {
      return {
        type: card.type,
        title: (card.data.name || card.data.title || card.type) as string,
        content: JSON.stringify(card.data, null, 2).slice(0, 300),
        source: "MYCA Chat",
      }
    }
    return {
      type: "ai" as const,
      title: message.content.slice(0, 50) + "...",
      content: message.content,
      source: "MYCA Chat",
    }
  }, [])

  // Handle initial query
  useEffect(() => {
    if (initialQuery && !hasProcessedInitialQuery.current && autoStart) {
      hasProcessedInitialQuery.current = true
      sendMessage(initialQuery)
    }
  }, [initialQuery, autoStart, sendMessage])

  // Sync with MYCA messages (for persistence)
  useEffect(() => {
    // If MYCA has messages and we don't, sync them
    if (myca.messages.length > 0 && messages.length === 0) {
      const converted = myca.messages
        .filter(m => m.role !== "system")
        .map(m => ({
          id: m.id,
          role: m.role as MobileSearchMessage["role"],
          content: m.content,
          timestamp: m.timestamp,
          dataCards: m.nlqData?.map(nlq => ({
            type: mapNlqType(nlq.type),
            data: { id: nlq.id, name: nlq.title, subtitle: nlq.subtitle },
          })).filter((c): c is DataCard => c.type !== null),
        }))
      setMessages(converted)
    }
  }, [myca.messages, messages.length])

  return {
    // State
    messages,
    isLoading,
    error,
    sessionId: searchMemory.sessionId,
    conversationId: myca.conversationId,
    
    // Consciousness
    consciousness: myca.consciousness,
    memoryEnabled: myca.memoryEnabled,
    setMemoryEnabled: myca.setMemoryEnabled,
    
    // Actions
    sendMessage,
    clearMessages,
    addMessage,
    updateMessage,
    saveToNotepad,
    
    // Search memory
    recordFocus: searchMemory.recordFocus,
    recordClick: searchMemory.recordClick,
    recordWidgetInteraction: searchMemory.recordWidgetInteraction,
    getSearchHistory: searchMemory.getHistory,
  }
}

function mapNlqType(nlqType: string): DataCard["type"] | null {
  const mapping: Record<string, DataCard["type"]> = {
    species: "species",
    compound: "chemistry",
    genetics: "genetics",
    location: "location",
    research: "research",
    news: "news",
    paper: "research",
  }
  return mapping[nlqType.toLowerCase()] || null
}

export default useMobileSearchChat
