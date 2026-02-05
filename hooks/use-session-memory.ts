/**
 * useSessionMemory Hook - Feb 2026
 * 
 * React hook for managing search session memory with:
 * - Automatic context tracking
 * - Conversation history management
 * - Entity exploration tracking
 */

"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
  searchSessionMemory,
  type SearchEntry,
  type ConversationEntry,
  type EntityContext,
} from "@/lib/search/session-memory"

interface UseSessionMemoryOptions {
  autoTrackSearches?: boolean
  autoTrackConversations?: boolean
}

interface UseSessionMemoryResult {
  // Search history
  recentSearches: SearchEntry[]
  addSearch: (
    query: string,
    results: { speciesCount: number; compoundCount: number; researchCount: number }
  ) => string
  trackSelection: (searchId: string, itemId: string) => void
  getSearchSuggestions: (query: string) => string[]

  // Conversation
  conversationHistory: ConversationEntry[]
  addMessage: (role: "user" | "assistant", content: string, context?: string) => string
  getConversationContext: () => Array<{ role: string; content: string }>

  // Entity context
  activeEntities: EntityContext[]
  addEntity: (id: string, type: EntityContext["type"], name: string) => void

  // Context
  contextSummary: string

  // Session info
  sessionInfo: {
    id: string
    duration: number
    searchCount: number
    conversationCount: number
    entityCount: number
  }

  // Actions
  clearSession: () => void
  exportSession: () => string
  importSession: (data: string) => boolean
}

export function useSessionMemory(
  options: UseSessionMemoryOptions = {}
): UseSessionMemoryResult {
  const { autoTrackSearches = true, autoTrackConversations = true } = options

  // State to trigger re-renders
  const [updateCounter, setUpdateCounter] = useState(0)

  // Force update helper
  const forceUpdate = useCallback(() => {
    setUpdateCounter((c) => c + 1)
  }, [])

  // ===== Search History =====

  const recentSearches = useMemo(() => {
    return searchSessionMemory.getRecentSearches(10)
  }, [updateCounter])

  const addSearch = useCallback(
    (
      query: string,
      results: { speciesCount: number; compoundCount: number; researchCount: number }
    ): string => {
      if (!autoTrackSearches) return ""
      const id = searchSessionMemory.addSearch(query, results)
      forceUpdate()
      return id
    },
    [autoTrackSearches, forceUpdate]
  )

  const trackSelection = useCallback(
    (searchId: string, itemId: string) => {
      searchSessionMemory.trackSelection(searchId, itemId)
      forceUpdate()
    },
    [forceUpdate]
  )

  const getSearchSuggestions = useCallback((query: string): string[] => {
    return searchSessionMemory.getSearchSuggestions(query)
  }, [])

  // ===== Conversation =====

  const conversationHistory = useMemo(() => {
    return searchSessionMemory.getConversationHistory(20)
  }, [updateCounter])

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string, context?: string): string => {
      if (!autoTrackConversations) return ""
      const id = searchSessionMemory.addConversation(role, content, context)
      forceUpdate()
      return id
    },
    [autoTrackConversations, forceUpdate]
  )

  const getConversationContext = useCallback(() => {
    return searchSessionMemory.getConversationContext()
  }, [])

  // ===== Entity Context =====

  const activeEntities = useMemo(() => {
    return searchSessionMemory.getActiveEntities()
  }, [updateCounter])

  const addEntity = useCallback(
    (id: string, type: EntityContext["type"], name: string) => {
      searchSessionMemory.addEntity(id, type, name)
      forceUpdate()
    },
    [forceUpdate]
  )

  // ===== Context Summary =====

  const contextSummary = useMemo(() => {
    return searchSessionMemory.buildContextSummary()
  }, [updateCounter])

  // ===== Session Info =====

  const sessionInfo = useMemo(() => {
    return searchSessionMemory.getSessionInfo()
  }, [updateCounter])

  // ===== Actions =====

  const clearSession = useCallback(() => {
    searchSessionMemory.clearSession()
    forceUpdate()
  }, [forceUpdate])

  const exportSession = useCallback(() => {
    return searchSessionMemory.exportSession()
  }, [])

  const importSession = useCallback(
    (data: string): boolean => {
      const success = searchSessionMemory.importSession(data)
      if (success) forceUpdate()
      return success
    },
    [forceUpdate]
  )

  return {
    recentSearches,
    addSearch,
    trackSelection,
    getSearchSuggestions,
    conversationHistory,
    addMessage,
    getConversationContext,
    activeEntities,
    addEntity,
    contextSummary,
    sessionInfo,
    clearSession,
    exportSession,
    importSession,
  }
}

/**
 * Hook for tracking entity exploration with automatic context
 */
export function useEntityTracking() {
  const { addEntity, activeEntities } = useSessionMemory()

  const trackSpecies = useCallback(
    (id: string, name: string) => {
      addEntity(id, "species", name)
    },
    [addEntity]
  )

  const trackCompound = useCallback(
    (id: string, name: string) => {
      addEntity(id, "compound", name)
    },
    [addEntity]
  )

  const trackResearch = useCallback(
    (id: string, title: string) => {
      addEntity(id, "research", title)
    },
    [addEntity]
  )

  const trackTaxonomy = useCallback(
    (id: string, name: string) => {
      addEntity(id, "taxonomy", name)
    },
    [addEntity]
  )

  return {
    activeEntities,
    trackSpecies,
    trackCompound,
    trackResearch,
    trackTaxonomy,
  }
}

/**
 * Hook for AI conversation with session context
 */
export function useConversationMemory() {
  const {
    conversationHistory,
    addMessage,
    getConversationContext,
    contextSummary,
  } = useSessionMemory()

  const addUserMessage = useCallback(
    (content: string) => {
      return addMessage("user", content)
    },
    [addMessage]
  )

  const addAssistantMessage = useCallback(
    (content: string, context?: string) => {
      return addMessage("assistant", content, context)
    },
    [addMessage]
  )

  return {
    conversationHistory,
    addUserMessage,
    addAssistantMessage,
    getConversationContext,
    contextSummary,
  }
}

export default useSessionMemory
