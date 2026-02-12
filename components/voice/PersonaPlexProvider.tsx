"use client"

import { FC, ReactNode, createContext, useContext, useCallback, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { PersonaPlexWidget } from "./PersonaPlexWidget"
import { usePersonaPlex } from "@/hooks/usePersonaPlex"
import { MYCA_PERSONAPLEX_PROMPT } from "@/lib/voice/personaplex-client"

/**
 * PersonaPlex Provider - Site-wide voice control
 * Created: February 3, 2026
 * Updated: February 5, 2026 - Added voice listening state for search integration
 * Updated: February 11, 2026 - Added Web Speech API fallback + enhanced search integration
 * 
 * Provides MYCA voice assistant across all pages with:
 * - Floating widget that persists during navigation
 * - Voice commands for site control
 * - Intelligent voice search with intent detection
 * - MAS orchestrator integration
 * - Memory persistence
 * - n8n workflow execution
 * - Web Speech API fallback for STT when PersonaPlex unavailable
 */

// =============================================================================
// WEB SPEECH API FALLBACK
// =============================================================================

interface WebSpeechFallback {
  isSupported: boolean
  isListening: boolean
  start: () => void
  stop: () => void
  speak: (text: string) => void
}

function useWebSpeechFallback(
  onTranscript: (text: string) => void,
  onError: (error: string) => void
): WebSpeechFallback {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  
  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  
  useEffect(() => {
    if (!isSupported) return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("")
      
      // Only process final results
      if (event.results[event.results.length - 1].isFinal) {
        onTranscript(transcript)
      }
    }
    
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        onError(`Speech recognition error: ${event.error}`)
      }
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognitionRef.current = recognition
    
    return () => {
      recognition.abort()
    }
  }, [isSupported, onTranscript, onError])
  
  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        console.error("[WebSpeech] Start error:", e)
      }
    }
  }, [isListening])
  
  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])
  
  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 1.0
      utterance.pitch = 1.0
      
      // Try to use a female voice for MYCA
      const voices = window.speechSynthesis.getVoices()
      const femaleVoice = voices.find((v) => 
        v.name.includes("Female") || 
        v.name.includes("Samantha") || 
        v.name.includes("Victoria") ||
        v.name.includes("Karen")
      )
      if (femaleVoice) {
        utterance.voice = femaleVoice
      }
      
      window.speechSynthesis.speak(utterance)
    }
  }, [])
  
  return { isSupported, isListening, start, stop, speak }
}

interface PersonaPlexContextValue {
  // Connection
  isConnected: boolean
  connectionState: "disconnected" | "connecting" | "connected" | "error"
  connect: () => Promise<void>
  disconnect: () => void
  
  // Voice listening state - for search integration
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  lastTranscript: string
  
  // Voice commands
  executeCommand: (command: string) => Promise<any>
  
  // n8n workflows
  runWorkflow: (name: string, data?: any) => Promise<any>
  
  // Navigation
  navigateTo: (path: string) => void
  
  // Site control
  toggleTheme: () => void
  openSearch: () => void
  
  // State
  lastCommand: string
  lastResult: any
}

const PersonaPlexContext = createContext<PersonaPlexContextValue | null>(null)

/**
 * Hook to access PersonaPlex context
 * Returns null if used outside of PersonaPlexProvider (graceful fallback)
 */
export function usePersonaPlexContext(): PersonaPlexContextValue | null {
  return useContext(PersonaPlexContext)
}

/**
 * Hook that requires PersonaPlex context (throws if not available)
 */
export function usePersonaPlexContextRequired(): PersonaPlexContextValue {
  const ctx = useContext(PersonaPlexContext)
  if (!ctx) {
    throw new Error("usePersonaPlexContextRequired must be used within PersonaPlexProvider")
  }
  return ctx
}

interface PersonaPlexProviderProps {
  children: ReactNode
  enabled?: boolean
}

