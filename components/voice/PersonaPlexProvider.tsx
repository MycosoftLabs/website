"use client"

import { FC, ReactNode, createContext, useContext, useCallback, useState } from "react"
import { PersonaPlexWidget } from "./PersonaPlexWidget"
import { usePersonaPlex } from "@/hooks/usePersonaPlex"
import { MYCA_PERSONAPLEX_PROMPT } from "@/lib/voice/personaplex-client"

/**
 * PersonaPlex Provider - Site-wide voice control
 * Created: February 3, 2026
 * 
 * Provides MYCA voice assistant across all pages with:
 * - Floating widget that persists during navigation
 * - Voice commands for site control
 * - MAS orchestrator integration
 * - Memory persistence
 * - n8n workflow execution
 */

interface PersonaPlexContextValue {
  // Connection
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  
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

export function usePersonaPlexContext() {
  const ctx = useContext(PersonaPlexContext)
  if (!ctx) {
    throw new Error("usePersonaPlexContext must be used within PersonaPlexProvider")
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
  
  const personaplex = usePersonaPlex({
    serverUrl: "ws://localhost:8998/api/chat",
    voicePrompt: "NATURAL_F2.pt",
    textPrompt: MYCA_PERSONAPLEX_PROMPT,
    enableMasRouting: true,
    enableMemory: true,
    enableN8n: true,
    
    onTranscript: (text) => {
      console.log("[PersonaPlex] Transcript:", text)
      processVoiceCommand(text)
    },
    
    onResponse: (response) => {
      console.log("[PersonaPlex] Response:", response)
    },
    
    onCommand: (cmd, result) => {
      console.log("[PersonaPlex] Command:", cmd, result)
      setLastCommand(cmd)
      setLastResult(result)
    },
    
    onError: (error) => {
      console.error("[PersonaPlex] Error:", error)
    },
  })
  
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
    connect: personaplex.connect,
    disconnect: personaplex.disconnect,
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
        serverUrl="ws://localhost:8998/api/chat"
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
