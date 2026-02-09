"use client"

import { FC, ReactNode, createContext, useContext, useCallback, useState, useEffect } from "react"
import { PersonaPlexWidget } from "./PersonaPlexWidget"
import { usePersonaPlex } from "@/hooks/usePersonaPlex"
import { MYCA_PERSONAPLEX_PROMPT } from "@/lib/voice/personaplex-client"

/**
 * PersonaPlex Provider - Site-wide voice control
 * Created: February 3, 2026
 * Updated: February 5, 2026 - Added voice listening state for search integration
 * 
 * Provides MYCA voice assistant across all pages with:
 * - Floating widget that persists during navigation
 * - Voice commands for site control
 * - Voice search integration with listening state
 * - MAS orchestrator integration
 * - Memory persistence
 * - n8n workflow execution
 */

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
  const [lastCommand, setLastCommand] = useState("")
  const [lastResult, setLastResult] = useState<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [lastTranscript, setLastTranscript] = useState("")
  
  const personaplex = usePersonaPlex({
    // Use PersonaPlex Bridge (8999) instead of direct Moshi (8998)
    // Bridge provides MAS Event Engine integration with tool calls, agents, memory
    serverUrl: "ws://localhost:8999/api/chat",
    voicePrompt: "NATURAL_F2.pt",
    textPrompt: MYCA_PERSONAPLEX_PROMPT,
    
    onTranscript: (text) => {
      console.log("[PersonaPlex] Transcript:", text)
      setLastTranscript(text)
      processVoiceCommand(text)
    },
    
    onResponse: (response) => {
      console.log("[PersonaPlex] Response:", response)
    },
    
    onError: (error) => {
      // Only log a warning for connection errors (expected when PersonaPlex isn't running)
      if (error.includes("WebSocket") || error.includes("connection")) {
        console.warn("[PersonaPlex] Voice server not available (run PersonaPlex to enable voice)")
      } else {
        console.error("[PersonaPlex] Error:", error)
      }
    },
  })
  
  // Voice listening controls
  const startListening = useCallback(async () => {
    if (!personaplex.isConnected) {
      try {
        await personaplex.connect()
      } catch (error) {
        console.error("[PersonaPlex] Failed to connect:", error)
        return
      }
    }
    setIsListening(true)
    console.log("[PersonaPlex] Started listening")
  }, [personaplex])
  
  const stopListening = useCallback(() => {
    setIsListening(false)
    console.log("[PersonaPlex] Stopped listening")
  }, [])
  
  // Process voice commands for site control
  const processVoiceCommand = useCallback((text: string) => {
    const lower = text.toLowerCase()
    
    // Navigation commands
    if (lower.includes("go to") || lower.includes("navigate to") || lower.includes("open")) {
      const routes: Record<string, string> = {
        "dashboard": "/dashboard",
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
          navigateTo(path)
          return
        }
      }
    }
    
    // Theme commands
    if (lower.includes("dark mode") || lower.includes("dark theme")) {
      document.documentElement.classList.add("dark")
      return
    }
    if (lower.includes("light mode") || lower.includes("light theme")) {
      document.documentElement.classList.remove("dark")
      return
    }
    
    // Search command
    if (lower.includes("search for") || lower.includes("find")) {
      const searchMatch = lower.match(/(?:search for|find)\s+(.+)/i)
      if (searchMatch) {
        const query = searchMatch[1]
        window.location.href = `/search?q=${encodeURIComponent(query)}`
        return
      }
    }
    
    // Workflow commands
    if (lower.includes("run workflow") || lower.includes("execute workflow")) {
      const workflowMatch = lower.match(/(?:run|execute)\s+workflow\s+(.+)/i)
      if (workflowMatch) {
        const workflowName = workflowMatch[1].replace(/\s+/g, "_")
        runWorkflow(workflowName)
        return
      }
    }
    
    // Agent commands
    if (lower.includes("list agents") || lower.includes("show agents")) {
      navigateTo("/agents")
      return
    }
    
    // Status commands
    if (lower.includes("system status") || lower.includes("health check")) {
      runWorkflow("system_status")
      return
    }
  }, [])
  
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
      const result = await personaplex.sendToMAS(command)
      setLastResult(result)
      return result
    } catch (error) {
      setLastResult({ error: String(error) })
      throw error
    }
  }, [personaplex])
  
  const runWorkflow = useCallback(async (name: string, data?: any) => {
    try {
      const result = await personaplex.executeN8nWorkflow(name, data)
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
        serverUrl="ws://localhost:8999/api/chat"
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
