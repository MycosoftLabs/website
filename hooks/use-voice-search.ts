/**
 * useVoiceSearch Hook - Feb 2026
 * 
 * Voice command integration for search navigation
 * Features:
 * - PersonaPlex connection
 * - Search-specific voice commands
 * - Navigation via voice
 * - Widget control
 */

"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
import { useRouter } from "next/navigation"

export interface VoiceCommand {
  pattern: RegExp
  action: (match: RegExpMatchArray) => void
  description: string
}

export interface UseVoiceSearchOptions {
  onSearch?: (query: string) => void
  onFocusWidget?: (widgetId: string) => void
  onNavigate?: (url: string) => void
  onAIQuestion?: (question: string) => void
  enabled?: boolean
}

export interface UseVoiceSearchResult {
  isListening: boolean
  isConnected: boolean
  lastTranscript: string
  startListening: () => void
  stopListening: () => void
  processCommand: (transcript: string) => boolean
  availableCommands: Array<{ trigger: string; description: string }>
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}): UseVoiceSearchResult {
  const {
    onSearch,
    onFocusWidget,
    onNavigate,
    onAIQuestion,
    enabled = true,
  } = options

  const router = useRouter()
  const personaplex = usePersonaPlexContext()
  const lastProcessedRef = useRef<string>("")
  const lastTranscriptRef = useRef<string>("")
  const [lastTranscript, setLastTranscript] = useState("")
  
  // Destructure personaplex first so we can use stopListening in refs
  const {
    isListening = false,
    lastTranscript: plexTranscript = "",
    startListening = () => {},
    stopListening = () => {},
    isConnected = false,
  } = personaplex || {}

  // Store callbacks in refs to avoid re-creating commands array
  const onSearchRef = useRef(onSearch)
  const onFocusWidgetRef = useRef(onFocusWidget)
  const onAIQuestionRef = useRef(onAIQuestion)
  const stopListeningRef = useRef(stopListening)
  
  // Update refs when callbacks change
  useEffect(() => { onSearchRef.current = onSearch }, [onSearch])
  useEffect(() => { onFocusWidgetRef.current = onFocusWidget }, [onFocusWidget])
  useEffect(() => { onAIQuestionRef.current = onAIQuestion }, [onAIQuestion])
  useEffect(() => { stopListeningRef.current = stopListening }, [stopListening])

  // Define voice commands using refs to avoid re-creating on every render
  const commands = useMemo<VoiceCommand[]>(() => [
    // Search commands
    {
      pattern: /^(?:search|find|look for|show me)\s+(.+)$/i,
      action: (match) => {
        const query = match[1].trim()
        onSearchRef.current?.(query)
      },
      description: "Search for [query]",
    },
    {
      pattern: /^(?:search for|find me)\s+(.+?)(?:\s+mushrooms?|\s+fungi)?$/i,
      action: (match) => {
        const query = match[1].trim()
        onSearchRef.current?.(query)
      },
      description: "Find mushrooms/fungi by name",
    },

    // Widget focus commands
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?species(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("species")
      },
      description: "Show species widget",
    },
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?(?:chemistry|compounds?)(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("chemistry")
      },
      description: "Show chemistry/compounds widget",
    },
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?(?:genetics|dna|genome)(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("genetics")
      },
      description: "Show genetics widget",
    },
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?(?:research|papers?)(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("research")
      },
      description: "Show research widget",
    },
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?(?:taxonomy|classification)(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("taxonomy")
      },
      description: "Show taxonomy widget",
    },
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?(?:gallery|photos?|images?)(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("gallery")
      },
      description: "Show gallery widget",
    },
    {
      pattern: /^(?:show|focus|open)\s+(?:the\s+)?(?:ai|assistant|myca)(?:\s+widget)?$/i,
      action: () => {
        onFocusWidgetRef.current?.("ai")
      },
      description: "Show AI assistant widget",
    },

    // AI question commands
    {
      pattern: /^(?:ask|tell me|what|how|why|when|where|who)\s+(.+)$/i,
      action: (match) => {
        const question = match[0].trim()
        onAIQuestionRef.current?.(question)
      },
      description: "Ask AI a question",
    },
    {
      pattern: /^(?:explain|describe)\s+(.+)$/i,
      action: (match) => {
        const topic = match[1].trim()
        onAIQuestionRef.current?.(`Explain ${topic}`)
      },
      description: "Explain [topic]",
    },

    // Navigation commands
    {
      pattern: /^(?:go to|navigate to|open)\s+(?:the\s+)?species\s+page$/i,
      action: () => {
        const query = lastTranscriptRef.current.match(/species:\s*(\S+)/)?.[1]
        if (query) {
          router.push(`/species/${query}`)
        }
      },
      description: "Go to species page",
    },
    {
      pattern: /^(?:go to|navigate to|open)\s+(?:the\s+)?home(?:\s+page)?$/i,
      action: () => {
        router.push("/")
      },
      description: "Go to home page",
    },
    {
      pattern: /^(?:go to|navigate to|open)\s+(?:the\s+)?ancestry(?:\s+database)?$/i,
      action: () => {
        router.push("/ancestry/explorer")
      },
      description: "Go to Ancestry database",
    },
    {
      pattern: /^(?:go|navigate)\s+back$/i,
      action: () => {
        router.back()
      },
      description: "Go back",
    },

    // Control commands
    {
      pattern: /^(?:clear|reset)\s+(?:the\s+)?search$/i,
      action: () => {
        onSearchRef.current?.("")
      },
      description: "Clear search",
    },
    {
      pattern: /^(?:stop|cancel)(?:\s+listening)?$/i,
      action: () => {
        stopListeningRef.current()
      },
      description: "Stop listening",
    },
  ], [router])

  // Process voice command
  const processCommand = useCallback((transcript: string): boolean => {
    if (!transcript.trim() || transcript === lastProcessedRef.current) {
      return false
    }

    const normalizedTranscript = transcript.trim().toLowerCase()
    lastTranscriptRef.current = transcript
    setLastTranscript(transcript)

    for (const command of commands) {
      const match = normalizedTranscript.match(command.pattern)
      if (match) {
        console.log("Voice command matched:", command.description, match)
        lastProcessedRef.current = transcript
        command.action(match)
        return true
      }
    }

    // If no command matched but we have handlers, try as search
    if (onSearchRef.current && normalizedTranscript.length > 2) {
      console.log("Voice command fallback to search:", normalizedTranscript)
      lastProcessedRef.current = transcript
      onSearchRef.current(normalizedTranscript)
      return true
    }

    return false
  }, [commands])

  // Process PersonaPlex transcripts
  useEffect(() => {
    if (enabled && plexTranscript && plexTranscript !== lastProcessedRef.current) {
      processCommand(plexTranscript)
    }
  }, [enabled, plexTranscript, processCommand])

  // Available commands for UI display
  const availableCommands = [
    { trigger: "Search for [query]", description: "Find fungi, compounds, or research" },
    { trigger: "Show species", description: "Focus species widget" },
    { trigger: "Show chemistry", description: "Focus compounds widget" },
    { trigger: "Show genetics", description: "Focus genetics widget" },
    { trigger: "Show research", description: "Focus research widget" },
    { trigger: "Ask [question]", description: "Ask AI a question" },
    { trigger: "Go to [page]", description: "Navigate to a page" },
    { trigger: "Go back", description: "Navigate back" },
    { trigger: "Clear search", description: "Reset search" },
    { trigger: "Stop", description: "Stop listening" },
  ]

  return {
    isListening,
    isConnected,
    lastTranscript,
    startListening,
    stopListening,
    processCommand,
    availableCommands,
  }
}

export default useVoiceSearch