export const PersonaPlexProvider: FC<PersonaPlexProviderProps> = ({
  children,
  enabled = true,
}) => {
  const router = useRouter()
  const [lastCommand, setLastCommand] = useState("")
  const [lastResult, setLastResult] = useState<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [lastTranscript, setLastTranscript] = useState("")
  const [usingFallback, setUsingFallback] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  /**
   * Enhanced search intent detection
   */
  const detectSearchIntent = useCallback((text: string): string | null => {
    const lower = text.toLowerCase().trim()
    
    // Explicit search patterns
    const searchPatterns = [
      /search\s+(?:for\s+)?(.+)/i,
      /find\s+(?:me\s+)?(.+)/i,
      /show\s+(?:me\s+)?(.+)/i,
      /look\s+up\s+(.+)/i,
      /what\s+(?:is|are)\s+(.+)/i,
      /tell\s+me\s+about\s+(.+)/i,
    ]
    
    for (const pattern of searchPatterns) {
      const match = lower.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    // Direct search heuristic: short phrase without conversation keywords
    const conversationKeywords = /\b(hello|hi|hey|thanks|please|can you|could you|would you|tell me|explain|help|stop|start)\b/i
    if (!conversationKeywords.test(lower) && lower.length >= 2 && lower.length < 50) {
      return lower
    }
    
    return null
  }, [])
  
  // Process voice command (defined early for use in callbacks)
  const processVoiceCommand = useCallback((text: string) => {
    const lower = text.toLowerCase()
    
    // PRIORITY 1: Check for search intent first
    const searchQuery = detectSearchIntent(text)
    if (searchQuery) {
      console.log("[Voice] Search intent detected:", searchQuery)
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      return
    }
    
    // PRIORITY 2: Navigation commands
    if (lower.includes("go to") || lower.includes("navigate to") || lower.includes("open")) {
      const routes: Record<string, string> = {
        "home": "/",
        "ai studio": "/ai-studio",
        "earth simulator": "/earth-simulator",
        "nature os": "/natureos",
        "natureos": "/natureos",
        "devices": "/devices",
        "security": "/security",
        "research": "/research",
        "myco dao": "/myco-dao",
        "dao": "/myco-dao",
        "settings": "/settings",
        "profile": "/profile",
        "agents": "/agents",
        "workflows": "/workflows",
        "terminal": "/terminal",
      }
      
      for (const [key, path] of Object.entries(routes)) {
        if (lower.includes(key)) {
          if (typeof window !== "undefined") {
            window.location.href = path
          }
          return
        }
      }
    }
    
    // PRIORITY 3: Theme commands
    if (lower.includes("dark mode") || lower.includes("dark theme")) {
      document.documentElement.classList.add("dark")
      return
    }
    if (lower.includes("light mode") || lower.includes("light theme")) {
      document.documentElement.classList.remove("dark")
      return
    }
    
    // If no command matched, this might be a conversation with MYCA
    // Let it pass through to PersonaPlex/MAS
    console.log("[Voice] No specific command detected, treating as MYCA conversation")
  }, [router, detectSearchIntent])
  
  // Web Speech API fallback for when PersonaPlex is unavailable
  const webSpeech = useWebSpeechFallback(
    (text) => {
      console.log("[WebSpeech Fallback] Transcript:", text)
      setLastTranscript(text)
      processVoiceCommand(text)
    },
    (error) => {
      console.warn("[WebSpeech Fallback] Error:", error)
    }
  )

  const playOrSpeakResponse = useCallback(
    async (responseText: string, audioBase64?: string, audioMime?: string) => {
      // Prefer orchestrator-provided audio if available
      if (audioBase64 && audioMime) {
        try {
          if (!audioRef.current) audioRef.current = new Audio()
          audioRef.current.src = `data:${audioMime};base64,${audioBase64}`
          await audioRef.current.play()
          return
        } catch (e) {
          console.warn("[Voice] Audio playback failed, falling back to Web Speech:", e)
        }
      }

      if (responseText?.trim() && webSpeech.isSupported) {
        webSpeech.speak(responseText)
      }
    },
    [webSpeech]
  )
  
  const personaplex = usePersonaPlex({
    // Use PersonaPlex Bridge (8999) instead of direct Moshi (8998)
    // Bridge provides MAS Event Engine integration with tool calls, agents, memory
    // Use env var for flexible deployment (localhost, VM, or cloud GPU)
    serverUrl: process.env.NEXT_PUBLIC_PERSONAPLEX_WS_URL || "ws://localhost:8999/api/chat",
    voicePrompt: "NATURAL_F2.pt",
    textPrompt: MYCA_PERSONAPLEX_PROMPT,
    
    onTranscript: (text) => {
      console.log("[PersonaPlex] Transcript:", text)
      setLastTranscript(text)
      processVoiceCommand(text)
    },
    
    onResponse: (response) => {
      console.log("[PersonaPlex] Response:", response)
      playOrSpeakResponse(response.response_text || "", response.audio_base64, response.audio_mime)
    },
    
    onError: (error) => {
      // Only log a warning for connection errors (expected when PersonaPlex isn't running)
      if (error.includes("WebSocket") || error.includes("connection")) {
        console.warn("[PersonaPlex] Voice server not available - falling back to Web Speech API")
        setUsingFallback(true)
      } else {
        console.error("[PersonaPlex] Error:", error)
      }
    },
  })
  
  // Voice listening controls with automatic fallback
  const startListening = useCallback(async () => {
    // Try PersonaPlex first
    if (!usingFallback && !personaplex.isConnected) {
      try {
        await personaplex.connect()
        setIsListening(true)
        console.log("[PersonaPlex] Started listening")
        return
      } catch (error) {
        console.warn("[PersonaPlex] Connection failed, trying Web Speech fallback")
        setUsingFallback(true)
      }
    }
    
    if (personaplex.isConnected) {
      setIsListening(true)
      console.log("[PersonaPlex] Started listening")
      return
    }
    
    // Fallback to Web Speech API
    if (webSpeech.isSupported) {
      webSpeech.start()
      setIsListening(true)
      console.log("[WebSpeech Fallback] Started listening")
    } else {
      console.error("[Voice] No voice input available - PersonaPlex offline and Web Speech not supported")
    }
  }, [personaplex, webSpeech, usingFallback])
  
  const stopListening = useCallback(() => {
    if (usingFallback && webSpeech.isSupported) {
      webSpeech.stop()
    }
    setIsListening(false)
    console.log("[Voice] Stopped listening")
  }, [webSpeech, usingFallback])
  
  const navigateTo = useCallback((path: string) => {
    if (typeof window !== "undefined") {
      window.location.href = path
    }
  }, [])
  
  const toggleTheme = useCallback(() => {
    document.documentElement.classList.toggle("dark")
  }, [])
  
  const openSearch = useCallback(() => {
    // Trigger search modal or navigate to search
    const searchEvent = new CustomEvent("open-search")
    window.dispatchEvent(searchEvent)
  }, [])
  
  const executeCommand = useCallback(async (command: string) => {
    setLastCommand(command)
    try {
      const result = await personaplex.sendToOrchestrator(command)
      setLastResult(result)
      return result
    } catch (error) {
      setLastResult({ error: String(error) })
      throw error
    }
  }, [personaplex])
  
  const runWorkflow = useCallback(async (name: string, data?: any) => {
    try {
      // Resolve by name, then execute via MYCA-supervised n8n route
      const wfRes = await fetch("/api/myca/workflows", {
        signal: AbortSignal.timeout(8000),
      })
      const wfData = await wfRes.json().catch(() => ({}))
      const workflows: Array<{ id: string; name: string; source: "local" | "cloud" }> =
        wfData.workflows || []

      const match = workflows.find(
        (w) => w.name?.toLowerCase().trim() === name.toLowerCase().trim()
      )

      if (!match) {
        const result = { success: false, error: `Workflow not found: ${name}` }
        setLastResult(result)
        return result
      }

      const execRes = await fetch("/api/myca/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          workflowId: match.id,
          changes: { data: data || {} },
          source: match.source,
        }),
        signal: AbortSignal.timeout(20000),
      })

      const result = await execRes.json().catch(() => ({}))
      setLastResult(result)
      return result
    } catch (error) {
      setLastResult({ error: String(error) })
      throw error
    }
  }, [personaplex])
  
  const contextValue: PersonaPlexContextValue = {
    isConnected: personaplex.isConnected,
    connectionState: personaplex.status === "connected" ? "connected" : 
                     personaplex.status === "connecting" ? "connecting" :
                     personaplex.status === "error" ? "error" : "disconnected",
    connect: personaplex.connect,
    disconnect: personaplex.disconnect,
    isListening,
    startListening,
    stopListening,
    lastTranscript,
    executeCommand,
    runWorkflow,
    navigateTo,
    toggleTheme,
    openSearch,
    lastCommand,
    lastResult,
  }
  
  if (!enabled) {
    return <>{children}</>
  }
  
  return (
    <PersonaPlexContext.Provider value={contextValue}>
      {children}
      
      {/* Floating PersonaPlex Widget - appears on all pages */}
      <PersonaPlexWidget
        position="bottom-right"
        showMonitor={true}
        serverUrl={process.env.NEXT_PUBLIC_PERSONAPLEX_WS_URL || "ws://localhost:8999/api/chat"}
        voicePrompt="NATURAL_F2.pt"
        textPrompt={MYCA_PERSONAPLEX_PROMPT}
        onTranscript={(text) => {
          console.log("[Widget] Transcript:", text)
          processVoiceCommand(text)
        }}
        onResponse={(response) => {
          console.log("[Widget] Response:", response)
        }}
        onCommand={(cmd, result) => {
          console.log("[Widget] Command executed:", cmd)
          setLastCommand(cmd)
          setLastResult(result)
        }}
      />
    </PersonaPlexContext.Provider>
  )
}

export default PersonaPlexProvider
